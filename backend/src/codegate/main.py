"""
FastAPI 应用入口

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
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
import logging
from pathlib import Path

from .config import settings
from .database import init_db
from .api import projects, codes, verify, auth, dashboard, verification_logs, audit_logs


def configure_logging() -> None:
    """配置日志到 stdout + 可选文件"""
    handlers: list[logging.Handler] = [logging.StreamHandler()]
    if settings.LOG_FILE:
        log_file_path = Path(settings.LOG_FILE)
        log_file_path.parent.mkdir(parents=True, exist_ok=True)
        handlers.append(logging.FileHandler(log_file_path, encoding="utf-8"))

    logging.basicConfig(
        level=getattr(logging, settings.LOG_LEVEL),
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=handlers,
        force=True,  # 确保重复导入时也能写入文件
    )


configure_logging()
logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="激活码核销平台 API",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS 配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册 API 路由
app.include_router(auth.router)
app.include_router(dashboard.router)
app.include_router(projects.router)
app.include_router(codes.router)
app.include_router(codes.router_standalone)  # 独立的激活码API路由
app.include_router(verify.router)
app.include_router(verification_logs.router)
app.include_router(audit_logs.router)


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info(f"启动 {settings.APP_NAME} v{settings.APP_VERSION}")
    # 初始化数据库
    init_db()
    logger.info("数据库初始化完成")


@app.get("/")
async def index():
    """API 首页"""
    return HTMLResponse(
        ""
    )


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
