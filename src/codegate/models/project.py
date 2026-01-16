"""
项目模型

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
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Text, Index
from sqlalchemy.orm import relationship

from ..database import Base


class Project(Base):
    """项目模型"""
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True, comment="项目ID")
    name = Column(String(100), nullable=False, index=True, comment="项目名称")
    description = Column(Text, nullable=True, comment="项目描述")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="创建时间")
    expires_at = Column(DateTime, nullable=True, index=True, comment="过期时间")
    status = Column(Boolean, default=True, nullable=False, index=True, comment="项目状态（True=启用, False=禁用）")

    # 关系
    invitation_codes = relationship(
        "InvitationCode",
        back_populates="project",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    # 索引
    __table_args__ = (
        Index("idx_project_status", "status"),
        Index("idx_project_expires_at", "expires_at"),
    )

    def __repr__(self) -> str:
        return f"<Project(id={self.id}, name='{self.name}', status={self.status})>"

    @property
    def is_expired(self) -> bool:
        """检查项目是否过期"""
        if self.expires_at is None:
            return False
        return datetime.utcnow() > self.expires_at

    @property
    def is_active(self) -> bool:
        """检查项目是否激活（启用且未过期）"""
        return self.status and not self.is_expired

    def get_code_stats(self):
        """获取邀请码统计信息"""
        codes = self.invitation_codes.all()
        total = len(codes)
        verified = sum(1 for code in codes if code.status)
        unverified = total - verified
        expired = sum(1 for code in codes if code.is_expired)

        return {
            "total": total,
            "verified": verified,
            "unverified": unverified,
            "expired": expired,
        }
