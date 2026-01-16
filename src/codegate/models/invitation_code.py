"""
邀请码模型

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
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, Index
from sqlalchemy.orm import relationship

from ..database import Base


class InvitationCode(Base):
    """邀请码模型"""
    __tablename__ = "invitation_codes"

    id = Column(Integer, primary_key=True, index=True, comment="邀请码ID")
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True, comment="项目ID")
    code = Column(String(100), nullable=False, unique=True, index=True, comment="邀请码")
    status = Column(Boolean, default=False, nullable=False, comment="核销状态（False=未核销, True=已核销）")
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
    )

    def __repr__(self) -> str:
        return f"<InvitationCode(id={self.id}, code='{self.code}', status={self.status})>"

    @property
    def is_expired(self) -> bool:
        """检查邀请码是否过期（基于项目有效期）"""
        if self.project is None or self.project.expires_at is None:
            return False
        return datetime.utcnow() > self.project.expires_at

    @property
    def is_valid(self) -> bool:
        """检查邀请码是否有效（未核销且未过期且项目启用）"""
        return (
            not self.status
            and not self.is_expired
            and self.project is not None
            and self.project.is_active
        )
