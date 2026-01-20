"""
审计日志数据访问层

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
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, and_, func

from ...models.audit_log import AuditLog


class AuditRepository:
    """审计日志数据访问层"""

    @staticmethod
    def create(db: Session, log: AuditLog) -> AuditLog:
        """
        创建审计日志

        Args:
            db: 数据库会话
            log: 审计日志对象

        Returns:
            AuditLog: 创建的审计日志
        """
        db.add(log)
        return log

    @staticmethod
    def get_list(
        db: Session,
        actor_id: Optional[str] = None,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        action: Optional[str] = None,
        result: Optional[str] = None,
        start_time: Optional[int] = None,
        end_time: Optional[int] = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[AuditLog], int]:
        """
        获取审计日志列表

        Args:
            db: 数据库会话
            actor_id: 操作人ID（可选）
            resource_type: 资源类型（可选）
            resource_id: 资源ID（可选）
            action: 操作类型（可选）
            result: 操作结果（可选）
            start_time: 开始时间（UTC时间戳，秒级，可选）
            end_time: 结束时间（UTC时间戳，秒级，可选）
            page: 页码
            page_size: 每页数量

        Returns:
            tuple[list[AuditLog], int]: (日志列表, 总数)
        """
        from datetime import datetime

        query = select(AuditLog)

        conditions = []

        if actor_id is not None:
            conditions.append(AuditLog.actor_id == actor_id)

        if resource_type is not None:
            conditions.append(AuditLog.resource_type == resource_type)

        if resource_id is not None:
            conditions.append(AuditLog.resource_id == resource_id)

        if action is not None:
            conditions.append(AuditLog.action == action)

        if result is not None:
            conditions.append(AuditLog.result == result)

        if start_time is not None:
            start_dt = datetime.utcfromtimestamp(start_time)
            conditions.append(AuditLog.created_at >= start_dt)

        if end_time is not None:
            end_dt = datetime.utcfromtimestamp(end_time)
            conditions.append(AuditLog.created_at <= end_dt)

        if conditions:
            query = query.where(and_(*conditions))

        # 计算总数
        count_query = select(func.count(AuditLog.id))
        if conditions:
            count_query = count_query.where(and_(*conditions))
        total = db.scalar(count_query) or 0

        # 分页查询
        offset = (page - 1) * page_size
        query = query.order_by(AuditLog.created_at.desc()).offset(offset).limit(page_size)
        logs = db.scalars(query).all()

        return list(logs), total
