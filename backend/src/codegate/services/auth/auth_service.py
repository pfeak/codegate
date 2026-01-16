"""
认证服务

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
import bcrypt

from ...models.admin import Admin
from ...schemas.auth import LoginRequest
from .auth_repository import AuthRepository


class AuthService:
    """认证服务"""

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """
        验证密码

        Args:
            plain_password: 明文密码
            hashed_password: 哈希密码

        Returns:
            bool: 密码是否正确
        """
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

    @staticmethod
    def hash_password(password: str) -> str:
        """
        哈希密码

        Args:
            password: 明文密码

        Returns:
            str: 哈希密码
        """
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')

    @staticmethod
    def authenticate(db: Session, request: LoginRequest) -> Optional[Admin]:
        """
        验证用户身份

        Args:
            db: 数据库会话
            request: 登录请求

        Returns:
            Optional[Admin]: 管理员对象，验证失败返回 None
        """
        admin = AuthRepository.get_by_username(db, request.username)
        if not admin:
            return None

        if not AuthService.verify_password(request.password, admin.password_hash):
            return None

        # 更新最后登录时间
        AuthRepository.update_last_login(db, admin)
        return admin

    @staticmethod
    def get_by_id(db: Session, admin_id: str) -> Optional[Admin]:
        """
        根据ID获取管理员

        Args:
            db: 数据库会话
            admin_id: 管理员ID

        Returns:
            Optional[Admin]: 管理员对象，不存在返回 None
        """
        from sqlalchemy import select
        stmt = select(Admin).where(Admin.id == admin_id)
        result = db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def check_initial_password(db: Session, admin_id: str) -> bool:
        """
        检查管理员是否使用初始密码

        Args:
            db: 数据库会话
            admin_id: 管理员ID

        Returns:
            bool: 是否使用初始密码
        """
        admin = AuthService.get_by_id(db, admin_id)
        if not admin:
            return False
        return admin.is_initial_password

    @staticmethod
    def change_password(
        db: Session,
        admin_id: str,
        old_password: str,
        new_password: str,
    ) -> Admin:
        """
        修改管理员密码

        Args:
            db: 数据库会话
            admin_id: 管理员ID
            old_password: 当前密码
            new_password: 新密码

        Returns:
            Admin: 更新后的管理员对象

        Raises:
            ValueError: 当前密码错误或新密码不符合要求
        """
        admin = AuthService.get_by_id(db, admin_id)
        if not admin:
            raise ValueError("管理员不存在")

        # 验证当前密码
        if not AuthService.verify_password(old_password, admin.password_hash):
            raise ValueError("当前密码错误")

        # 验证新密码复杂度
        if len(new_password) < 8:
            raise ValueError("新密码长度至少8位")
        if not any(c.isalpha() for c in new_password):
            raise ValueError("新密码必须包含字母")
        if not any(c.isdigit() for c in new_password):
            raise ValueError("新密码必须包含数字")

        # 更新密码
        admin.password_hash = AuthService.hash_password(new_password)
        admin.is_initial_password = False  # 标记为已修改初始密码
        db.commit()
        db.refresh(admin)
        return admin
