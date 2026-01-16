"""
认证相关的 Pydantic 模型

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
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from .utils import datetime_to_timestamp


class LoginRequest(BaseModel):
    """登录请求模型"""
    username: str = Field(..., min_length=1, max_length=100, description="用户名")
    password: str = Field(..., min_length=1, description="密码")


class ChangePasswordRequest(BaseModel):
    """修改密码请求模型"""
    old_password: str = Field(..., min_length=1, description="当前密码")
    new_password: str = Field(..., min_length=8, description="新密码（至少8位，包含字母和数字）")
    confirm_password: str = Field(..., min_length=8, description="确认新密码")

    @field_validator('new_password')
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        """验证新密码复杂度"""
        if len(v) < 8:
            raise ValueError("新密码长度至少8位")
        if not any(c.isalpha() for c in v):
            raise ValueError("新密码必须包含字母")
        if not any(c.isdigit() for c in v):
            raise ValueError("新密码必须包含数字")
        return v

    @field_validator('confirm_password')
    @classmethod
    def validate_confirm_password(cls, v: str, info) -> str:
        """验证确认密码是否一致"""
        if 'new_password' in info.data and v != info.data['new_password']:
            raise ValueError("确认密码与新密码不一致")
        return v


class AdminResponse(BaseModel):
    """管理员响应模型"""
    id: str = Field(..., description="管理员ID(UUID,去除连字符)")
    username: str = Field(..., description="用户名")
    created_at: int = Field(..., description="创建时间(UTC时间戳,秒级)")
    last_login_at: Optional[int] = Field(None, description="最后登录时间(UTC时间戳,秒级)")
    is_initial_password: bool = Field(True, description="是否使用初始密码")

    @field_validator('id', mode='before')
    @classmethod
    def convert_id(cls, v: Any) -> str:
        """转换ID为字符串"""
        if isinstance(v, int):
            from ..utils.uuid_utils import generate_uuid
            return generate_uuid()
        return str(v) if v is not None else v

    @field_validator('created_at', 'last_login_at', mode='before')
    @classmethod
    def convert_timestamps(cls, v: Any) -> Optional[int]:
        """转换时间戳"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return datetime_to_timestamp(v)
        if isinstance(v, int):
            return v
        return None

    class Config:
        from_attributes = True
