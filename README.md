# CodeGate

轻量级邀请码管理系统，提供生成、验证、过期管理等功能。

## 功能特性

- 项目管理：创建、更新、查询项目
- 批量生成邀请码
- 邀请码验证/核销
- 自动过期管理
- Web UI 和 REST API

## 技术栈

- **后端**: FastAPI + SQLite (WAL) + SQLAlchemy
- **前端**: Jinja2 + Tailwind CSS
- **工具**: Typer (CLI) + FileLock

## 快速开始

```bash
# 安装依赖
uv sync

# 运行服务
uv run python main.py
```

服务将在 `http://localhost:8000` 启动。

## License

Apache License 2.0 - 详见 [LICENSE](LICENSE) 和 [NOTICE](NOTICE)
