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
    # 数据库类型：sqlite | postgresql
    DATABASE_TYPE: str = "sqlite"

    # SQLite 配置（当 DATABASE_TYPE=sqlite 时使用）
    DATABASE_URL: str = "sqlite:///./codegate.db"

    # PostgreSQL 配置（当 DATABASE_TYPE=postgresql 时使用）
    # 格式：postgresql://user:password@host:port/dbname
    # 或：postgresql+psycopg2://user:password@host:port/dbname
    POSTGRESQL_HOST: str = "localhost"
    POSTGRESQL_PORT: int = 5432
    POSTGRESQL_USER: str = "postgres"
    POSTGRESQL_PASSWORD: str = ""
    POSTGRESQL_DB: str = "codegate"
    POSTGRESQL_URL: Optional[str] = None  # 如果设置了此值，将优先使用此 URL

    DATABASE_ECHO: bool = False

    # 应用配置
    APP_NAME: str = "CodeGate"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False

    # 日志配置
    LOG_LEVEL: str = "INFO"
    LOG_FILE: Optional[str] = None

    # 激活码配置
    CODE_DEFAULT_LENGTH: int = 12
    CODE_CHARSET: str = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 排除易混淆字符

    # 安全配置
    # 注意：当 allow_credentials=True 时，CORS 不允许使用 "*" 通配符，
    # 必须显式列出允许的前端来源（origin），否则浏览器会在携带 Cookie 的请求上直接拦截。
    # 默认开发环境允许本机前端：
    # - http://localhost:3000  （Next.js dev server）
    # 如需新增来源，请通过环境变量覆盖 CORS_ORIGINS，例如：
    #   CORS_ORIGINS='["http://localhost:3000","http://127.0.0.1:3000"]'
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 60

    # 文件上传配置
    MAX_UPLOAD_SIZE: int = 10 * 1024 * 1024  # 10MB

    # 会话配置
    SESSION_BACKEND: str = "memory"  # memory | redis
    SESSION_REDIS_URL: Optional[str] = None
    SESSION_TTL_SECONDS: int = 86400 * 7  # 默认 7 天

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# 全局配置实例
settings = Settings()
