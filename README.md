# CodeGate

轻量级激活码/邀请码/验证码分发平台，提供激活码/邀请码/验证码生成、管理和激活功能。

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
- **数据库**: SQLite（WAL 模式，支持并发读写）
- **前端**: Jinja2 模板引擎 + Tailwind CSS + FontAwesome 图标
- **工具**: FileLock（文件锁，用于 SQLite 并发控制）、typer（CLI 工具）
- **API 文档**: FastAPI 自动生成 OpenAPI/Swagger 文档

## 快速开始

### 安装依赖

```bash
# 使用 uv 安装依赖
uv sync
```

### 运行服务

```bash
# 启动开发服务器
uv run python main.py
```

服务将在 `http://localhost:8000` 启动。

### 访问界面

- **Web 界面**: http://localhost:8000
- **API 文档**: http://localhost:8000/docs (Swagger UI)
- **API 文档**: http://localhost:8000/redoc (ReDoc)

## License

Apache License 2.0 - 详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)
