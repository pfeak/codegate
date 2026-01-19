"""
激活码数据访问层

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
    """激活码数据访问层"""

    @staticmethod
    def create_batch(db: Session, codes: list[InvitationCode]) -> list[InvitationCode]:
        """
        批量创建激活码

        Args:
            db: 数据库会话
            codes: 激活码对象列表

        Returns:
            list[InvitationCode]: 创建的激活码列表
        """
        db.add_all(codes)
        db.commit()
        for code in codes:
            db.refresh(code)
        return codes

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
        return db.query(InvitationCode).filter(InvitationCode.id == code_id).first()

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
        return db.query(InvitationCode).filter(InvitationCode.code == code).first()

    @staticmethod
    def get_list(
        db: Session,
        project_id: str,
        page: int = 1,
        page_size: int = 50,
        status: Optional[bool] = None,
        is_disabled: Optional[bool] = None,
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
            search: 搜索关键词（激活码）

        Returns:
            tuple[list[InvitationCode], int]: (激活码列表, 总数)
        """
        query = db.query(InvitationCode).filter(InvitationCode.project_id == project_id)

        # 状态筛选
        if status is not None:
            query = query.filter(InvitationCode.status == status)

        # 禁用状态筛选
        if is_disabled is not None:
            query = query.filter(InvitationCode.is_disabled == is_disabled)

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
    def get_existing_codes(db: Session, project_id: str) -> set[str]:
        """
        获取项目下已存在的激活码集合

        Args:
            db: 数据库会话
            project_id: 项目ID

        Returns:
            set[str]: 已存在的激活码集合
        """
        codes = db.query(InvitationCode.code).filter(InvitationCode.project_id == project_id).all()
        return {code[0] for code in codes}

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
        db.commit()
        db.refresh(code)
        return code

    @staticmethod
    def delete(db: Session, code: InvitationCode) -> None:
        """
        删除激活码

        Args:
            db: 数据库会话
            code: 激活码对象
        """
        db.delete(code)
        db.commit()

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
        count = db.query(InvitationCode).filter(InvitationCode.id.in_(code_ids)).delete(synchronize_session=False)
        db.commit()
        return count

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
        """
        query = db.query(InvitationCode).filter(
            InvitationCode.project_id == project_id,
            InvitationCode.status == False,  # 仅未使用的激活码
            InvitationCode.is_disabled == False,  # 仅未禁用的激活码
            InvitationCode.is_expired == False,  # 仅未过期的激活码（根据设计文档 code_status_logic.md 第 6.1 节）
        )

        # 应用搜索筛选条件
        if search:
            query = query.filter(InvitationCode.code.contains(search))

        # 批量更新
        count = query.update({"is_disabled": True}, synchronize_session=False)
        db.commit()
        return count

    @staticmethod
    def count_disable_unused(
        db: Session,
        project_id: str,
        search: Optional[str] = None,
    ) -> int:
        """
        统计当前筛选条件下可被“批量禁用”的激活码数量。

        规则与 batch_disable_unused 一致：
        - 未使用（status=False）
        - 未禁用（is_disabled=False）
        - 未过期（is_expired=False）
        - 可选：按 code 模糊搜索
        """
        query = db.query(InvitationCode).filter(
            InvitationCode.project_id == project_id,
            InvitationCode.status == False,
            InvitationCode.is_disabled == False,
            InvitationCode.is_expired == False,
        )
        if search:
            query = query.filter(InvitationCode.code.contains(search))
        return query.count()
