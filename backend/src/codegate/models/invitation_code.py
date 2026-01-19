"""
激活码模型

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
from typing import Optional
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Index,
    String,
    event,
)
from sqlalchemy.orm import relationship

from ..database import Base
from ..utils.uuid_utils import generate_uuid


class InvitationCode(Base):
    """激活码模型"""
    __tablename__ = "invitation_codes"

    id = Column(String(32), primary_key=True, index=True, comment="激活码ID（UUID，去除连字符）")
    project_id = Column(String(32), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="项目ID（UUID，去除连字符）")
    code = Column(String(100), nullable=False, unique=True, index=True, comment="激活码")
    status = Column(Boolean, default=False, nullable=False, comment="核销状态（False=未核销, True=已核销）")
    is_disabled = Column(Boolean, default=False, nullable=False, index=True, comment="是否禁用（False=启用, True=禁用）")
    is_expired = Column(Boolean, default=False, nullable=False, index=True, comment="是否过期（False=未过期, True=已过期，数据库字段，非计算属性）")
    expires_at = Column(DateTime, nullable=True, index=True, comment="过期时间（可选，为空则使用项目有效期）")
    verified_at = Column(DateTime, nullable=True, comment="核销时间")
    verified_by = Column(String(100), nullable=True, comment="核销用户")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")

    # 关系
    project = relationship("Project", back_populates="invitation_codes")
    verification_logs = relationship(
        "VerificationLog",
        back_populates="invitation_code",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    # 索引
    __table_args__ = (
        Index("idx_project_code", "project_id", "code"),
        Index("idx_code_status", "status"),
        Index("idx_code_disabled", "is_disabled"),
        Index("idx_code_expired", "is_expired"),
        Index("idx_code_expires_at", "expires_at"),
        # 状态互斥约束：已使用/已禁用/已过期不能同时出现
        CheckConstraint(
            "NOT (status = 1 AND is_disabled = 1)",
            name="chk_code_not_used_and_disabled",
        ),
        CheckConstraint(
            "NOT (status = 1 AND is_expired = 1)",
            name="chk_code_not_used_and_expired",
        ),
        CheckConstraint(
            "NOT (is_disabled = 1 AND is_expired = 1)",
            name="chk_code_not_disabled_and_expired",
        ),
    )

    def __repr__(self) -> str:
        return f"<InvitationCode(id={self.id}, code='{self.code}', status={self.status})>"

    def _calculate_is_expired(self) -> bool:
        """计算激活码是否过期（优先使用激活码自己的过期时间，否则使用项目有效期）"""
        # 优先使用激活码自己的过期时间
        if self.expires_at is not None:
            return datetime.utcnow() > self.expires_at
        # 否则使用项目有效期
        if self.project is None or self.project.expires_at is None:
            return False
        return datetime.utcnow() > self.project.expires_at

    @property
    def is_valid(self) -> bool:
        """检查激活码是否有效（未核销且未过期且未禁用且项目启用）"""
        return (
            not self.status
            and not self.is_disabled
            and not self.is_expired
            and self.project is not None
            and self.project.is_active
        )


@event.listens_for(InvitationCode, "before_insert")
def generate_code_id(mapper, connection, target):
    """在插入前生成激活码ID"""
    if not target.id:
        target.id = generate_uuid()
