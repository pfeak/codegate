# CodeGate Backend

激活码/邀请码/验证码分发平台后端服务

## 快速开始

> 后端默认监听 `0.0.0.0:8000`，本地访问地址通常为 `http://localhost:8000`。

### 安装依赖

```bash
cd backend
uv sync
```

### 数据库配置

CodeGate 支持两种数据库：**SQLite** 和 **PostgreSQL**。

复制示例配置文件并根据需要修改：

```bash
cp .env.example .env
```

详细配置说明请参考 `.env.example` 文件中的注释。

### 初始化数据库

首次运行前，需要初始化数据库：

```bash
uv run python -c "from src.codegate.database import init_db; init_db()"
```

这将创建所有必要的表，并创建默认管理员账户：

- 用户名：`admin`
- 密码：`123456`

**⚠️ 重要：首次登录后请立即修改默认密码！**

### 运行服务

```bash
uv run python main.py
```

服务将在 `http://localhost:8000` 启动。

### 访问

- **Web 界面**: <http://localhost:8000>
- **API 文档**: <http://localhost:8000/docs>
- **ReDoc**: <http://localhost:8000/redoc>
- **健康检查**: <http://localhost:8000/health>

## 常用命令

### 运行测试

```bash
cd backend
uv run pytest
```

### 以 PostgreSQL 运行（概要）

1. 在 `.env` 中将数据库切换为 PostgreSQL（按 `.env.example` 注释填写连接信息）
2. 再执行一次初始化（或迁移/建表逻辑）：

```bash
uv run python -c "from src.codegate.database import init_db; init_db()"
```

## 技术栈

- Python 3.12+
- FastAPI
- SQLAlchemy（用于 SQLite 和 PostgreSQL）
- SQLite / PostgreSQL
