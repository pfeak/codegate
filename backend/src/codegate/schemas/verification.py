"""
核销相关的 Pydantic 模型

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
from typing import Optional, Any
from pydantic import BaseModel, Field, field_validator

from .utils import datetime_to_timestamp


class VerificationRequest(BaseModel):
    """核销验证请求模型"""
    code: str = Field(..., min_length=1, max_length=100, description="激活码")
    verified_by: Optional[str] = Field(None, max_length=100, description="核销用户")


class VerificationResponse(BaseModel):
    """核销验证响应模型"""
    success: bool
    message: str
    code_id: Optional[str] = Field(None, description="激活码ID(UUID,去除连字符)")
    project_id: Optional[str] = Field(None, description="项目ID(UUID,去除连字符)")
    project_name: Optional[str] = None
    verified_at: Optional[int] = Field(None, description="核销时间(UTC时间戳,秒级)")

    @field_validator('code_id', 'project_id', mode='before')
    @classmethod
    def convert_id(cls, v: Any) -> Optional[str]:
        """转换ID为字符串"""
        if v is None:
            return None
        if isinstance(v, int):
            # 兼容旧数据
            from ..utils.uuid_utils import generate_uuid
            return generate_uuid()
        return str(v)

    @field_validator('verified_at', mode='before')
    @classmethod
    def convert_verified_at(cls, v: Any) -> Optional[int]:
        """转换核销时间为时间戳"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return datetime_to_timestamp(v)
        if isinstance(v, int):
            return v
        return None
