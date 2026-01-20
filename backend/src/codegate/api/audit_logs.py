"""
审计日志 API 路由

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

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..api.auth import require_admin
from ..schemas.auth import AdminResponse
from ..schemas.audit_log import AuditLogListResponse, AuditLogItem
from ..services.audit import AuditService

router = APIRouter(prefix="/api/audit-logs", tags=["audit-logs"])


@router.get("", response_model=AuditLogListResponse)
def get_audit_logs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    actor_id: Optional[str] = Query(None, description="操作人ID"),
    resource_type: Optional[str] = Query(None, description="资源类型"),
    resource_id: Optional[str] = Query(None, description="资源ID"),
    action: Optional[str] = Query(None, description="操作类型"),
    result: Optional[str] = Query(None, description="操作结果（success/failed）"),
    start_time: Optional[int] = Query(None, description="开始时间（UTC时间戳，秒级）"),
    end_time: Optional[int] = Query(None, description="结束时间（UTC时间戳，秒级）"),
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取审计日志列表（仅管理员可访问）
    """
    logs, total = AuditService.get_logs(
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

    # 丰富日志信息（添加操作人用户名、资源名称等）
    enriched_logs = AuditService.enrich_logs(db, logs)

    items = [
        AuditLogItem(
            id=log["id"],
            action=log["action"],
            actor_id=log["actor_id"],
            actor_type=log["actor_type"],
            actor_username=log["actor_username"],
            resource_type=log["resource_type"],
            resource_id=log["resource_id"],
            resource_name=log["resource_name"],
            result=log["result"],
            ip_address=log["ip_address"],
            user_agent=log["user_agent"],
            details=log["details"],
            created_at=log["created_at"],
        )
        for log in enriched_logs
    ]

    return AuditLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
