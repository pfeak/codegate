"""
激活码相关的 Pydantic 模型

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
from pydantic import BaseModel, Field, ConfigDict, field_validator

from .utils import datetime_to_timestamp


class InvitationCodeBase(BaseModel):
    """激活码基础模型"""
    code: str = Field(..., min_length=1, max_length=100, description="激活码")


class InvitationCodeCreate(InvitationCodeBase):
    """创建激活码请求模型"""
    project_id: str = Field(..., description="项目ID(UUID,去除连字符)")


class InvitationCodeResponse(InvitationCodeBase):
    """激活码响应模型"""
    id: str = Field(..., description="激活码ID(UUID,去除连字符)")
    project_id: str = Field(..., description="项目ID(UUID,去除连字符)")
    status: bool = Field(..., description="状态(False=未使用,True=已使用)")
    is_disabled: bool = Field(..., description="是否禁用(False=启用,True=禁用)")
    expires_at: Optional[int] = Field(None, description="过期时间(UTC时间戳,秒级,可选,为空则使用项目有效期)")
    verified_at: Optional[int] = Field(None, description="核销时间(UTC时间戳,秒级)")
    verified_by: Optional[str] = Field(None, description="核销用户")
    created_at: int = Field(..., description="创建时间(UTC时间戳,秒级)")
    is_expired: bool = Field(..., description="是否过期")
    is_valid: bool = Field(..., description="是否有效")

    @field_validator('id', 'project_id', mode='before')
    @classmethod
    def convert_id(cls, v: Any) -> str:
        """转换ID为字符串"""
        if isinstance(v, int):
            # 兼容旧数据：将整数ID转换为UUID格式
            from ..utils.uuid_utils import generate_uuid
            return generate_uuid()
        return str(v) if v is not None else v

    @field_validator('created_at', 'verified_at', 'expires_at', mode='before')
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

    model_config = ConfigDict(from_attributes=True)


class InvitationCodeListResponse(BaseModel):
    """激活码列表响应模型"""
    total: int
    page: int
    page_size: int
    items: list[InvitationCodeResponse]


class CodeGenerateRequest(BaseModel):
    """批量生成激活码请求模型"""
    count: int = Field(..., ge=1, le=10000, description="生成数量")
    length: Optional[int] = Field(None, ge=8, le=16, description="激活码长度")
    prefix: Optional[str] = Field(None, max_length=10, description="前缀")
    suffix: Optional[str] = Field(None, max_length=10, description="后缀")
    expires_at: Optional[int] = Field(None, description="过期时间(UTC时间戳,秒级,可选,为空则使用项目有效期)")


class CodeUpdateRequest(BaseModel):
    """更新激活码请求模型"""
    is_disabled: Optional[bool] = Field(None, description="是否禁用(False=启用,True=禁用)")
    expires_at: Optional[int] = Field(None, description="过期时间(UTC时间戳,秒级,可选,为空则使用项目有效期)")


class BatchDisableUnusedRequest(BaseModel):
    """批量禁用未使用激活码请求模型"""
    status: bool = Field(False, description="状态筛选(False=未使用,仅禁用未使用的激活码)")


class BatchDisableUnusedResponse(BaseModel):
    """批量禁用未使用激活码响应模型"""
    success: bool = Field(True, description="是否成功")
    message: str = Field(..., description="提示信息")
    disabled_count: int = Field(..., description="禁用的数量")
