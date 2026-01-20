"""
审计日志模型

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
from sqlalchemy import Column, String, DateTime, Text, Index, event

from ..database import Base
from ..utils.uuid_utils import generate_uuid


class AuditLog(Base):
    """审计日志模型"""
    __tablename__ = "audit_logs"

    id = Column(String(32), primary_key=True, index=True, comment="日志ID（UUID，去除连字符）")
    action = Column(String(50), nullable=False, index=True, comment="操作类型")
    actor_id = Column(String(32), nullable=True, index=True, comment="操作人ID（管理员ID，可为空）")
    actor_type = Column(String(20), nullable=False, default="admin", comment="操作人类型（admin/system/external）")
    resource_type = Column(String(50), nullable=True, index=True, comment="资源类型（project/code/admin/session等）")
    resource_id = Column(String(32), nullable=True, index=True, comment="资源ID（如项目ID、激活码ID，可为空）")
    result = Column(String(20), nullable=False, default="success", comment="操作结果（success/failed）")
    ip_address = Column(String(45), nullable=True, comment="客户端IP地址（IPv4/IPv6）")
    user_agent = Column(Text, nullable=True, comment="用户代理字符串")
    details = Column(Text, nullable=True, comment="操作详情（JSON文本）")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True, comment="创建时间（UTC）")

    # 索引设计
    __table_args__ = (
        Index("idx_audit_actor_created", "actor_id", "created_at"),
        Index("idx_audit_resource_created", "resource_type", "resource_id", "created_at"),
        Index("idx_audit_action_created", "action", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action='{self.action}', actor_id='{self.actor_id}', result='{self.result}')>"


@event.listens_for(AuditLog, "before_insert")
def generate_audit_log_id(mapper, connection, target):
    """在插入前生成审计日志ID"""
    if not target.id:
        target.id = generate_uuid()
