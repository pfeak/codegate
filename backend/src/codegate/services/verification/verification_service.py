"""
核销服务层

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
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from ...models.invitation_code import InvitationCode
from ...models.verification_log import VerificationLog
from ...schemas.verification import VerificationRequest
from ...core.exceptions import (
    CodeNotFoundError,
    CodeAlreadyVerifiedError,
    CodeExpiredError,
    CodeDisabledError,
    ProjectDisabledError,
    ProjectExpiredError,
)
from ..code.code_repository import CodeRepository
from ..code.code_service import CodeService
from .verification_repository import VerificationRepository


class VerificationService:
    """核销服务"""

    @staticmethod
    def verify(
        db: Session,
        request: VerificationRequest,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> InvitationCode:
        """
        核销验证激活码

        Args:
            db: 数据库会话
            request: 核销请求
            ip_address: IP地址
            user_agent: 用户代理

        Returns:
            InvitationCode: 核销成功的激活码对象

        Raises:
            CodeNotFoundError: 激活码不存在
            CodeAlreadyVerifiedError: 激活码已核销
            CodeDisabledError: 激活码已禁用
            CodeExpiredError: 激活码已过期
            ProjectDisabledError: 项目已禁用
            ProjectExpiredError: 项目已过期
        """
        # 查找激活码
        code = CodeService.get_by_code(db, request.code)

        if not code:
            # 记录失败日志
            VerificationService._log_verification(
                db, None, False, "激活码不存在", ip_address, user_agent, request.verified_by
            )
            raise CodeNotFoundError(request.code)

        # 检查是否已禁用
        if code.is_disabled:
            VerificationService._log_verification(
                db, code.id, False, "激活码已禁用", ip_address, user_agent, request.verified_by
            )
            raise CodeDisabledError(request.code)

        # 检查是否已核销
        if code.status:
            VerificationService._log_verification(
                db, code.id, False, "激活码已使用", ip_address, user_agent, request.verified_by
            )
            raise CodeAlreadyVerifiedError(request.code)

        # 检查是否过期
        if code.is_expired:
            VerificationService._log_verification(
                db, code.id, False, "激活码已过期", ip_address, user_agent, request.verified_by
            )
            raise CodeExpiredError(request.code)

        # 检查项目是否启用
        if not code.project.status:
            VerificationService._log_verification(
                db, code.id, False, "项目已禁用", ip_address, user_agent, request.verified_by
            )
            raise ProjectDisabledError(code.project_id)

        # 检查项目是否过期
        if code.project.is_expired:
            VerificationService._log_verification(
                db, code.id, False, "项目已过期", ip_address, user_agent, request.verified_by
            )
            raise ProjectExpiredError(code.project_id)

        # 核销成功
        code.status = True
        code.verified_at = datetime.utcnow()
        code.verified_by = request.verified_by

        # 记录成功日志
        VerificationService._log_verification(
            db, code.id, True, None, ip_address, user_agent, request.verified_by
        )

        CodeRepository.update(db, code)

        return code

    @staticmethod
    def _log_verification(
        db: Session,
        code_id: Optional[str],
        success: bool,
        reason: Optional[str],
        ip_address: Optional[str],
        user_agent: Optional[str],
        verified_by: Optional[str],
    ) -> None:
        """
        记录核销日志

        Args:
            db: 数据库会话
            code_id: 激活码ID
            success: 是否成功
            reason: 失败原因
            ip_address: IP地址
            user_agent: 用户代理
            verified_by: 核销用户
        """
        # 设计/表结构约束：verification_logs.code_id 为非空外键
        # 因此当激活码不存在时（code_id=None）无法写入核销日志，直接跳过即可。
        if code_id is None:
            return

        log = VerificationLog(
            code_id=code_id,
            verified_at=datetime.utcnow(),
            verified_by=verified_by,
            ip_address=ip_address,
            user_agent=user_agent,
            result="success" if success else "failed",
            reason=reason,
        )
        VerificationRepository.create(db, log)

    @staticmethod
    def get_logs(
        db: Session,
        code_id: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[VerificationLog], int]:
        """
        获取核销日志列表

        Args:
            db: 数据库会话
            code_id: 激活码ID（可选）
            page: 页码
            page_size: 每页数量

        Returns:
            tuple[list[VerificationLog], int]: (日志列表, 总数)
        """
        return VerificationRepository.get_list(db, code_id, page, page_size)
