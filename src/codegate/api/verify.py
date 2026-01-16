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
from ..services.verification import VerificationService
from ..core.exceptions import (
    CodeNotFoundError,
    CodeAlreadyVerifiedError,
    CodeExpiredError,
    ProjectDisabledError,
    ProjectExpiredError,
)

router = APIRouter(prefix="/api/codes", tags=["verify"])


@router.post("/verify", response_model=VerificationResponse)
def verify_code(
    request: VerificationRequest,
    http_request: Request,
    db: Session = Depends(get_db),
):
    """
    核销验证邀请码
    """
    # 获取客户端信息
    ip_address = http_request.client.host if http_request.client else None
    user_agent = http_request.headers.get("user-agent")

    try:
        # 执行核销
        code = VerificationService.verify(
            db=db,
            request=request,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        return VerificationResponse(
            success=True,
            message="核销成功",
            code_id=code.id,
            project_id=code.project_id,
            project_name=code.project.name,
            verified_at=code.verified_at,
        )
    except CodeNotFoundError as e:
        return VerificationResponse(
            success=False,
            message=str(e),
        )
    except (CodeAlreadyVerifiedError, CodeExpiredError, ProjectDisabledError, ProjectExpiredError) as e:
        return VerificationResponse(
            success=False,
            message=str(e),
        )
