"""
API 密钥模型

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
from sqlalchemy import Column, String, DateTime, Boolean, ForeignKey, Index, event
from sqlalchemy.orm import relationship
import secrets

from ..database import Base
from ..utils.uuid_utils import generate_uuid


class ApiKey(Base):
    """API 密钥模型"""
    __tablename__ = "api_keys"

    id = Column(String(32), primary_key=True, index=True, comment="API Key ID（UUID，去除连字符）")
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="项目ID")
    api_key = Column(String(32), unique=True, nullable=False, index=True, comment="API Key（32位UUID，去除连字符）")
    secret = Column(String(64), nullable=False, comment="Secret（64位十六进制字符串，明文存储）")
    name = Column(String(100), nullable=True, comment="API Key 名称（可选）")
    is_active = Column(Boolean, default=True, nullable=False, index=True, comment="是否启用")
    last_used_at = Column(DateTime, nullable=True, index=True, comment="最后使用时间")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
    created_by = Column(String(32), ForeignKey("admins.id", ondelete="SET NULL"), nullable=False, comment="创建者ID")

    # 关系
    project = relationship("Project", backref="api_keys")
    creator = relationship("Admin", foreign_keys=[created_by])

    # 索引
    __table_args__ = (
        Index("idx_api_key_project_active", "project_id", "is_active"),
        Index("idx_api_key_last_used", "last_used_at"),
    )

    def __repr__(self) -> str:
        return f"<ApiKey(id={self.id}, api_key='{self.api_key[:8]}...', project_id={self.project_id}, is_active={self.is_active})>"

    @staticmethod
    def generate_api_key() -> str:
        """生成 32 位 UUID（去除连字符）"""
        return generate_uuid()

    @staticmethod
    def generate_secret() -> str:
        """生成 64 位十六进制字符串"""
        return secrets.token_hex(32)  # 32 bytes = 64 hex characters


@event.listens_for(ApiKey, "before_insert")
def generate_api_key_id(mapper, connection, target):
    """在插入前生成 API Key ID"""
    if not target.id:
        target.id = generate_uuid()
