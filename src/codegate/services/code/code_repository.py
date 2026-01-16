"""
邀请码数据访问层

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


class CodeRepository:
    """邀请码数据访问层"""

    @staticmethod
    def create_batch(db: Session, codes: list[InvitationCode]) -> list[InvitationCode]:
        """
        批量创建邀请码

        Args:
            db: 数据库会话
            codes: 邀请码对象列表

        Returns:
            list[InvitationCode]: 创建的邀请码列表
        """
        db.add_all(codes)
        db.commit()
        for code in codes:
            db.refresh(code)
        return codes

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
        return db.query(InvitationCode).filter(InvitationCode.id == code_id).first()

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
        return db.query(InvitationCode).filter(InvitationCode.code == code).first()

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
        query = db.query(InvitationCode).filter(InvitationCode.project_id == project_id)

        # 状态筛选
        if status is not None:
            query = query.filter(InvitationCode.status == status)

        # 搜索筛选
        if search:
            query = query.filter(InvitationCode.code.contains(search))

        # 总数
        total = query.count()

        # 分页
        offset = (page - 1) * page_size
        codes = query.order_by(InvitationCode.created_at.desc()).offset(offset).limit(page_size).all()

        return codes, total

    @staticmethod
    def get_existing_codes(db: Session, project_id: int) -> set[str]:
        """
        获取项目下已存在的邀请码集合

        Args:
            db: 数据库会话
            project_id: 项目ID

        Returns:
            set[str]: 已存在的邀请码集合
        """
        codes = db.query(InvitationCode.code).filter(InvitationCode.project_id == project_id).all()
        return {code[0] for code in codes}

    @staticmethod
    def update(db: Session, code: InvitationCode) -> InvitationCode:
        """
        更新邀请码

        Args:
            db: 数据库会话
            code: 邀请码对象

        Returns:
            InvitationCode: 更新后的邀请码
        """
        db.commit()
        db.refresh(code)
        return code

    @staticmethod
    def delete(db: Session, code: InvitationCode) -> None:
        """
        删除邀请码

        Args:
            db: 数据库会话
            code: 邀请码对象
        """
        db.delete(code)
        db.commit()

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
        count = db.query(InvitationCode).filter(InvitationCode.id.in_(code_ids)).delete(synchronize_session=False)
        db.commit()
        return count
