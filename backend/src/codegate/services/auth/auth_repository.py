"""
认证数据访问层

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
from sqlalchemy import select

from ...models.admin import Admin


class AuthRepository:
    """认证数据访问层"""

    @staticmethod
    def get_by_username(db: Session, username: str) -> Optional[Admin]:
        """
        根据用户名获取管理员

        Args:
            db: 数据库会话
            username: 用户名

        Returns:
            Optional[Admin]: 管理员对象，不存在返回 None
        """
        stmt = select(Admin).where(Admin.username == username)
        result = db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def create(db: Session, admin: Admin) -> Admin:
        """
        创建管理员

        Args:
            db: 数据库会话
            admin: 管理员对象

        Returns:
            Admin: 创建的管理员对象
        """
        db.add(admin)
        return admin

    @staticmethod
    def update_last_login(db: Session, admin: Admin) -> Admin:
        """
        更新最后登录时间

        Args:
            db: 数据库会话
            admin: 管理员对象

        Returns:
            Admin: 更新后的管理员对象
        """
        from datetime import datetime
        admin.last_login_at = datetime.utcnow()
        return admin

    @staticmethod
    def update_password(db: Session, admin: Admin, password_hash: str) -> Admin:
        """
        更新密码

        Args:
            db: 数据库会话
            admin: 管理员对象
            password_hash: 新密码哈希

        Returns:
            Admin: 更新后的管理员对象
        """
        admin.password_hash = password_hash
        admin.is_initial_password = False
        return admin
