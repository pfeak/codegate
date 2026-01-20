"""
审计日志服务层

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
import json
from typing import Optional, Any, Dict
from sqlalchemy.orm import Session

from ...models.audit_log import AuditLog
from ...models.admin import Admin
from ...models.project import Project
from ...models.invitation_code import InvitationCode
from .audit_repository import AuditRepository


class AuditService:
    """审计日志服务"""

    @staticmethod
    def log(
        db: Session,
        action: str,
        actor_id: Optional[str] = None,
        actor_type: str = "admin",
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        result: str = "success",
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> AuditLog:
        """
        记录审计日志

        Args:
            db: 数据库会话
            action: 操作类型
            actor_id: 操作人ID
            actor_type: 操作人类型（admin/system/external）
            resource_type: 资源类型
            resource_id: 资源ID
            result: 操作结果（success/failed）
            ip_address: 客户端IP地址
            user_agent: 用户代理
            details: 操作详情（字典，会自动转换为JSON）

        Returns:
            AuditLog: 创建的审计日志
        """
        log = AuditLog(
            action=action,
            actor_id=actor_id,
            actor_type=actor_type,
            resource_type=resource_type,
            resource_id=resource_id,
            result=result,
            ip_address=ip_address,
            user_agent=user_agent,
            details=json.dumps(details, ensure_ascii=False) if details else None,
        )
        return AuditRepository.create(db, log)

    @staticmethod
    def get_logs(
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
        return AuditRepository.get_list(
            db=db,
            actor_id=actor_id,
            resource_type=resource_type,
            resource_id=resource_id,
            action=action,
            result=result,
            start_time=start_time,
            end_time=end_time,
            page=page,
            page_size=page_size,
        )

    @staticmethod
    def enrich_logs(db: Session, logs: list[AuditLog]) -> list[Dict[str, Any]]:
        """
        丰富审计日志信息（添加操作人用户名、资源名称等）

        Args:
            db: 数据库会话
            logs: 审计日志列表

        Returns:
            list[Dict[str, Any]]: 丰富后的日志列表
        """
        from sqlalchemy import select

        result = []

        # 收集所有需要查询的ID
        admin_ids = set()
        project_ids = set()
        code_ids = set()

        for log in logs:
            if log.actor_id and log.actor_type == "admin":
                admin_ids.add(log.actor_id)
            if log.resource_type == "project" and log.resource_id:
                project_ids.add(log.resource_id)
            if log.resource_type == "code" and log.resource_id:
                code_ids.add(log.resource_id)

        # 批量查询
        admin_map = {}
        if admin_ids:
            stmt = select(Admin).where(Admin.id.in_(admin_ids))
            admins = db.scalars(stmt).all()
            admin_map = {admin.id: admin.username for admin in admins}

        project_map = {}
        if project_ids:
            stmt = select(Project).where(Project.id.in_(project_ids))
            projects = db.scalars(stmt).all()
            project_map = {project.id: project.name for project in projects}

        code_map = {}
        if code_ids:
            stmt = select(InvitationCode).where(InvitationCode.id.in_(code_ids))
            codes = db.scalars(stmt).all()
            code_map = {code.id: code.code for code in codes}

        # 构建结果
        for log in logs:
            item = {
                "id": log.id,
                "action": log.action,
                "actor_id": log.actor_id,
                "actor_type": log.actor_type,
                "actor_username": admin_map.get(log.actor_id) if log.actor_id else None,
                "resource_type": log.resource_type,
                "resource_id": log.resource_id,
                "resource_name": None,
                "result": log.result,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "details": log.details,
                "created_at": log.created_at,
            }

            # 填充资源名称
            if log.resource_type == "project" and log.resource_id:
                item["resource_name"] = project_map.get(log.resource_id)
            elif log.resource_type == "code" and log.resource_id:
                item["resource_name"] = code_map.get(log.resource_id)

            result.append(item)

        return result
