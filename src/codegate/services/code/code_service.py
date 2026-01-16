"""
邀请码服务层

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
from sqlalchemy.orm import Session

from ...models.invitation_code import InvitationCode
from ...schemas.invitation_code import CodeGenerateRequest
from ...core.exceptions import ProjectNotFoundError
from ...core.constants import MAX_BATCH_GENERATE_COUNT
from ...utils.code_generator import generate_codes
from ..project.project_repository import ProjectRepository
from .code_repository import CodeRepository


class CodeService:
    """邀请码服务"""

    @staticmethod
    def generate(
        db: Session,
        project_id: int,
        request: CodeGenerateRequest,
    ) -> list[InvitationCode]:
        """
        批量生成邀请码

        Args:
            db: 数据库会话
            project_id: 项目ID
            request: 生成请求

        Returns:
            list[InvitationCode]: 生成的邀请码列表

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

        # 获取已存在的邀请码
        existing_codes = CodeRepository.get_existing_codes(db, project_id)

        # 生成新的邀请码
        new_codes = generate_codes(
            count=request.count,
            length=request.length,
            prefix=request.prefix,
            suffix=request.suffix,
            existing_codes=existing_codes,
        )

        # 创建邀请码对象
        invitation_codes = [
            InvitationCode(
                project_id=project_id,
                code=code,
                status=False,
            )
            for code in new_codes
        ]

        return CodeRepository.create_batch(db, invitation_codes)

    @staticmethod
    def get_by_id(db: Session, code_id: int) -> Optional[InvitationCode]:
        """
        根据ID获取邀请码

        Args:
            db: 数据库会话
            code_id: 邀请码ID

        Returns:
            Optional[InvitationCode]: 邀请码对象，不存在返回 None
        """
        return CodeRepository.get_by_id(db, code_id)

    @staticmethod
    def get_by_code(db: Session, code: str) -> Optional[InvitationCode]:
        """
        根据邀请码字符串获取邀请码

        Args:
            db: 数据库会话
            code: 邀请码字符串

        Returns:
            Optional[InvitationCode]: 邀请码对象，不存在返回 None
        """
        return CodeRepository.get_by_code(db, code)

    @staticmethod
    def get_list(
        db: Session,
        project_id: int,
        page: int = 1,
        page_size: int = 50,
        status: Optional[bool] = None,
        search: Optional[str] = None,
    ) -> tuple[list[InvitationCode], int]:
        """
        获取邀请码列表

        Args:
            db: 数据库会话
            project_id: 项目ID
            page: 页码
            page_size: 每页数量
            status: 状态筛选（True=已核销, False=未核销）
            search: 搜索关键词（邀请码）

        Returns:
            tuple[list[InvitationCode], int]: (邀请码列表, 总数)
        """
        return CodeRepository.get_list(db, project_id, page, page_size, status, search)

    @staticmethod
    def delete(db: Session, code_id: int) -> bool:
        """
        删除邀请码

        Args:
            db: 数据库会话
            code_id: 邀请码ID

        Returns:
            bool: 是否删除成功
        """
        code = CodeRepository.get_by_id(db, code_id)
        if not code:
            return False

        CodeRepository.delete(db, code)
        return True

    @staticmethod
    def delete_batch(db: Session, code_ids: list[int]) -> int:
        """
        批量删除邀请码

        Args:
            db: 数据库会话
            code_ids: 邀请码ID列表

        Returns:
            int: 删除的数量
        """
        return CodeRepository.delete_batch(db, code_ids)
