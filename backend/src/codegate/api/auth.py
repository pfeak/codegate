"""
认证 API 路由

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
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..schemas.auth import LoginRequest, AdminResponse, ChangePasswordRequest
from ..services.auth import AuthService

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

# 简单的会话存储(生产环境应使用Redis等)
_sessions: dict[str, str] = {}


def get_current_admin(
    request: Request,
    db: Session = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[AdminResponse]:
    """
    获取当前登录的管理员(通过Cookie或Bearer Token)

    Args:
        request: FastAPI请求对象
        db: 数据库会话
        credentials: Bearer Token凭证

    Returns:
        Optional[AdminResponse]: 管理员信息，未登录返回 None
    """
    # 优先从Cookie获取session_id
    session_id = request.cookies.get("session_id")
    if not session_id:
        # 尝试从Bearer Token获取
        if credentials:
            session_id = credentials.credentials

    if not session_id or session_id not in _sessions:
        return None

    admin_id = _sessions.get(session_id)
    if not admin_id:
        return None

    admin = AuthService.get_by_id(db, admin_id)
    if not admin:
        return None

    return AdminResponse.model_validate(admin)


def require_admin(
    current_admin: Optional[AdminResponse] = Depends(get_current_admin),
) -> AdminResponse:
    """
    强制要求管理员认证的依赖项

    Args:
        current_admin: 当前登录的管理员

    Returns:
        AdminResponse: 管理员信息

    Raises:
        HTTPException: 未登录时返回401
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="未登录，请先登录")
    return current_admin


@router.post("/login")
async def login(
    request: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    管理员登录
    """
    admin = AuthService.authenticate(db, request)
    if not admin:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 生成session_id
    import secrets
    session_id = secrets.token_urlsafe(32)
    _sessions[session_id] = admin.id

    # 设置安全Cookie
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=True,  # HTTPS环境
        samesite="strict",
        max_age=86400 * 7,  # 7天
    )

    admin_response = AdminResponse.model_validate(admin)
    return {
        "success": True,
        "message": "登录成功",
        "admin": admin_response,
        "is_initial_password": admin.is_initial_password,
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
):
    """
    管理员登出
    """
    session_id = request.cookies.get("session_id")
    if session_id and session_id in _sessions:
        del _sessions[session_id]

    response.delete_cookie(key="session_id", httponly=True, secure=True, samesite="strict")
    return {"success": True, "message": "登出成功"}


@router.get("/me", response_model=AdminResponse)
def get_current_user(
    current_admin: Optional[AdminResponse] = Depends(get_current_admin),
):
    """
    获取当前登录管理员信息
    """
    if not current_admin:
        raise HTTPException(status_code=401, detail="未登录")
    return current_admin


@router.get("/check-initial-password")
def check_initial_password(
    current_admin: AdminResponse = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    检查当前登录管理员是否使用初始密码
    """
    is_initial = AuthService.check_initial_password(db, current_admin.id)
    return {"is_initial_password": is_initial}


@router.post("/change-password")
def change_password(
    request: ChangePasswordRequest,
    current_admin: AdminResponse = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    修改当前登录管理员密码
    """
    try:
        admin = AuthService.change_password(
            db=db,
            admin_id=current_admin.id,
            old_password=request.old_password,
            new_password=request.new_password,
        )
        return {
            "success": True,
            "message": "密码修改成功",
            "admin": AdminResponse.model_validate(admin),
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
