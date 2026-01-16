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
from typing import Optional
from pydantic import BaseModel, Field


class VerificationRequest(BaseModel):
    """核销验证请求模型"""
    code: str = Field(..., min_length=1, max_length=100, description="邀请码")
    verified_by: Optional[str] = Field(None, max_length=100, description="核销用户")


class VerificationResponse(BaseModel):
    """核销验证响应模型"""
    success: bool
    message: str
    code_id: Optional[int] = None
    project_id: Optional[int] = None
    project_name: Optional[str] = None
    verified_at: Optional[datetime] = None
