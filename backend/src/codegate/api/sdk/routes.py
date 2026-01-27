"""
SDK API 路由

提供第三方系统集成使用的 API 端点
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Request, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
import math

from ...database import get_db
from ...models.api_key import ApiKey
from ...services.project import ProjectService
from ...services.code import CodeService
from ...services.verification import VerificationService
from ...schemas.verification import VerificationRequest
from .auth import verify_sdk_auth
from ...schemas.utils import datetime_to_timestamp
from ...core.exceptions import (
    CodeNotFoundError,
    CodeAlreadyVerifiedError,
    CodeDisabledError,
    CodeExpiredError,
    ProjectDisabledError,
    ProjectExpiredError,
)
from urllib.parse import unquote

router = APIRouter(prefix="/api/v1", tags=["sdk_api"])


class ProjectStatistics(BaseModel):
    """项目统计信息"""
    total_codes: int
    used_codes: int
    unused_codes: int
    disabled_codes: int
    expired_codes: int


class SDKProjectResponse(BaseModel):
    """SDK API 项目响应模型"""
    id: str
    name: str
    description: Optional[str] = None
    status: bool
    expires_at: Optional[int] = None
    created_at: int
    statistics: ProjectStatistics


@router.get("/projects/{project_id}", response_model=SDKProjectResponse)
async def get_project(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    获取项目信息

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 获取项目
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 检查项目状态
    if not project.status:
        raise HTTPException(status_code=401, detail="Project is disabled")

    # 获取统计信息
    stats = ProjectService.get_code_stats(db=db, project_id=project_id)

    # 转换时间戳
    created_at = datetime_to_timestamp(project.created_at) if project.created_at else None
    expires_at = datetime_to_timestamp(project.expires_at) if project.expires_at else None

    return SDKProjectResponse(
        id=project.id,
        name=project.name,
        description=project.description,
        status=project.status,
        expires_at=expires_at,
        created_at=created_at or 0,
        statistics=ProjectStatistics(
            total_codes=stats.get("total", 0),
            used_codes=stats.get("verified", 0),
            unused_codes=stats.get("unverified", 0),
            disabled_codes=stats.get("disabled", 0),
            expired_codes=stats.get("expired", 0),
        )
    )


class CodeItem(BaseModel):
    """激活码项"""
    id: str
    code: str
    status: bool
    is_disabled: bool
    is_expired: bool
    expires_at: Optional[int] = None
    verified_at: Optional[int] = None
    verified_by: Optional[str] = None
    created_at: int


class CodeListResponse(BaseModel):
    """激活码列表响应"""
    items: list[CodeItem]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/projects/{project_id}/codes", response_model=CodeListResponse)
async def list_codes(
    project_id: str,
    request: Request,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(20, ge=1, le=100, description="每页数量"),
    status: Optional[str] = Query(None, description="状态筛选（unused/used/disabled/expired）"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    查询激活码列表

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 检查项目状态
    if not project.status:
        raise HTTPException(status_code=401, detail="Project is disabled")

    # 转换状态筛选参数
    status_bool = None
    is_disabled = None
    is_expired = None

    if status == "unused":
        status_bool = False
        is_disabled = False
        is_expired = False
    elif status == "used":
        status_bool = True
        is_disabled = False
        is_expired = False
    elif status == "disabled":
        is_disabled = True
    elif status == "expired":
        is_expired = True

    # 查询激活码列表
    codes, total = CodeService.get_list(
        db=db,
        project_id=project_id,
        page=page,
        page_size=page_size,
        status=status_bool,
        is_disabled=is_disabled,
        is_expired=is_expired,
        search=search,
    )

    # 转换为响应格式
    items = []
    for code in codes:
        items.append(CodeItem(
            id=code.id,
            code=code.code,
            status=code.status,
            is_disabled=code.is_disabled,
            is_expired=code.is_expired,
            expires_at=datetime_to_timestamp(code.expires_at) if code.expires_at else None,
            verified_at=datetime_to_timestamp(code.verified_at) if code.verified_at else None,
            verified_by=code.verified_by,
            created_at=datetime_to_timestamp(code.created_at) if code.created_at else 0,
        ))

    total_pages = math.ceil(total / page_size) if total > 0 else 0

    return CodeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


class VerificationLogItem(BaseModel):
    """核销日志项"""
    id: str
    verified_at: int
    verified_by: Optional[str] = None
    ip_address: Optional[str] = None
    result: str


class CodeDetailResponse(BaseModel):
    """激活码详情响应"""
    id: str
    code: str
    status: bool
    is_disabled: bool
    is_expired: bool
    expires_at: Optional[int] = None
    verified_at: Optional[int] = None
    verified_by: Optional[str] = None
    created_at: int
    verification_logs: list[VerificationLogItem] = []


@router.get("/projects/{project_id}/codes/{code_id}", response_model=CodeDetailResponse)
async def get_code(
    project_id: str,
    code_id: str,
    request: Request,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    查询单个激活码详情

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 检查项目状态
    if not project.status:
        raise HTTPException(status_code=401, detail="Project is disabled")

    # 通过 ID 查询激活码（仅支持 UUID 格式）
    code = CodeService.get_by_id(db=db, code_id=code_id)

    if not code:
        raise HTTPException(status_code=404, detail="Code not found")

    # 验证激活码属于当前项目
    if code.project_id != project_id:
        raise HTTPException(status_code=404, detail="Code not found")

    # 获取核销日志
    logs, _ = VerificationService.get_logs(db=db, code_id=code.id, page=1, page_size=100)

    return CodeDetailResponse(
        id=code.id,
        code=code.code,
        status=code.status,
        is_disabled=code.is_disabled,
        is_expired=code.is_expired,
        expires_at=datetime_to_timestamp(code.expires_at) if code.expires_at else None,
        verified_at=datetime_to_timestamp(code.verified_at) if code.verified_at else None,
        verified_by=code.verified_by,
        created_at=datetime_to_timestamp(code.created_at) if code.created_at else 0,
        verification_logs=[
            VerificationLogItem(
                id=log.id,
                verified_at=datetime_to_timestamp(log.verified_at) if log.verified_at else 0,
                verified_by=log.verified_by,
                ip_address=log.ip_address,
                result=log.result,
            )
            for log in logs
        ],
    )


@router.get("/projects/{project_id}/codes/by-code/{code}", response_model=CodeDetailResponse)
async def get_code_by_code(
    project_id: str,
    code: str,
    request: Request,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    通过激活码内容查询

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # URL 解码
    decoded_code = unquote(code)

    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 检查项目状态
    if not project.status:
        raise HTTPException(status_code=401, detail="Project is disabled")

    # 查询激活码
    code_obj = CodeService.get_by_code(db=db, code=decoded_code)
    if not code_obj:
        raise HTTPException(status_code=404, detail="Code not found")

    # 验证激活码属于当前项目
    if code_obj.project_id != project_id:
        raise HTTPException(status_code=404, detail="Code not found")

    # 获取核销日志
    logs, _ = VerificationService.get_logs(db=db, code_id=code_obj.id, page=1, page_size=100)

    return CodeDetailResponse(
        id=code_obj.id,
        code=code_obj.code,
        status=code_obj.status,
        is_disabled=code_obj.is_disabled,
        is_expired=code_obj.is_expired,
        expires_at=datetime_to_timestamp(code_obj.expires_at) if code_obj.expires_at else None,
        verified_at=datetime_to_timestamp(code_obj.verified_at) if code_obj.verified_at else None,
        verified_by=code_obj.verified_by,
        created_at=datetime_to_timestamp(code_obj.created_at) if code_obj.created_at else 0,
        verification_logs=[
            VerificationLogItem(
                id=log.id,
                verified_at=datetime_to_timestamp(log.verified_at) if log.verified_at else 0,
                verified_by=log.verified_by,
                ip_address=log.ip_address,
                result=log.result,
            )
            for log in logs
        ],
    )


class VerifyRequest(BaseModel):
    """核销请求"""
    code: str
    verified_by: Optional[str] = None


class VerifyResponse(BaseModel):
    """核销响应"""
    success: bool
    code_id: Optional[str] = None
    code: str
    verified_at: Optional[int] = None
    message: str
    error_code: Optional[str] = None


@router.post("/projects/{project_id}/codes/verify", response_model=VerifyResponse)
async def verify_code(
    project_id: str,
    request: Request,
    verify_request: VerifyRequest,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    核销激活码

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 获取客户端信息
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    # 执行核销
    try:
        verification_req = VerificationRequest(
            code=verify_request.code,
            verified_by=verify_request.verified_by,
        )
        code = VerificationService.verify(
            db=db,
            request=verification_req,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return VerifyResponse(
            success=True,
            code_id=code.id,
            code=code.code,
            verified_at=datetime_to_timestamp(code.verified_at) if code.verified_at else None,
            message="Code verified successfully",
        )
    except CodeNotFoundError:
        return VerifyResponse(
            success=False,
            code=verify_request.code,
            message="Code not found",
            error_code="CODE_NOT_FOUND",
        )
    except CodeAlreadyVerifiedError:
        return VerifyResponse(
            success=False,
            code=verify_request.code,
            message="Code has already been used",
            error_code="CODE_ALREADY_USED",
        )
    except CodeDisabledError:
        return VerifyResponse(
            success=False,
            code=verify_request.code,
            message="Code is disabled",
            error_code="CODE_DISABLED",
        )
    except CodeExpiredError:
        return VerifyResponse(
            success=False,
            code=verify_request.code,
            message="Code is expired",
            error_code="CODE_EXPIRED",
        )
    except ProjectDisabledError:
        return VerifyResponse(
            success=False,
            code=verify_request.code,
            message="Project is disabled",
            error_code="PROJECT_DISABLED",
        )
    except ProjectExpiredError:
        return VerifyResponse(
            success=False,
            code=verify_request.code,
            message="Project is expired",
            error_code="PROJECT_EXPIRED",
        )


class ReactivateRequest(BaseModel):
    """重新激活请求"""
    code: str
    reactivated_by: Optional[str] = None
    reason: Optional[str] = None


class ReactivateResponse(BaseModel):
    """重新激活响应"""
    success: bool
    code_id: Optional[str] = None
    code: str
    reactivated_at: Optional[int] = None
    message: str
    error_code: Optional[str] = None


@router.post("/projects/{project_id}/codes/reactivate", response_model=ReactivateResponse)
async def reactivate_code(
    project_id: str,
    request: Request,
    reactivate_request: ReactivateRequest,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    重新激活激活码

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 检查项目状态
    if not project.status:
        return ReactivateResponse(
            success=False,
            code=reactivate_request.code,
            message="Project is disabled",
            error_code="PROJECT_DISABLED",
        )

    # 查询激活码
    code = CodeService.get_by_code(db=db, code=reactivate_request.code)
    if not code:
        return ReactivateResponse(
            success=False,
            code=reactivate_request.code,
            message="Code not found",
            error_code="CODE_NOT_FOUND",
        )

    # 验证激活码属于当前项目
    if code.project_id != project_id:
        return ReactivateResponse(
            success=False,
            code=reactivate_request.code,
            message="Code not found",
            error_code="CODE_NOT_FOUND",
        )

    # 检查前置条件
    if not code.status:
        return ReactivateResponse(
            success=False,
            code=reactivate_request.code,
            message="Code is already unused",
            error_code="CODE_ALREADY_UNUSED",
        )

    if code.is_disabled:
        return ReactivateResponse(
            success=False,
            code=reactivate_request.code,
            message="Code is disabled",
            error_code="CODE_DISABLED",
        )

    if code.is_expired:
        return ReactivateResponse(
            success=False,
            code=reactivate_request.code,
            message="Code is expired",
            error_code="CODE_EXPIRED",
        )

    # 重新激活：将状态改为未使用，清除核销时间和核销用户
    code.status = False
    code.verified_at = None
    code.verified_by = None

    updated_code = CodeService.update(db=db, code=code)

    # 记录核销日志（重新激活）
    from datetime import datetime
    from ...models.verification_log import VerificationLog
    from ...services.verification.verification_repository import VerificationRepository

    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    log = VerificationLog(
        code_id=updated_code.id,
        verified_at=datetime.utcnow(),
        verified_by=reactivate_request.reactivated_by,
        ip_address=ip_address,
        user_agent=user_agent,
        result="reactivated",
        reason=reactivate_request.reason,
    )
    VerificationRepository.create(db, log)
    db.commit()

    return ReactivateResponse(
        success=True,
        code_id=updated_code.id,
        code=updated_code.code,
        reactivated_at=datetime_to_timestamp(datetime.utcnow()),
        message="Code reactivated successfully",
    )


class StatisticsResponse(BaseModel):
    """统计信息响应"""
    project_id: str
    total_codes: int
    used_codes: int
    unused_codes: int
    disabled_codes: int
    expired_codes: int
    usage_rate: float
    recent_verifications: list[dict] = []


@router.get("/projects/{project_id}/statistics", response_model=StatisticsResponse)
async def get_statistics(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    api_key: ApiKey = Depends(verify_sdk_auth),
):
    """
    获取项目统计信息

    需要 SDK API 认证（API Key + HMAC 签名）
    """
    # 验证项目 ID 匹配
    if api_key.project_id != project_id:
        raise HTTPException(
            status_code=403,
            detail="Project ID in path does not match API Key's project"
        )

    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 检查项目状态
    if not project.status:
        raise HTTPException(status_code=401, detail="Project is disabled")

    # 获取统计信息
    stats = ProjectService.get_code_stats(db=db, project_id=project_id)

    total = stats.get("total", 0)
    used = stats.get("verified", 0)
    unused = stats.get("unverified", 0)
    expired = stats.get("expired", 0)
    disabled = 0  # 需要单独统计

    # 计算使用率
    usage_rate = (used / total) if total > 0 else 0.0

    # 获取最近的核销记录（简化版，只返回最近10条）
    from ...services.verification import VerificationService
    from ...models.invitation_code import InvitationCode
    from sqlalchemy import select, desc

    # 查询最近核销的激活码
    recent_codes_query = (
        select(InvitationCode)
        .where(
            InvitationCode.project_id == project_id,
            InvitationCode.status == True,
            InvitationCode.verified_at.isnot(None),
        )
        .order_by(desc(InvitationCode.verified_at))
        .limit(10)
    )
    recent_codes = db.execute(recent_codes_query).scalars().all()

    recent_verifications = [
        {
            "code": code.code,
            "verified_at": datetime_to_timestamp(code.verified_at) if code.verified_at else None,
            "verified_by": code.verified_by,
        }
        for code in recent_codes
    ]

    return StatisticsResponse(
        project_id=project_id,
        total_codes=total,
        used_codes=used,
        unused_codes=unused,
        disabled_codes=disabled,
        expired_codes=expired,
        usage_rate=round(usage_rate, 4),
        recent_verifications=recent_verifications,
    )
