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
from typing import Optional
from pydantic import BaseModel, Field, ConfigDict


class ProjectBase(BaseModel):
    """项目基础模型"""
    name: str = Field(..., min_length=1, max_length=100, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    expires_at: Optional[datetime] = Field(None, description="过期时间")


class ProjectCreate(ProjectBase):
    """创建项目请求模型"""
    pass


class ProjectUpdate(BaseModel):
    """更新项目请求模型"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="项目名称")
    description: Optional[str] = Field(None, description="项目描述")
    expires_at: Optional[datetime] = Field(None, description="过期时间")
    status: Optional[bool] = Field(None, description="项目状态")


class ProjectResponse(ProjectBase):
    """项目响应模型"""
    id: int
    created_at: datetime
    status: bool
    is_expired: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class ProjectListResponse(BaseModel):
    """项目列表响应模型"""
    total: int
    page: int
    page_size: int
    items: list[ProjectResponse]
