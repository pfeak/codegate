"""
邀请码相关的 Pydantic 模型

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
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class InvitationCodeBase(BaseModel):
    """邀请码基础模型"""
    code: str = Field(..., min_length=1, max_length=100, description="邀请码")


class InvitationCodeCreate(InvitationCodeBase):
    """创建邀请码请求模型"""
    project_id: int = Field(..., description="项目ID")


class InvitationCodeResponse(InvitationCodeBase):
    """邀请码响应模型"""
    id: int
    project_id: int
    status: bool
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    created_at: datetime
    is_expired: bool
    is_valid: bool

    model_config = ConfigDict(from_attributes=True)


class InvitationCodeListResponse(BaseModel):
    """邀请码列表响应模型"""
    total: int
    page: int
    page_size: int
    items: list[InvitationCodeResponse]


class CodeGenerateRequest(BaseModel):
    """批量生成邀请码请求模型"""
    count: int = Field(..., ge=1, le=10000, description="生成数量")
    length: Optional[int] = Field(None, ge=8, le=16, description="邀请码长度")
    prefix: Optional[str] = Field(None, max_length=10, description="前缀")
    suffix: Optional[str] = Field(None, max_length=10, description="后缀")
