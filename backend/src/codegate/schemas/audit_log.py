"""
审计日志相关的 Pydantic 模型

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


class AuditLogItem(BaseModel):
    """审计日志条目（用于列表展示）"""

    id: str = Field(..., description="日志ID（UUID，去除连字符）")
    action: str = Field(..., description="操作类型")
    actor_id: Optional[str] = Field(None, description="操作人ID")
    actor_type: Literal["admin", "system", "external"] = Field(..., description="操作人类型")
    actor_username: Optional[str] = Field(None, description="操作人用户名（管理员）")
    resource_type: Optional[str] = Field(None, description="资源类型")
    resource_id: Optional[str] = Field(None, description="资源ID")
    resource_name: Optional[str] = Field(None, description="资源名称（如项目名称、激活码）")
    result: Literal["success", "failed"] = Field(..., description="操作结果")
    ip_address: Optional[str] = Field(None, description="客户端IP地址")
    user_agent: Optional[str] = Field(None, description="用户代理")
    details: Optional[str] = Field(None, description="操作详情（JSON文本）")
    created_at: int = Field(..., description="创建时间（UTC时间戳，秒级）")

    @field_validator("id", "actor_id", "resource_id", mode="before")
    @classmethod
    def convert_id(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        return str(v)

    @field_validator("created_at", mode="before")
    @classmethod
    def convert_created_at(cls, v: Any) -> int:
        if isinstance(v, datetime):
            ts = datetime_to_timestamp(v)
            if ts is None:
                raise ValueError("created_at is None")
            return ts
        if isinstance(v, int):
            return v
        raise ValueError(f"Invalid created_at value: {v}")


class AuditLogListResponse(BaseModel):
    """审计日志列表响应"""

    total: int = Field(..., description="总数")
    page: int = Field(..., description="页码")
    page_size: int = Field(..., description="每页数量")
    items: list[AuditLogItem] = Field(default_factory=list, description="日志列表")
