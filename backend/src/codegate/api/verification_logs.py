"""
核销日志 API 路由

用于前端 /verify 页面展示“历史核销记录”列表。

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

from ..database import get_db
from ..api.auth import require_admin
from ..schemas.auth import AdminResponse
from ..schemas.verification_log import VerificationLogListResponse, VerificationLogItem
from ..models.verification_log import VerificationLog
from ..models.invitation_code import InvitationCode
from ..models.project import Project

router = APIRouter(prefix="/api/verification-logs", tags=["verification-logs"])


@router.get("", response_model=VerificationLogListResponse)
def get_verification_logs(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取核销日志列表（按时间倒序）
    """
    query = (
        db.query(
            VerificationLog,
            InvitationCode.code,
            InvitationCode.project_id,
            Project.name.label("project_name"),
        )
        .join(InvitationCode, VerificationLog.code_id == InvitationCode.id)
        .join(Project, InvitationCode.project_id == Project.id)
    )

    total = query.count()
    offset = (page - 1) * page_size
    rows = (
        query.order_by(VerificationLog.verified_at.desc())
        .offset(offset)
        .limit(page_size)
        .all()
    )

    items = [
        VerificationLogItem(
            id=log.id,
            code_id=log.code_id,
            code=code,
            project_id=project_id,
            project_name=project_name,
            verified_at=log.verified_at,
            verified_by=log.verified_by,
            result=log.result,
            reason=log.reason,
        )
        for (log, code, project_id, project_name) in rows
    ]

    return VerificationLogListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )
