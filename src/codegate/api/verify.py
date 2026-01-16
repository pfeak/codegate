"""
核销 API 路由

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
from fastapi import APIRouter, Depends, Request, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.verification import VerificationRequest, VerificationResponse
from ..schemas.auth import AdminResponse
from ..api.auth import require_admin
from ..services.verification import VerificationService
from ..core.exceptions import (
    CodeNotFoundError,
    CodeAlreadyVerifiedError,
    CodeDisabledError,
    CodeExpiredError,
    ProjectDisabledError,
    ProjectExpiredError,
    RateLimitExceededError,
)
from ..utils.rate_limiter import rate_limiter
from ..config import settings

router = APIRouter(prefix="/api/codes", tags=["verify"])


@router.post("/verify", response_model=VerificationResponse)
def verify_code(
    request: VerificationRequest,
    http_request: Request,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    核销验证激活码

    包含 IP 频率限制，防止暴力破解
    """
    # 获取客户端信息
    ip_address = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")

    try:
        # 检查频率限制（如果启用）
        if settings.RATE_LIMIT_ENABLED:
            rate_limiter.check_rate_limit(
                ip_address=ip_address,
                max_attempts=settings.RATE_LIMIT_PER_MINUTE,
                time_window_seconds=60,  # 1 分钟窗口
            )

        # 执行核销
        code = VerificationService.verify(
            db=db,
            request=request,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        # 核销成功后重置频率限制（可选，允许成功操作后继续）
        # rate_limiter.reset(ip_address)

        return VerificationResponse(
            success=True,
            message="核销成功",
            code_id=code.id,
            project_id=code.project_id,
            project_name=code.project.name,
            verified_at=code.verified_at,
        )
    except RateLimitExceededError as e:
        return VerificationResponse(
            success=False,
            message=str(e),
        )
    except CodeNotFoundError as e:
        return VerificationResponse(
            success=False,
            message=str(e),
        )
    except (CodeAlreadyVerifiedError, CodeDisabledError, CodeExpiredError, ProjectDisabledError, ProjectExpiredError) as e:
        return VerificationResponse(
            success=False,
            message=str(e),
        )
