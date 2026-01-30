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

### 一键本地启动（前后端同时）

若希望一条命令同时启动前后端（便于本地开发或嵌入其他项目的启动流程），可使用脚本：

```bash
# 在仓库根目录执行
./scripts/start.sh
```

首次运行可先初始化数据库再启动：

```bash
./scripts/start.sh --init-db
```

脚本会以后台方式启动后端（8000）和前端（3000），按 `Ctrl+C` 会同时停止两者。  
**从其他项目引用**：可将此脚本作为子服务启动入口，通过环境变量指定 CodeGate 根目录后执行，例如：

```bash
export CODEGATE_ROOT=/path/to/codegate
"$CODEGATE_ROOT/scripts/start.sh"
```

依赖：本机需已安装 [uv](https://github.com/astral-sh/uv)（后端）和 [pnpm](https://pnpm.io/)（前端）。

**服务器/域名部署**：在仓库根目录创建 `.env.codegate`（可参考 `scripts/.env.codegate.example`），设置 `NEXT_PUBLIC_API_URL` 为浏览器可访问的后端 API 地址（如 `https://api.example.com`）；同时在 `backend/.env` 中设置 `CORS_ORIGINS`，包含前端访问域名（如 `["https://codegate.example.com"]`），否则登录后 Cookie 跨域会 401。也可通过 `CODEGATE_ENV_FILE` 指定 env 文件路径。

### Docker 部署

#### 方式一：源码构建（前后端分容器，适合本地/开发环境）

最小化部署：**1 个后端容器（SQLite）+ 1 个前端容器**，使用仓库内 Dockerfile 构建镜像（详情见 `deploy/README.md`）：

```bash
cd deploy
cp .env.example .env
docker compose up -d --build
```

此方式会在本地构建 `codegate-backend` / `codegate-frontend` 镜像，适合需要修改源码或二次开发的场景。

#### 方式二：一体化镜像（适合快速体验）

可直接拉取使用（无需本地构建）：

```bash
docker pull pfeak/codegate:0.1.0
```

快速启动一体化容器（前端 + 后端在同一容器中，默认端口：后端 `8876`、前端 `8877`）：

```bash
docker run -d \
  --name codegate \
  -p 8876:8876 \
  -p 8877:8877 \
  -v $(pwd)/data/codegate:/app/backend/data \
  pfeak/codegate:0.1.0
```

也可以使用仓库内的一体化 compose 配置（`deploy/onebox/docker-compose.yml`）。

启动后：

- 管理后台（前端）：`http://localhost:8877`
- 后端 API：`http://localhost:8876`
- API 文档：`http://localhost:8876/docs`

## 文档入口

- **后端**：`backend/README.md`
- **前端**：`frontend/README.md`
- **Docker 部署**：`deploy/README.md`
- **SDK**：`sdk/README.md`

## License

Apache License 2.0 - 详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)
