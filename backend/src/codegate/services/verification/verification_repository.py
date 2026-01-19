"""
核销数据访问层

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

from ...models.verification_log import VerificationLog


class VerificationRepository:
    """核销数据访问层"""

    @staticmethod
    def create(db: Session, log: VerificationLog) -> VerificationLog:
        """
        创建核销日志

        Args:
            db: 数据库会话
            log: 核销日志对象

        Returns:
            VerificationLog: 创建的核销日志
        """
        db.add(log)
        db.commit()
        db.refresh(log)
        return log

    @staticmethod
    def get_list(
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
        query = db.query(VerificationLog)

        if code_id is not None:
            query = query.filter(VerificationLog.code_id == code_id)

        total = query.count()
        offset = (page - 1) * page_size
        logs = query.order_by(VerificationLog.verified_at.desc()).offset(offset).limit(page_size).all()

        return logs, total
