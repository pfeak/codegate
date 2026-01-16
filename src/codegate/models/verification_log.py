"""
核销日志模型

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
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship

from ..database import Base


class VerificationLog(Base):
    """核销日志模型"""
    __tablename__ = "verification_logs"

    id = Column(Integer, primary_key=True, index=True, comment="日志ID")
    code_id = Column(Integer, ForeignKey("invitation_codes.id", ondelete="CASCADE"), nullable=False, index=True, comment="邀请码ID")
    verified_at = Column(DateTime, default=datetime.utcnow, nullable=False, comment="核销时间")
    verified_by = Column(String(100), nullable=True, comment="核销用户")
    ip_address = Column(String(45), nullable=True, comment="IP地址")
    user_agent = Column(Text, nullable=True, comment="用户代理")
    result = Column(String(20), nullable=False, default="success", comment="核销结果（success/failed）")
    reason = Column(Text, nullable=True, comment="失败原因")

    # 关系
    invitation_code = relationship("InvitationCode", back_populates="verification_logs")

    # 索引
    __table_args__ = (
        Index("idx_code_verified_at", "code_id", "verified_at"),
    )

    def __repr__(self) -> str:
        return f"<VerificationLog(id={self.id}, code_id={self.code_id}, result='{self.result}')>"
