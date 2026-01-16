"""
枚举定义模块

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
from enum import Enum


class ProjectStatus(str, Enum):
    """项目状态枚举"""
    ENABLED = "enabled"  # 启用
    DISABLED = "disabled"  # 禁用


class CodeStatus(str, Enum):
    """邀请码状态枚举"""
    UNVERIFIED = "unverified"  # 未核销
    VERIFIED = "verified"  # 已核销
    EXPIRED = "expired"  # 已过期


class VerificationResult(str, Enum):
    """核销结果枚举"""
    SUCCESS = "success"  # 成功
    FAILED = "failed"  # 失败


class VerificationFailureReason(str, Enum):
    """核销失败原因枚举"""
    CODE_NOT_FOUND = "code_not_found"  # 邀请码不存在
    CODE_ALREADY_VERIFIED = "code_already_verified"  # 邀请码已核销
    CODE_EXPIRED = "code_expired"  # 邀请码已过期
    PROJECT_DISABLED = "project_disabled"  # 项目已禁用
    PROJECT_EXPIRED = "project_expired"  # 项目已过期
