"""
审计日志工具函数

提供便捷的审计日志记录接口，自动从请求中提取 IP 和 User-Agent

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
from typing import Optional, Any, Dict
from fastapi import Request
from sqlalchemy.orm import Session

from ..services.audit import AuditService


def get_client_ip(request: Request) -> Optional[str]:
    """
    从请求中提取客户端IP地址

    Args:
        request: FastAPI 请求对象

    Returns:
        Optional[str]: 客户端IP地址
    """
    # 优先从 X-Forwarded-For 获取（反向代理场景）
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # X-Forwarded-For 可能包含多个IP，取第一个
        return forwarded_for.split(",")[0].strip()

    # 其次从 X-Real-IP 获取
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()

    # 最后从请求客户端获取
    if request.client:
        return request.client.host

    return None


def get_user_agent(request: Request) -> Optional[str]:
    """
    从请求中提取 User-Agent

    Args:
        request: FastAPI 请求对象

    Returns:
        Optional[str]: User-Agent 字符串
    """
    return request.headers.get("User-Agent")


def log_audit(
    db: Session,
    action: str,
    actor_id: Optional[str] = None,
    actor_type: str = "admin",
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    result: str = "success",
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
) -> None:
    """
    记录审计日志（便捷函数）

    Args:
        db: 数据库会话
        action: 操作类型
        actor_id: 操作人ID
        actor_type: 操作人类型（admin/system/external）
        resource_type: 资源类型
        resource_id: 资源ID
        result: 操作结果（success/failed）
        request: FastAPI 请求对象（可选，用于自动提取 IP 和 User-Agent）
        ip_address: 客户端IP地址（可选，如果提供 request 则优先从 request 提取）
        user_agent: 用户代理（可选，如果提供 request 则优先从 request 提取）
        details: 操作详情（字典）
    """
    # 如果提供了 request，优先从 request 中提取 IP 和 User-Agent
    if request:
        if ip_address is None:
            ip_address = get_client_ip(request)
        if user_agent is None:
            user_agent = get_user_agent(request)

    AuditService.log(
        db=db,
        action=action,
        actor_id=actor_id,
        actor_type=actor_type,
        resource_type=resource_type,
        resource_id=resource_id,
        result=result,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details,
    )


def log_admin(
    db: Session,
    action: str,
    actor_id: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    result: str = "success",
    request: Optional[Request] = None,
    **details: Any,
) -> None:
    """
    记录管理员操作审计日志（一行调用便捷函数）

    使用示例：
        log_admin(db, "login", admin.id, resource_type="session", resource_id=session_id, request=request)
        log_admin(db, "create_project", admin.id, "project", project.id, request=request, name=project.name)
        log_admin(db, "delete_code", admin.id, "code", code_id, request=request, reason="清理")

    Args:
        db: 数据库会话
        action: 操作类型（如 "login", "create_project", "delete_code"）
        actor_id: 管理员ID（必需）
        resource_type: 资源类型（如 "project", "code", "admin", "session"）
        resource_id: 资源ID（可选）
        result: 操作结果，默认 "success"（success/failed）
        request: FastAPI 请求对象（可选，用于自动提取 IP 和 User-Agent）
        **details: 操作详情（作为关键字参数传递，自动合并为字典）
    """
    log_audit(
        db=db,
        action=action,
        actor_id=actor_id,
        actor_type="admin",
        resource_type=resource_type,
        resource_id=resource_id,
        result=result,
        request=request,
        details=details if details else None,
    )


def log_external(
    db: Session,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    result: str = "success",
    request: Optional[Request] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
    **details: Any,
) -> None:
    """
    记录外部操作审计日志（一行调用便捷函数）

    用于记录非管理员操作，如核销、外部API调用、登录失败等。

    使用示例：
        log_external(db, "verify_code", "code", code.id, result="failed", ip_address=ip, 
                    user_agent=ua, reason="已禁用")
        log_external(db, "login_failed", "session", request=request, username="admin")

    Args:
        db: 数据库会话
        action: 操作类型（如 "verify_code", "login_failed"）
        resource_type: 资源类型（如 "code", "session"）
        resource_id: 资源ID（可选）
        result: 操作结果，默认 "success"（success/failed）
        request: FastAPI 请求对象（可选，用于自动提取 IP 和 User-Agent）
        ip_address: 客户端IP地址（可选，如果提供 request 则优先从 request 提取）
        user_agent: 用户代理（可选，如果提供 request 则优先从 request 提取）
        **details: 操作详情（作为关键字参数传递，自动合并为字典）
    """
    log_audit(
        db=db,
        action=action,
        actor_id=None,
        actor_type="external",
        resource_type=resource_type,
        resource_id=resource_id,
        result=result,
        request=request,
        ip_address=ip_address,
        user_agent=user_agent,
        details=details if details else None,
    )


def log_system(
    db: Session,
    action: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    result: str = "success",
    **details: Any,
) -> None:
    """
    记录系统操作审计日志（一行调用便捷函数）

    用于记录系统自动执行的操作，如定时任务、过期处理等。

    使用示例：
        log_system(db, "expire_codes", "code", count=100)
        log_system(db, "cleanup_audit_logs", result="success", deleted_count=1000)

    Args:
        db: 数据库会话
        action: 操作类型（如 "expire_codes", "scheduled_job"）
        resource_type: 资源类型（如 "code", "project"）
        resource_id: 资源ID（可选）
        result: 操作结果，默认 "success"（success/failed）
        **details: 操作详情（作为关键字参数传递，自动合并为字典）
    """
    log_audit(
        db=db,
        action=action,
        actor_id=None,
        actor_type="system",
        resource_type=resource_type,
        resource_id=resource_id,
        result=result,
        request=None,
        ip_address=None,
        user_agent=None,
        details=details if details else None,
    )
