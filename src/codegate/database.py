"""
数据库连接和会话管理

Copyright 2026 pfeak

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""
from sqlalchemy.orm import DeclarativeBase
import os
from contextlib import contextmanager
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool
from filelock import FileLock

from .config import settings

# 创建数据库引擎
# SQLite 使用 WAL 模式支持并发读写
database_url = settings.DATABASE_URL

if database_url.startswith("sqlite"):
    # SQLite 配置
    # 确保数据库目录存在
    db_path = Path(database_url.replace("sqlite:///", ""))
    if db_path != Path(":memory:"):
        db_path.parent.mkdir(parents=True, exist_ok=True)

    # 使用 StaticPool 和 WAL 模式
    engine = create_engine(
        database_url,
        connect_args={
            "check_same_thread": False,
            "timeout": 30,
        },
        poolclass=StaticPool,
        echo=settings.DATABASE_ECHO,
    )

    # 启用 WAL 模式
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()
else:
    engine = create_engine(
        database_url,
        echo=settings.DATABASE_ECHO,
        pool_pre_ping=True,
    )

# 创建会话工厂
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 数据库锁（用于 SQLite 并发控制）
_db_lock_path = None
if database_url.startswith("sqlite") and not database_url.endswith(":memory:"):
    db_path = Path(database_url.replace("sqlite:///", ""))
    _db_lock_path = db_path.parent / f"{db_path.stem}.lock"

_db_lock = None
if _db_lock_path:
    _db_lock = FileLock(_db_lock_path, timeout=30)


# 数据库基类


class Base(DeclarativeBase):
    """数据库模型基类"""
    pass


def get_db() -> Session:
    """
    获取数据库会话（依赖注入）

    Yields:
        Session: 数据库会话
    """
    if _db_lock:
        _db_lock.acquire()

    try:
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()
    finally:
        if _db_lock:
            _db_lock.release()


@contextmanager
def get_db_context():
    """
    获取数据库会话上下文管理器

    Yields:
        Session: 数据库会话
    """
    if _db_lock:
        _db_lock.acquire()

    try:
        db = SessionLocal()
        try:
            yield db
            db.commit()
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()
    finally:
        if _db_lock:
            _db_lock.release()


def init_db():
    """初始化数据库（创建所有表）"""
    # 导入所有模型以确保表被注册
    from .models import Project, InvitationCode, VerificationLog

    Base.metadata.create_all(bind=engine)


def drop_db():
    """删除所有表（谨慎使用）"""
    Base.metadata.drop_all(bind=engine)
