"""
管理员模型

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
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Boolean, Index, event

from ..database import Base
from ..utils.uuid_utils import generate_uuid


class Admin(Base):
    """管理员模型"""
    __tablename__ = "admins"

    id = Column(String(32), primary_key=True, index=True, comment="管理员ID（UUID，去除连字符）")
    username = Column(String(100), nullable=False, unique=True, index=True, comment="用户名")
    password_hash = Column(String(255), nullable=False, comment="密码哈希")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
    last_login_at = Column(DateTime, nullable=True, comment="最后登录时间")
    is_initial_password = Column(Boolean, default=True, nullable=False, comment="是否使用初始密码（默认True）")

    # 索引
    __table_args__ = (
        Index("idx_admin_username", "username"),
    )

    def __repr__(self) -> str:
        return f"<Admin(id={self.id}, username='{self.username}')>"


@event.listens_for(Admin, "before_insert")
def generate_admin_id(mapper, connection, target):
    """在插入前生成管理员ID"""
    if not target.id:
        target.id = generate_uuid()
