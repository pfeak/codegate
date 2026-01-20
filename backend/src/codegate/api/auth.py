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
import secrets

from ..database import get_db
from ..schemas.auth import LoginRequest, AdminResponse, ChangePasswordRequest
from ..services.auth import AuthService
from ..config import settings
from ..utils.session_store import get_session_store
from ..utils.audit_log import log_admin, log_external

router = APIRouter(prefix="/api/auth", tags=["auth"])
security = HTTPBearer(auto_error=False)

session_store = get_session_store(settings)


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

    if not session_id:
        return None

    admin_id = session_store.get(session_id)
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
    request: Request,
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    """
    管理员登录
    """
    admin = AuthService.authenticate(db, payload)
    if not admin:
        # 记录登录失败审计日志（尝试登录但失败）
        log_external(db, "login_failed", "session", None, "failed", request=request,
                     username=payload.username, reason="用户名或密码错误")
        db.commit()
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    # 生成session_id
    session_id = secrets.token_urlsafe(32)
    session_store.set(session_id, admin.id)

    # 设置安全Cookie
    #
    # - 仅在 HTTPS 场景下设置 secure=True，避免在本地 HTTP / 测试环境下 Cookie 无法回传导致 401
    # - 如需在反向代理后正确识别 HTTPS，请配合 ProxyHeadersMiddleware 或正确设置 scheme
    secure_cookie = request.url.scheme == "https"
    response.set_cookie(
        key="session_id",
        value=session_id,
        httponly=True,
        secure=secure_cookie,
        samesite="strict",
        max_age=settings.SESSION_TTL_SECONDS,
    )

    # 记录登录成功审计日志
    log_admin(db, "login", admin.id, "session", session_id, "success", request=request,
              username=admin.username, is_initial_password=admin.is_initial_password)
    db.commit()

    admin_response = AdminResponse.model_validate(admin)
    return {
        "success": True,
        "message": "登录成功",
        # 兼容非浏览器/测试场景：允许通过 Bearer Token 方式携带 session_id
        "token": session_id,
        "admin": admin_response,
        "is_initial_password": admin.is_initial_password,
    }


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    current_admin: Optional[AdminResponse] = Depends(get_current_admin),
):
    """
    管理员登出
    """
    session_id = request.cookies.get("session_id")
    admin_id = current_admin.id if current_admin else None

    if session_id:
        session_store.delete(session_id)

        # 记录登出审计日志（仅当有有效会话时）
        if admin_id:
            log_admin(db, "logout", admin_id, "session", session_id, "success", request=request)
            db.commit()

    secure_cookie = request.url.scheme == "https"
    response.delete_cookie(key="session_id", httponly=True, secure=secure_cookie, samesite="strict")
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
    request: Request,
    payload: ChangePasswordRequest,
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
            old_password=payload.old_password,
            new_password=payload.new_password,
        )

        # 记录密码修改成功审计日志
        log_admin(db, "change_password", current_admin.id, "admin", current_admin.id, "success",
                  request=request, username=admin.username)
        db.commit()

        return {
            "success": True,
            "message": "密码修改成功",
            "admin": AdminResponse.model_validate(admin),
        }
    except ValueError as e:
        # 记录密码修改失败审计日志
        log_admin(db, "change_password", current_admin.id, "admin", current_admin.id, "failed",
                  request=request, username=current_admin.username, reason=str(e))
        db.commit()
        raise HTTPException(status_code=400, detail=str(e))
