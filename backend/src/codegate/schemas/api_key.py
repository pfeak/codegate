"""
API Key 相关 Pydantic 模型

Copyright 2026 pfeak
"""
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, Field, ConfigDict, field_validator

from .utils import datetime_to_timestamp


class ApiKeyBase(BaseModel):
    """API Key 基础模型"""
    name: Optional[str] = Field(None, max_length=100, description="API Key 名称（可选）")


class ApiKeyCreateRequest(ApiKeyBase):
    """生成/刷新 API Key 请求模型"""
    project_id: str = Field(..., description="项目ID(UUID,去除连字符)")


class ApiKeyToggleRequest(BaseModel):
    """禁用/启用 API Key 请求模型"""
    is_active: bool = Field(..., description="是否启用")


class ApiKeyResponse(ApiKeyBase):
    """API Key 响应模型（不包含 secret）"""
    id: str = Field(..., description="API Key 记录ID(UUID,去除连字符)")
    project_id: str = Field(..., description="项目ID(UUID,去除连字符)")
    api_key: str = Field(..., min_length=32, max_length=32, description="API Key")
    is_active: bool = Field(..., description="是否启用")
    last_used_at: Optional[int] = Field(None, description="最后使用时间(UTC时间戳,秒级)")
    created_at: int = Field(..., description="创建时间(UTC时间戳,秒级)")
    created_by: str = Field(..., description="创建者ID(UUID,去除连字符)")

    model_config = ConfigDict(from_attributes=True)

    @field_validator("last_used_at", "created_at", mode="before")
    @classmethod
    def convert_timestamps(cls, v: Any) -> Optional[int]:
        """转换时间字段为时间戳"""
        if v is None:
            return None
        if isinstance(v, datetime):
            return datetime_to_timestamp(v)
        if isinstance(v, int):
            return v
        return None


class ApiKeyWithSecretResponse(ApiKeyResponse):
    """包含 secret 的响应模型（仅生成/刷新时返回）"""
    secret: str = Field(..., min_length=64, max_length=64, description="Secret（仅生成/刷新时返回）")


class ApiKeyListResponse(BaseModel):
    """API Key 列表响应"""
    items: list[ApiKeyResponse]
    total: int
