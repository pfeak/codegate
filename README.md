# CodeGate

CodeGate 是一个轻量级 Python 后端服务，专注于 **激活码、邀请码、验证码（OTP）** 的生成、过期、验证和管理。它提供 **REST API** 和 **Python SDK**，可以 **独立运行** 或 **嵌入其他系统**，非常适合 **SaaS 平台、移动应用、游戏、会员管理系统** 等场景。

## 项目初衷

开发项目会遇到反复重新开发邀请码、激活码模块，为了提高效率、避免重复劳动，本项目抽象并实现了通用的激活码/邀请码/验证码服务。致力于：

- **高可复用性**：项目间可直接集成，解耦业务，仅需少量配置即可使用。
- **接口易用性**：同时提供 REST API、Web 管理后台和 Python/JS 等主流 SDK（如果有其他语言 SDK 需求，欢迎提 issue、pr）。
- **低侵入性**：不依赖具体业务，只关注激活码全生命周期管理，兼容多种上游系统。

## 截图预览

![CodeGate 截图 1](docs/image-20260129-1.png)

![CodeGate 截图 2](docs/image-20260129-2.png)

![CodeGate 截图 3](docs/image-20260129-3.png)

## 功能特性

- **项目管理**：创建、更新、查询、删除项目，支持项目级别的激活码管理，支持启用/禁用项目
- **批量生成激活码**：支持自定义格式（长度、前缀、后缀），支持为激活码设置独立的过期时间
- **激活码管理**：支持激活码的禁用/启用操作（单个和批量），支持重新激活已使用的激活码
- **激活码验证/核销**：通过 API 或界面进行核销验证，支持防重复核销，自动检查过期状态
- **自动过期管理**：基于项目有效期或激活码独立过期时间自动检查，定时任务自动更新过期状态
- **管理员认证**：安全的管理员登录系统，使用安全 Cookie 进行权限验证，支持首次登录强制修改密码
- **个人管理**：管理员可以修改自己的密码，查看个人信息
- **项目概览**：提供全局统计信息和最近核销记录
- **Web UI 和 REST API**：提供 Web 界面和 RESTful API 两种使用方式
- **状态管理**：完善的激活码状态管理（未使用/已使用、启用/禁用、未过期/已过期）

## 技术栈

- **后端**: Python 3.12+, FastAPI, SQLAlchemy ORM
- **数据库**: SQLite / PostgreSQL（可选）
- **前端**: Next.js（React）+ Tailwind CSS
- **部署**: Docker / docker compose（见 `deploy/`）
- **API 文档**: FastAPI 自动生成 OpenAPI/Swagger 文档（`/docs`、`/redoc`）

## 快速开始

本仓库包含三部分：

- **后端服务**：`backend/`
- **前端站点**：`frontend/`
- **SDK**：`sdk/`（JavaScript + Python，如果有其他语言 SDK 需求，欢迎提 issue、pr）

### 启动后端（开发）

```bash
cd backend
uv sync

cp .env.example .env
# 如需切换数据库/端口等，编辑 .env

# 首次运行初始化数据库（会创建默认管理员账号）
uv run python -c "from src.codegate.database import init_db; init_db()"

# 启动开发服务器
uv run python main.py
```

后端服务默认启动在 `http://localhost:8000`：

- **API 文档**: `http://localhost:8000/docs`
- **健康检查**: `http://localhost:8000/health`

### 启动前端（开发）

```bash
cd frontend
pnpm install

# 让前端指向你的后端地址（浏览器可访问的地址）
export NEXT_PUBLIC_API_URL="http://localhost:8000"

pnpm dev
```

前端默认启动在 `http://localhost:3000`。

### 一键 Docker 启动（推荐用于本地/演示）

最小化部署：**1 个后端容器（SQLite）+ 1 个前端容器**，见 `deploy/README.md`：

```bash
cd deploy
cp .env.example .env
docker compose up -d --build
```

## 文档入口

- **后端**：`backend/README.md`
- **前端**：`frontend/README.md`
- **Docker 部署**：`deploy/README.md`
- **SDK**：`sdk/README.md`

## License

Apache License 2.0 - 详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)
