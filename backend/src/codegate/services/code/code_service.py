"""
激活码服务层

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
from typing import Optional
from datetime import datetime
from sqlalchemy.orm import Session

from ...models.invitation_code import InvitationCode
from ...schemas.invitation_code import CodeGenerateRequest, CodeUpdateRequest
from ...core.exceptions import ProjectNotFoundError, CodeNotFoundError
from ...core.constants import MAX_BATCH_GENERATE_COUNT
from ...utils.code_generator import generate_codes
from ...schemas.utils import timestamp_to_datetime
from ..project.project_repository import ProjectRepository
from .code_repository import CodeRepository


class CodeService:
    """激活码服务"""

    @staticmethod
    def generate(
        db: Session,
        project_id: str,
        request: CodeGenerateRequest,
    ) -> list[InvitationCode]:
        """
        批量生成激活码

        Args:
            db: 数据库会话
            project_id: 项目ID
            request: 生成请求

        Returns:
            list[InvitationCode]: 生成的激活码列表

        Raises:
            ProjectNotFoundError: 项目不存在
            ValueError: 生成数量超过限制
        """
        # 检查项目是否存在
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        # 检查生成数量限制
        if request.count > MAX_BATCH_GENERATE_COUNT:
            raise ValueError(f"生成数量不能超过 {MAX_BATCH_GENERATE_COUNT}")

        # 获取已存在的激活码
        existing_codes = CodeRepository.get_existing_codes(db, project_id)

        # 生成新的激活码
        new_codes = generate_codes(
            count=request.count,
            length=request.length,
            prefix=request.prefix,
            suffix=request.suffix,
            existing_codes=existing_codes,
        )

        # 转换过期时间
        expires_at_datetime = None
        if request.expires_at is not None:
            expires_at_datetime = timestamp_to_datetime(request.expires_at)

        # 计算初始过期状态
        now = datetime.utcnow()
        initial_is_expired = False
        if expires_at_datetime is not None:
            initial_is_expired = now > expires_at_datetime
        elif project.expires_at is not None:
            initial_is_expired = now > project.expires_at

        # 创建激活码对象
        invitation_codes = [
            InvitationCode(
                project_id=project_id,
                code=code,
                status=False,
                is_disabled=False,
                is_expired=initial_is_expired,
                expires_at=expires_at_datetime,
            )
            for code in new_codes
        ]

        created = CodeRepository.create_batch(db, invitation_codes)
        db.commit()
        for code in created:
            db.refresh(code)
        return created

    @staticmethod
    def get_by_id(db: Session, code_id: str) -> Optional[InvitationCode]:
        """
        根据ID获取激活码

        Args:
            db: 数据库会话
            code_id: 激活码ID

        Returns:
            Optional[InvitationCode]: 激活码对象，不存在返回 None
        """
        code = CodeRepository.get_by_id(db, code_id)
        if code:
            changed = CodeService.refresh_expired_state(code)
            if changed:
                db.commit()
                db.refresh(code)
        return code

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[InvitationCode]:
        """
        根据激活码字符串获取激活码

        Args:
            db: 数据库会话
            code: 激活码字符串

        Returns:
            Optional[InvitationCode]: 激活码对象，不存在返回 None
        """
        code_obj = CodeRepository.get_by_code(db, code)
        if code_obj:
            changed = CodeService.refresh_expired_state(code_obj)
            if changed:
                db.commit()
                db.refresh(code_obj)
        return code_obj

    @staticmethod
    def get_list(
        db: Session,
        project_id: str,
        page: int = 1,
        page_size: int = 10,
        status: Optional[bool] = None,
        is_disabled: Optional[bool] = None,
        is_expired: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[list[InvitationCode], int]:
        """
        获取激活码列表

        Args:
            db: 数据库会话
            project_id: 项目ID
            page: 页码
            page_size: 每页数量
            status: 状态筛选（True=已核销, False=未核销）
            is_disabled: 是否禁用筛选（True=已禁用, False=未禁用）
            is_expired: 是否过期筛选（True=已过期, False=未过期）
            search: 搜索关键词（激活码）

        Returns:
            tuple[list[InvitationCode], int]: (激活码列表, 总数)
        """
        codes, total = CodeRepository.get_list(
            db, project_id, page, page_size, status, is_disabled, is_expired, search
        )
        changed = False
        for code in codes:
            if CodeService.refresh_expired_state(code):
                changed = True
        if changed:
            db.commit()
            for code in codes:
                db.refresh(code)
        return codes, total

    @staticmethod
    def delete(db: Session, code_id: str) -> bool:
        """
        删除激活码

        Args:
            db: 数据库会话
            code_id: 激活码ID

        Returns:
            bool: 是否删除成功
        """
        code = CodeRepository.get_by_id(db, code_id)
        if not code:
            return False

        CodeRepository.delete(db, code)
        db.commit()
        return True

    @staticmethod
    def delete_batch(db: Session, code_ids: list[str]) -> int:
        """
        批量删除激活码

        Args:
            db: 数据库会话
            code_ids: 激活码ID列表

        Returns:
            int: 删除的数量
        """
        count = CodeRepository.delete_batch(db, code_ids)
        db.commit()
        return count

    @staticmethod
    def update(db: Session, code: InvitationCode) -> InvitationCode:
        """
        更新激活码

        Args:
            db: 数据库会话
            code: 激活码对象

        Returns:
            InvitationCode: 更新后的激活码
        """
        updated = CodeRepository.update(db, code)
        db.commit()
        db.refresh(updated)
        return updated

    @staticmethod
    def update_by_id(
        db: Session,
        code_id: str,
        update_data: CodeUpdateRequest,
    ) -> InvitationCode:
        """
        根据ID更新激活码

        Args:
            db: 数据库会话
            code_id: 激活码ID
            update_data: 更新数据

        Returns:
            InvitationCode: 更新后的激活码

        Raises:
            CodeNotFoundError: 激活码不存在
        """
        code = CodeRepository.get_by_id(db, code_id)
        if not code:
            raise CodeNotFoundError(code_id)

        CodeService.refresh_expired_state(code)

        # 更新字段
        if update_data.is_disabled is not None:
            # 根据设计文档 code_status_logic.md 第 3.2 节和第 3.3 节：
            if update_data.is_disabled:  # 禁用操作
                # 前置条件：仅针对"未使用且未过期"的激活码
                if code.status:
                    raise ValueError("已使用的激活码不能禁用")
                if code.is_expired:
                    raise ValueError("已过期的激活码不能禁用")
            else:  # 启用操作
                # 前置条件：已禁用的激活码可以启用
                # 如果已过期，启用后自动变为已过期状态（is_expired 保持为 True）
                # 这里不需要额外检查，因为启用后如果已过期，is_expired 会保持为 True
                pass

            code.is_disabled = update_data.is_disabled

        # 更新过期时间
        if update_data.expires_at is not None:
            expires_at_datetime = timestamp_to_datetime(update_data.expires_at)
            code.expires_at = expires_at_datetime
            # 根据设计文档 code_status_logic.md 第 3.5 节：
            # 如果新时间未到，is_expired=False；如果新时间已过，is_expired=True
            now = datetime.utcnow()
            if expires_at_datetime is not None:
                code.is_expired = now > expires_at_datetime
            elif code.project and code.project.expires_at is not None:
                code.is_expired = now > code.project.expires_at
            else:
                code.is_expired = False

        updated = CodeRepository.update(db, code)
        db.commit()
        db.refresh(updated)
        return updated

    @staticmethod
    def batch_disable_unused(
        db: Session,
        project_id: str,
        status: Optional[bool] = None,
        is_disabled: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> int:
        """
        批量禁用未使用的激活码（根据筛选条件）

        Args:
            db: 数据库会话
            project_id: 项目ID
            status: 状态筛选（True=已使用, False=未使用），通常固定为 False
            is_disabled: 是否禁用筛选（True=已禁用, False=未禁用），通常固定为 False
            search: 搜索关键词（激活码）

        Returns:
            int: 禁用的数量

        Raises:
            ProjectNotFoundError: 项目不存在
        """
        # 检查项目是否存在
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        disabled = CodeRepository.batch_disable_unused(
            db=db,
            project_id=project_id,
            status=status,
            is_disabled=is_disabled,
            search=search,
        )
        db.commit()
        return disabled

    # 内部工具：基于 expires_at / project.expires_at 计算并刷新 is_expired
    @staticmethod
    def refresh_expired_state(code: InvitationCode) -> bool:
        """
        依据激活码自身/项目的过期时间，刷新 is_expired 字段。

        Returns:
            bool: 是否发生状态变更
        """
        now = datetime.utcnow()
        expires_at = code.expires_at or (code.project.expires_at if code.project else None)
        should_expire = bool(expires_at and now > expires_at)
        if code.is_expired != should_expire:
            code.is_expired = should_expire
            return True
        return False
