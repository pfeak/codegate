"""
项目概览 API 路由

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
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, select

from ..database import get_db
from ..schemas.dashboard import DashboardOverviewResponse, RecentVerification
from ..schemas.auth import AdminResponse
from ..api.auth import require_admin
from ..models.project import Project
from ..models.invitation_code import InvitationCode
from ..models.verification_log import VerificationLog

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
def get_overview(
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取项目概览数据
    """
    # 统计项目总数
    project_count_stmt = select(func.count(Project.id))
    project_count = db.execute(project_count_stmt).scalar() or 0

    # 统计激活码总数、已使用数量、未使用数量
    code_count_stmt = select(func.count(InvitationCode.id))
    code_count = db.execute(code_count_stmt).scalar() or 0

    verified_count_stmt = (
        select(func.count(InvitationCode.id)).where(
            InvitationCode.status.is_(True),
            InvitationCode.is_disabled.is_(False),
            InvitationCode.is_expired.is_(False),
        )
    )
    verified_count = db.execute(verified_count_stmt).scalar() or 0

    unverified_count_stmt = (
        select(func.count(InvitationCode.id)).where(
            InvitationCode.status.is_(False),
            InvitationCode.is_disabled.is_(False),
            InvitationCode.is_expired.is_(False),
        )
    )
    unverified_count = db.execute(unverified_count_stmt).scalar() or 0

    # 获取最近10条核销记录
    recent_logs_stmt = (
        select(
            VerificationLog.code_id,
            InvitationCode.code,
            InvitationCode.project_id,
            Project.name.label("project_name"),
            VerificationLog.verified_at,
            VerificationLog.verified_by,
        )
        .join(InvitationCode, VerificationLog.code_id == InvitationCode.id)
        .join(Project, InvitationCode.project_id == Project.id)
        .where(VerificationLog.result == "success")
        .order_by(VerificationLog.verified_at.desc())
        .limit(10)
    )

    recent_logs = db.execute(recent_logs_stmt).all()

    recent_verifications = [
        RecentVerification(
            code_id=log.code_id,
            code=log.code,
            project_id=log.project_id,
            project_name=log.project_name,
            verified_at=log.verified_at,
            verified_by=log.verified_by,
        )
        for log in recent_logs
    ]

    return DashboardOverviewResponse(
        project_count=project_count,
        code_count=code_count,
        verified_count=verified_count,
        unverified_count=unverified_count,
        recent_verifications=recent_verifications,
    )
