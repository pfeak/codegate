"""
核销日志相关的 Pydantic 模型

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
from typing import Optional, Any, Literal

from pydantic import BaseModel, Field, field_validator

from .utils import datetime_to_timestamp


class VerificationLogItem(BaseModel):
    """核销日志条目（用于列表展示）"""

    id: str = Field(..., description="日志ID(UUID,去除连字符)")
    code_id: str = Field(..., description="激活码ID(UUID,去除连字符)")
    code: str = Field(..., description="激活码")
    project_id: str = Field(..., description="项目ID(UUID,去除连字符)")
    project_name: str = Field(..., description="项目名称")

    verified_at: int = Field(..., description="核销时间(UTC时间戳,秒级)")
    verified_by: Optional[str] = Field(None, description="核销用户")
    result: Literal["success", "failed"] = Field(..., description="核销结果")
    reason: Optional[str] = Field(None, description="失败原因")

    @field_validator("id", "code_id", "project_id", mode="before")
    @classmethod
    def convert_id(cls, v: Any) -> str:
        if isinstance(v, int):
            from ..utils.uuid_utils import generate_uuid

            return generate_uuid()
        return str(v) if v is not None else v

    @field_validator("verified_at", mode="before")
    @classmethod
    def convert_verified_at(cls, v: Any) -> int:
        if isinstance(v, datetime):
            ts = datetime_to_timestamp(v)
            if ts is None:
                raise ValueError("verified_at is None")
            return ts
        if isinstance(v, int):
            return v
        raise ValueError(f"Invalid verified_at value: {v}")


class VerificationLogListResponse(BaseModel):
    """核销日志列表响应"""

    total: int = Field(..., description="总数")
    page: int = Field(..., description="页码")
    page_size: int = Field(..., description="每页数量")
    items: list[VerificationLogItem] = Field(default_factory=list, description="日志列表")
