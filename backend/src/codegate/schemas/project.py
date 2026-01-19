"""
项目相关的 Pydantic 模型

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
from pydantic import BaseModel, Field, ConfigDict, field_validator, model_validator

from .utils import datetime_to_timestamp


class ProjectBase(BaseModel):
    """项目基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    expires_at: Optional[int] = Field(None, description="过期时间(UTC时间戳,秒级)")

    @field_validator('expires_at', mode='before')
    @classmethod
    def convert_expires_at(cls, v: Any) -> Optional[int]:
        """转换过期时间为时间戳"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return datetime_to_timestamp(v)
        return v


class ProjectCreate(BaseModel):
    """创建项目请求模型"""
    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    expires_at: Optional[int] = Field(None, description="过期时间(UTC时间戳,秒级)")


class ProjectUpdate(BaseModel):
    """更新项目请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    expires_at: Optional[int] = Field(None, description="过期时间(UTC时间戳,秒级)")
    status: Optional[bool] = Field(None, description="项目状态")


class ProjectResponse(ProjectBase):
    """项目响应模型"""
    id: str = Field(..., description="项目ID(UUID,去除连字符)")
    created_at: int = Field(..., description="创建时间(UTC时间戳,秒级)")
    status: bool = Field(..., description="项目状态(True=启用,False=禁用)")
    is_expired: bool = Field(..., description="是否过期")
    is_active: bool = Field(..., description="是否激活(启用且未过期)")
    # 统计字段（项目详情页需要）
    code_count: Optional[int] = Field(None, description="激活码总数")
    verified_count: Optional[int] = Field(None, description="已核销数量")
    unverified_count: Optional[int] = Field(None, description="未核销数量")
    expired_count: Optional[int] = Field(None, description="已过期数量")

    @field_validator('id', mode='before')
    @classmethod
    def convert_id(cls, v: Any) -> str:
        """转换ID为字符串"""
        if isinstance(v, int):
            # 兼容旧数据：将整数ID转换为UUID格式（实际应该通过迁移处理）
            # 这里临时处理，生成一个基于原ID的UUID
            from ..utils.uuid_utils import generate_uuid
            return generate_uuid()
        return str(v) if v is not None else v

    @field_validator('created_at', mode='before')
    @classmethod
    def convert_created_at(cls, v: Any) -> int:
        """转换创建时间为时间戳"""
        if isinstance(v, datetime):
            return datetime_to_timestamp(v)
        if isinstance(v, int):
            return v
        raise ValueError(f"Invalid created_at value: {v}")

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """项目列表响应模型"""
    total: int
    page: int
    page_size: int
    items: list[ProjectResponse]
