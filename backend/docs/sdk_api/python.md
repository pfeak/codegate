# Python SDK 实现文档

> **文档职责**：此文档提供 CodeGate SDK API 的 Python 实现指南，包括接口说明、使用示例和最佳实践。具体实现代码请参考 SDK 源码。
>
> **相关文档**：
>
> - 设计使用文档请参考 [`README.md`](./README.md)
> - SDK 源码位置：`codegate/sdk/python/src/codegate_sdk/`

---

## 0. SDK 包结构

### 0.1 目录结构

CodeGate SDK 采用多语言 SDK 目录结构，Python SDK 位于独立的目录中：

```
codegate/
├── sdk/                      # SDK 根目录
│   ├── python/               # Python SDK
│   │   ├── src/
│   │   │   └── codegate_sdk/ # SDK 包源码
│   │   │       ├── __init__.py
│   │   │       ├── signature.py  # 签名计算模块
│   │   │       └── client.py      # 客户端实现
│   │   ├── tests/            # 测试文件
│   │   ├── examples/         # 使用示例
│   │   ├── pyproject.toml    # Python 包配置（独立构建）
│   │   └── README.md         # Python SDK 文档
│   ├── javascript/           # JavaScript/TypeScript SDK（计划中）
│   ├── go/                   # Go SDK（计划中）
│   ├── java/                 # Java SDK（计划中）
│   └── README.md             # SDK 总览文档
└── backend/                  # 后端服务（独立项目）
    └── pyproject.toml        # 后端项目配置（整包嵌入位置）
```

### 0.2 构建和安装

Python SDK 使用独立的 `pyproject.toml` 配置，可以通过 `uv build` 构建：

```bash
# 进入 Python SDK 目录
cd sdk/python

# 构建包
uv build

# 构建产物位于 dist/ 目录
# - codegate-sdk-0.1.0-py3-none-any.whl
# - codegate-sdk-0.1.0.tar.gz
```

**安装方式**：

```bash
# 从构建的 wheel 文件安装
pip install dist/codegate-sdk-0.1.0-py3-none-any.whl

# 或使用 uv
uv pip install dist/codegate-sdk-0.1.0-py3-none-any.whl
```

**注意**：
- SDK 包与后端服务包（`backend/pyproject.toml`）是独立的
- 后端 `pyproject.toml` 用于整包嵌入场景（将来可能将后端作为库嵌入其他项目）
- SDK 包仅包含客户端代码，不包含服务端代码

### 0.3 包名和版本

- **包名**：`codegate-sdk`
- **版本**：`0.1.0`
- **Python 版本要求**：`>=3.10`

---

## 1. 签名计算

### 1.1 签名函数接口

SDK 提供 `generate_signature` 函数用于生成 HMAC-SHA256 签名：

```python
from codegate_sdk import generate_signature

signature = generate_signature(
    method: str,              # HTTP 方法（大写），如 'GET', 'POST'
    path: str,                 # 请求路径（不含查询参数）
    query_params: Optional[Dict[str, str]] = None,  # 查询参数字典（可选）
    body: Optional[str] = None,  # 请求体字符串（可选）
    timestamp: int,           # Unix 时间戳（秒级）
    secret: str               # API Secret（64 位十六进制字符串）
) -> str                      # HMAC-SHA256 签名的十六进制字符串（64 个字符，小写）
```

**签名算法说明**：

1. 构建查询字符串（按键名排序，URL 编码）
2. 计算请求体哈希（SHA256），无请求体时使用空字符串哈希常量
3. 构建签名字符串：`{method}\n{path}\n{query_string}\n{body_hash}\n{timestamp}`
4. 使用 Secret 对签名字符串进行 HMAC-SHA256 计算

**空字符串哈希常量**：

```python
EMPTY_STRING_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

### 1.2 使用示例

```python
import time
from codegate_sdk import generate_signature

# 示例 1：GET 请求（无查询参数）
timestamp = int(time.time())
signature = generate_signature(
    method="GET",
    path=f"/api/v1/projects/{project_id}",
    query_params=None,
    body=None,
    timestamp=timestamp,
    secret="a1b2c3d4e5f6..."
)

# 示例 2：GET 请求（有查询参数）
signature = generate_signature(
    method="GET",
    path=f"/api/v1/projects/{project_id}/codes",
    query_params={"page": "1", "page_size": "20", "status": "unused"},
    body=None,
    timestamp=timestamp,
    secret="a1b2c3d4e5f6..."
)

# 示例 3：POST 请求（有请求体）
import json
body_data = {"code": "ABC12345", "verified_by": "user123"}
body = json.dumps(body_data, ensure_ascii=False)
signature = generate_signature(
    method="POST",
    path=f"/api/v1/projects/{project_id}/codes/verify",
    query_params=None,
    body=body,
    timestamp=timestamp,
    secret="a1b2c3d4e5f6..."
)
```

---

## 2. SDK 客户端

### 2.1 客户端初始化

```python
from codegate_sdk import CodeGateClient

client = CodeGateClient(
    api_key: str,      # API Key（32 位 UUID，无连字符）
    secret: str,       # API Secret（64 位十六进制字符串）
    project_id: str,   # 项目 ID（32 位 UUID，无连字符）
    base_url: str = "https://api.example.com"  # API 基础 URL
)
```

### 2.2 API 方法

#### 2.2.1 项目信息 API

```python
# 获取项目信息
project = client.get_project() -> Dict[str, Any]
```

#### 2.2.2 激活码查询 API

```python
# 查询激活码列表
codes = client.list_codes(
    page: int = 1,                    # 页码（>= 1）
    page_size: int = 20,              # 每页数量（1-100）
    status: Optional[str] = None,     # 状态筛选（'unused', 'used', 'disabled', 'expired'）
    search: Optional[str] = None      # 搜索关键词
) -> Dict[str, Any]

# 查询单个激活码详情（通过 ID）
code = client.get_code(code_id: str) -> Dict[str, Any]

# 通过激活码内容查询
code = client.get_code_by_code(code: str) -> Dict[str, Any]
```

#### 2.2.3 激活码核销 API

```python
# 核销激活码
result = client.verify_code(
    code: str,                        # 激活码内容
    verified_by: Optional[str] = None # 核销用户标识（可选）
) -> Dict[str, Any]

# 重新激活激活码
result = client.reactivate_code(
    code: str,                           # 激活码内容
    reactivated_by: Optional[str] = None # 重新激活操作的用户标识（可选）
    reason: Optional[str] = None         # 重新激活的原因说明（可选）
) -> Dict[str, Any]
```

#### 2.2.4 统计信息 API

```python
# 获取项目统计信息
stats = client.get_statistics() -> Dict[str, Any]
```

### 2.3 使用示例

**安装 SDK**：

```bash
# 从构建的 wheel 文件安装
pip install dist/codegate-sdk-0.1.0-py3-none-any.whl

# 或使用 uv
uv pip install dist/codegate-sdk-0.1.0-py3-none-any.whl
```

**基本使用**：

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
print(f"Total codes: {project['statistics']['total_codes']}")

# 查询激活码列表
codes = client.list_codes(page=1, page_size=20, status="unused")
print(f"Total codes: {codes['total']}")
for code_item in codes['items']:
    print(f"Code: {code_item['code']}, Status: {code_item['status']}")

# 查询单个激活码
code = client.get_code(code_id="660e8400e29b41d4a716446655440001")
print(f"Code: {code['code']}, Status: {code['status']}")

# 通过激活码内容查询
code = client.get_code_by_code("ABC12345")
print(f"Code: {code['code']}, Status: {code['status']}")

# 核销激活码
result = client.verify_code(code="ABC12345", verified_by="user123")
if result['success']:
    print(f"Code verified at: {result['verified_at']}")
else:
    print(f"Verification failed: {result['message']}")

# 重新激活激活码
result = client.reactivate_code(
    code="ABC12345",
    reactivated_by="admin123",
    reason="用户退款，需要重新激活"
)
if result['success']:
    print(f"Code reactivated at: {result['reactivated_at']}")
else:
    print(f"Reactivation failed: {result['message']}")

# 获取统计信息
stats = client.get_statistics()
print(f"Usage rate: {stats['usage_rate']}")
print(f"Used codes: {stats['used_codes']}")
print(f"Unused codes: {stats['unused_codes']}")
```

### 2.4 错误处理示例

```python
import requests
from codegate_sdk import CodeGateClient

client = CodeGateClient(
    api_key="550e8400e29b41d4a716446655440000",
    secret="a1b2c3d4e5f6...",
    project_id="550e8400e29b41d4a716446655440000"
)

try:
    # 核销激活码
    result = client.verify_code(code="ABC12345")
    
    if result['success']:
        print(f"核销成功: {result['message']}")
    else:
        error_code = result.get('error_code')
        if error_code == 'CODE_ALREADY_USED':
            print("激活码已被使用")
        elif error_code == 'CODE_NOT_FOUND':
            print("激活码不存在")
        elif error_code == 'CODE_DISABLED':
            print("激活码已禁用")
        elif error_code == 'CODE_EXPIRED':
            print("激活码已过期")
        else:
            print(f"核销失败: {result['message']}")

except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        print("认证失败：请检查 API Key 和 Secret")
    elif e.response.status_code == 403:
        print("权限不足：项目 ID 不匹配")
    elif e.response.status_code == 404:
        print("资源不存在")
    elif e.response.status_code == 429:
        print("请求频率过高，请稍后重试")
    else:
        print(f"请求失败: {e}")

except Exception as e:
    print(f"发生错误: {e}")
```

---

## 3. 依赖

### 3.1 核心依赖

- `requests>=2.28.0`：HTTP 请求库

### 3.2 安装依赖

```bash
pip install requests
```

或使用 `requirements.txt`：

```
requests>=2.28.0
```

---

## 4. 最佳实践

### 4.1 配置管理

建议使用环境变量或配置文件管理 API 凭证：

```python
import os
from codegate_sdk import CodeGateClient

# 从环境变量读取配置
client = CodeGateClient(
    api_key=os.getenv("CODEGATE_API_KEY"),
    secret=os.getenv("CODEGATE_SECRET"),
    project_id=os.getenv("CODEGATE_PROJECT_ID"),
    base_url=os.getenv("CODEGATE_BASE_URL", "https://api.example.com")
)
```

### 4.2 重试机制

对于网络请求，建议实现重试机制：

```python
import time
from functools import wraps
import requests

def retry_on_failure(max_retries=3, delay=1):
    """重试装饰器"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except requests.exceptions.RequestException as e:
                    if attempt == max_retries - 1:
                        raise
                    time.sleep(delay * (attempt + 1))
            return None
        return wrapper
    return decorator

# 使用示例
@retry_on_failure(max_retries=3, delay=1)
def verify_code_with_retry(client, code):
    return client.verify_code(code=code)
```

### 4.3 日志记录

建议记录所有 API 调用：

```python
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 使用示例
logger.info(f"Verifying code: {code}")
result = client.verify_code(code=code)
logger.info(f"Verification result: {result}")
```

---

## 5. 测试

### 5.1 单元测试

SDK 提供了单元测试示例，位于 `sdk/python/tests/` 目录。测试覆盖签名生成、客户端方法等核心功能。

运行测试：

```bash
cd sdk/python
uv run pytest
```

---

## 6. 常见问题

### 6.1 签名验证失败

**问题**：返回 `401 Unauthorized`，错误信息 `"Invalid signature"`

**解决方案**：

1. 检查 Secret 是否正确（64 位十六进制字符串）
2. 确认时间戳使用秒级（不是毫秒级）
3. 确认查询参数按键名排序并正确 URL 编码
4. 确认请求体 JSON 序列化格式一致（空格、换行等）

### 6.2 时间戳过期

**问题**：返回 `401 Unauthorized`，错误信息 `"Timestamp expired"`

**解决方案**：

1. 确保客户端系统时间准确（建议使用 NTP 同步）
2. 检查时间戳是否为秒级（不是毫秒级）
3. 时间窗口为 ±5 分钟，确保请求在时间窗口内

### 6.3 项目 ID 不匹配

**问题**：返回 `403 Forbidden`，错误信息 `"Project ID in path does not match API Key's project"`

**解决方案**：

1. 确认 `project_id` 与生成 API Key 时返回的 `project_id` 一致
2. 检查路径中的 `project_id` 参数是否正确

---

## 7. 参考

- **SDK 源码**：`codegate/sdk/python/src/codegate_sdk/`
- **API 设计文档**：[`README.md`](./README.md)
- **使用示例**：`codegate/sdk/python/examples/`
