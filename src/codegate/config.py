"""
配置管理模块

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
import os
from pathlib import Path
from typing import Optional

try:
    from pydantic_settings import BaseSettings
except ImportError:
    # 兼容旧版本的 pydantic
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """应用配置"""

    # 数据库配置
    DATABASE_URL: str = "sqlite:///./codegate.db"
    DATABASE_ECHO: bool = False

    # 应用配置
    APP_NAME: str = "CodeGate"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None

    # 邀请码配置
    CODE_DEFAULT_LENGTH: int = 12
    CODE_CHARSET: str = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 排除易混淆字符

    # 安全配置
    CORS_ORIGINS: list[str] = ["*"]
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # 文件上传配置
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 全局配置实例
settings = Settings()
