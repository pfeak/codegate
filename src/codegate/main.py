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
from fastapi import FastAPI, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import logging

from .config import settings
from .database import init_db
from .api import projects, codes, verify

# 配置日志
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

logger = logging.getLogger(__name__)

# 创建 FastAPI 应用
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="邀请码核销平台 API",
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
app.include_router(projects.router)
app.include_router(codes.router)
app.include_router(verify.router)

# 静态文件和模板
try:
    # 获取模板目录
    templates_path = Path(__file__).parent / "templates"
    if templates_path.exists():
        templates = Jinja2Templates(directory=str(templates_path))

        # 静态文件目录
        static_path = Path(__file__).parent / "static"
        if static_path.exists():
            app.mount("/static", StaticFiles(directory=str(static_path)), name="static")
    else:
        templates = None
        logger.warning("模板目录不存在，Web 界面将不可用")
except Exception as e:
    logger.warning(f"无法加载模板和静态文件: {e}")
    templates = None


@app.on_event("startup")
async def startup_event():
    """应用启动事件"""
    logger.info(f"启动 {settings.APP_NAME} v{settings.APP_VERSION}")
    # 初始化数据库
    init_db()
    logger.info("数据库初始化完成")


@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    """首页"""
    if templates:
        return templates.TemplateResponse("index.html", {"request": request})
    return HTMLResponse("<h1>CodeGate API</h1><p>请访问 <a href='/docs'>/docs</a> 查看 API 文档</p>")


@app.get("/projects", response_class=HTMLResponse)
async def projects_list(request: Request):
    """项目列表页面"""
    if templates:
        return templates.TemplateResponse("projects/list.html", {"request": request})
    return RedirectResponse(url="/docs")


@app.get("/projects/new", response_class=HTMLResponse)
async def project_new(request: Request):
    """创建项目页面"""
    if templates:
        return templates.TemplateResponse("projects/form.html", {"request": request, "project_id": None})
    return RedirectResponse(url="/docs")


@app.get("/projects/{project_id}", response_class=HTMLResponse)
async def project_detail(request: Request, project_id: int):
    """项目详情页面"""
    if templates:
        return templates.TemplateResponse("projects/detail.html", {"request": request, "project_id": project_id})
    return RedirectResponse(url="/docs")


@app.get("/projects/{project_id}/edit", response_class=HTMLResponse)
async def project_edit(request: Request, project_id: int):
    """编辑项目页面"""
    if templates:
        return templates.TemplateResponse("projects/form.html", {"request": request, "project_id": project_id})
    return RedirectResponse(url="/docs")


@app.get("/verify", response_class=HTMLResponse)
async def verify_page(request: Request):
    """核销验证页面"""
    if templates:
        return templates.TemplateResponse("verify/form.html", {"request": request})
    return RedirectResponse(url="/docs")


@app.get("/health")
async def health_check():
    """健康检查"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
    }
