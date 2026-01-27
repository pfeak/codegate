# CodeGate Python SDK

CodeGate Python SDK 是一个轻量级的客户端库，用于与 CodeGate API 进行交互。提供激活码查询、核销、重新激活等功能。

## 安装

```bash
pip install codegate-sdk
```

或者使用 `uv`：

```bash
uv pip install codegate-sdk
```

## 快速开始

```python
from codegate_sdk import CodeGateClient

# 初始化客户端
client = CodeGateClient(
    api_key="550e8400e29b41d4a716446655440000",
    secret="a1b2c3d4e5f6...",
    project_id="550e8400e29b41d4a716446655440000",
    base_url="https://api.example.com"
)

# 获取项目信息
project = client.get_project()
print(f"Project: {project['name']}")

# 核销激活码
result = client.verify_code(code="ABC12345", verified_by="user123")
if result['success']:
    print(f"Code verified at: {result['verified_at']}")
```

## API 文档

详细的 API 文档请参考 [SDK API 设计文档](../../backend/docs/sdk_api/README.md) 和 [Python SDK 实现文档](../../backend/docs/sdk_api/python.md)。

## 开发

### 构建包

```bash
cd sdk/python
uv build
```

### 运行测试

```bash
cd sdk/python
uv run pytest
```

## 许可证

Apache-2.0
