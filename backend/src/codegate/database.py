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
import logging
from contextlib import contextmanager
from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session

from .config import settings

logger = logging.getLogger(__name__)

# 创建数据库引擎
# SQLite 使用 WAL 模式支持并发读写
database_url = settings.DATABASE_URL

if database_url.startswith("sqlite"):
    # SQLite 配置
    # 确保数据库目录存在
    db_path = Path(database_url.replace("sqlite:///", ""))
    if db_path != Path(":memory:"):
        db_path.parent.mkdir(parents=True, exist_ok=True)

    # 使用默认连接池 + WAL 模式，依赖 SQLite 自身的文件锁来处理并发
    # 避免使用 StaticPool + 进程级 FileLock 导致请求串行化和超时
    engine = create_engine(
        database_url,
        connect_args={
            "check_same_thread": False,
            "timeout": 30,
        },
        echo=settings.DATABASE_ECHO,
        pool_pre_ping=True,
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
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """
    获取数据库会话上下文管理器

    Yields:
        Session: 数据库会话
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def init_db():
    """初始化数据库（创建所有表）"""
    # 导入所有模型以确保表被注册
    from .models import Project, InvitationCode, VerificationLog, Admin
    from .services.auth import AuthService
    from .services.auth.auth_repository import AuthRepository
    from sqlalchemy import select

    Base.metadata.create_all(bind=engine)

    # 创建默认管理员账户（如果不存在）
    with get_db_context() as db:
        # 检查是否已存在管理员
        stmt = select(Admin).where(Admin.username == "admin")
        existing_admin = db.execute(stmt).scalar_one_or_none()

        if not existing_admin:
            # 创建默认管理员账户
            # 用户名：admin，密码：123456
            default_password_hash = AuthService.hash_password("123456")
            default_admin = Admin(
                username="admin",
                password_hash=default_password_hash,
                is_initial_password=True,  # 标记为初始密码
            )
            AuthRepository.create(db, default_admin)
            logger.info("已创建默认管理员账户：admin / 123456")


def drop_db():
    """删除所有表（谨慎使用）"""
    Base.metadata.drop_all(bind=engine)
