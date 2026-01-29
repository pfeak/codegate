# CodeGate Docker 部署（精简版）

本目录提供一键启动的最小部署方案：**1 个后端容器（SQLite）+ 1 个前端容器**。

## 目录结构

```shell
deploy/
├── backend/
│   └── Dockerfile          # 后端 Dockerfile（使用内置 SQLite）
├── frontend/
│   └── Dockerfile          # 前端 Dockerfile（Next.js）
├── docker-compose.yml      # 精简版 Compose（仅后端 + 前端）
├── .env.example            # 环境变量示例（只包含端口和 API 地址）
└── README.md               # 本文件
```

## 快速开始

### 1. 准备环境变量

```bash
cd deploy
cp .env.example .env
# 如有需要，编辑 .env 修改端口或 API 地址
```

### 2. 启动服务

```bash
# 构建并启动前后端
docker compose up -d --build

# 查看服务状态
docker compose ps
```

### 3. 访问服务

- **前端界面**: <http://localhost:3000>
- **后端 API**: <http://localhost:8000>
- **API 文档**: <http://localhost:8000/docs>

> 说明：后端默认使用容器内的 `SQLite` 数据库文件，并通过 `codegate-data` 卷持久化到宿主机。

## 常用命令

```bash
# 停止所有服务
docker compose down

# 仅重新构建某个服务
docker compose build backend
docker compose build frontend

# 查看某个服务日志
docker compose logs -f backend
docker compose logs -f frontend
```

## 环境变量说明（deploy/.env）

| 变量名 | 默认值 | 说明 |
|--------|--------|------|
| `BACKEND_PORT` | 8000 | 后端服务暴露到宿主机的端口 |
| `FRONTEND_PORT` | 3000 | 前端服务暴露到宿主机的端口 |
| `NEXT_PUBLIC_API_URL` | <http://localhost:8000> | 前端访问后端的 API 地址（浏览器看到的地址） |
