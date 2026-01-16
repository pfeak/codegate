"""
项目概览相关的 Pydantic 模型

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


class RecentVerification(BaseModel):
    """最近核销记录"""
    code_id: str = Field(..., description="激活码ID(UUID,去除连字符)")
    code: str = Field(..., description="激活码")
    project_id: str = Field(..., description="项目ID(UUID,去除连字符)")
    project_name: str = Field(..., description="项目名称")
    verified_at: int = Field(..., description="核销时间(UTC时间戳,秒级)")
    verified_by: Optional[str] = Field(None, description="核销用户")

    @field_validator('code_id', 'project_id', mode='before')
    @classmethod
    def convert_id(cls, v: Any) -> str:
        """转换ID为字符串"""
        if isinstance(v, int):
            from ..utils.uuid_utils import generate_uuid
            return generate_uuid()
        return str(v) if v is not None else v

    @field_validator('verified_at', mode='before')
    @classmethod
    def convert_verified_at(cls, v: Any) -> int:
        """转换核销时间为时间戳"""
        if isinstance(v, datetime):
            return datetime_to_timestamp(v)
        if isinstance(v, int):
            return v
        raise ValueError(f"Invalid verified_at value: {v}")


class DashboardOverviewResponse(BaseModel):
    """项目概览响应模型"""
    project_count: int = Field(..., description="项目总数")
    code_count: int = Field(..., description="激活码总数")
    verified_count: int = Field(..., description="已使用数量")
    unverified_count: int = Field(..., description="未使用数量")
    recent_verifications: list[RecentVerification] = Field(default_factory=list, description="最近核销记录")
