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

## 环境要求

- **Python** >= 3.10
- 依赖：`requests>=2.28.0`

## API 概览

| 方法 | 说明 |
|------|------|
| `get_project()` | 获取项目信息 |
| `list_codes(page?, page_size?, status?, search?)` | 分页查询激活码 |
| `get_code(code_id)` | 按 ID 查询单个激活码 |
| `get_code_by_code(code)` | 按激活码内容查询 |
| `verify_code(code, verified_by?)` | 核销激活码 |
| `reactivate_code(code, reactivated_by?, reason?)` | 重新激活 |
| `get_statistics()` | 项目统计信息 |

`status` 可选：`unused`、`used`、`disabled`、`expired`。

## 错误处理

- **4xx/5xx**：`client` 会抛出 `requests.HTTPError`，可通过 `e.response.status_code` 判断（如 401、403、404、429）。
- **业务失败**：核销/重新激活返回 `success=False` 时，用 `result['error_code']` 区分：`CODE_ALREADY_USED`、`CODE_NOT_FOUND`、`CODE_DISABLED`、`CODE_EXPIRED` 等。

## 其他用法

### 环境变量配置

通过环境变量注入凭证：

```python
import os
from codegate_sdk import CodeGateClient

client = CodeGateClient(
    api_key=os.getenv("CODEGATE_API_KEY"),
    secret=os.getenv("CODEGATE_SECRET"),
    project_id=os.getenv("CODEGATE_PROJECT_ID"),
    base_url=os.getenv("CODEGATE_BASE_URL", "https://api.example.com")
)
```

### 自定义请求与 generate_signature

自建 HTTP 客户端时，可用 `generate_signature` 生成签名：

```python
import time
from codegate_sdk import generate_signature

method = "GET"
path = f"/api/v1/projects/{project_id}/codes"
query_params = {"page": "1", "page_size": "20", "status": "unused"}
timestamp = int(time.time())
sig = generate_signature(method, path, query_params, None, timestamp, secret)
# 将 sig 填入请求头 X-Signature，并设置 X-API-Key、X-Timestamp
```

### 分页与筛选

`list_codes` 支持按状态、关键词分页，便于导出或批量处理：

```python
# 只查未使用、按关键词搜索
resp = client.list_codes(page=1, page_size=50, status="unused", search="PROMO2024")
total, total_pages = resp["total"], resp["total_pages"]

# 分页遍历全部未使用码
for p in range(1, total_pages + 1):
    page = client.list_codes(page=p, page_size=100, status="unused")
    for c in page["items"]:
        print(c["code"])
```

### 核销结果与 error_code

核销通过 `success`、`error_code` 表示业务结果（不抛异常时）：

```python
result = client.verify_code(code="ABC12345", verified_by="user123")
if result["success"]:
    print("核销成功", result["verified_at"])
else:
    print(result.get("error_code"), result.get("message"))
```

### 重试与容错

对 5xx 或网络异常可做有限次重试：

```python
import time

def with_retry(fn, max_retries=3):
    for i in range(max_retries):
        try:
            return fn()
        except Exception as e:
            status = getattr(getattr(e, "response", None), "status_code", None)
            is_retryable = status is not None and status >= 500
            if i == max_retries - 1 or not is_retryable:
                raise
            time.sleep(1 * (i + 1))

result = with_retry(lambda: client.verify_code(code="ABC12345"))
```

### 从构建产物安装

本地构建后从 `dist/` 安装（联调时常用）：

```bash
cd sdk/python && uv build
# 生成的 wheel 文件名会包含版本号，例如：codegate_sdk-0.1.1-py3-none-any.whl
pip install dist/codegate_sdk-*.whl
# 或： uv pip install dist/codegate_sdk-*.whl
```

### 运行示例

```bash
cd sdk/python
uv run python examples/basic_usage.py
uv run python examples/error_handling.py
```

需事先设置 `CODEGATE_API_KEY`、`CODEGATE_SECRET`、`CODEGATE_PROJECT_ID`、`CODEGATE_BASE_URL`（可选）。

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
