# Python SDK（推荐）

本文档面向 **Python 调用方**：说明如何安装并使用 CodeGate Python SDK 完成常见任务。

API 侧的认证、签名规则与错误码说明见 `README.md`（本目录）。

## 安装

```bash
pip install codegate-sdk
```

---

## 最小可运行示例

```python
from codegate_sdk import CodeGateClient

client = CodeGateClient(
    api_key="YOUR_API_KEY",
    secret="YOUR_SECRET",
    project_id="YOUR_PROJECT_ID",
    base_url="https://api.example.com",
)

project = client.get_project()
print(project["id"], project["name"])
```

---

## 常见用法（按场景）

### 1) 查询激活码列表（分页/筛选）

```python
codes = client.list_codes(page=1, page_size=20, status="unused", search=None)
for item in codes["items"]:
    print(item["code"], item["status"])
```

### 2) 查询单个激活码

```python
code = client.get_code(code_id="CODE_ID")
print(code["code"], code["status"])
```

或通过激活码内容查询：

```python
code = client.get_code_by_code("ABC12345")
print(code["code"], code["status"])
```

### 3) 核销激活码（核心）

```python
result = client.verify_code(code="ABC12345", verified_by="user123")
if result["success"]:
    print("核销成功", result["verified_at"])
else:
    print("核销失败", result.get("error_code"), result.get("message"))
```

### 4) 重新激活激活码

```python
result = client.reactivate_code(
    code="ABC12345",
    reactivated_by="admin123",
    reason="用户退款，需要重新激活",
)
print(result["success"], result.get("message"))
```

### 5) 获取统计信息

```python
stats = client.get_statistics()
print(stats["usage_rate"], stats["used_codes"], stats["unused_codes"])
```

---

## 配置建议（环境变量）

```python
import os
from codegate_sdk import CodeGateClient

client = CodeGateClient(
    api_key=os.getenv("CODEGATE_API_KEY", ""),
    secret=os.getenv("CODEGATE_SECRET", ""),
    project_id=os.getenv("CODEGATE_PROJECT_ID", ""),
    base_url=os.getenv("CODEGATE_BASE_URL", "https://api.example.com"),
)
```

---

## 错误处理（调用方关注）

### 认证失败（401）

典型表现为 `requests.exceptions.HTTPError`，HTTP 状态码为 401，常见原因：

- Key/Secret 配置错误
- 客户端机器时间不准（时间戳签名校验）

### 触发限流（429）

当服务端返回 429 时，建议做指数退避重试（例如 200ms、500ms、1s…）并加入抖动，避免“同时重试风暴”。

### 业务错误（核销/重新激活返回 success=false）

核销、重新激活接口在参数正确但业务不满足时，会返回 `success=false` 与 `error_code`（HTTP 状态码仍为 200）：

```python
result = client.verify_code(code="ABC12345", verified_by="user123")
if result["success"]:
    print("核销成功", result["verified_at"])
else:
    # 如 CODE_ALREADY_USED / CODE_NOT_FOUND / CODE_DISABLED / CODE_EXPIRED
    print(result.get("error_code"), result.get("message"))
```

---

## 自定义 HTTP：generate_signature

如需自行封装 HTTP 客户端，可直接使用 SDK 提供的 `generate_signature` 生成签名（算法与 `README.md` 保持一致）：

```python
from codegate_sdk import generate_signature

project_id = "YOUR_PROJECT_ID"
secret = "YOUR_SECRET"

method = "GET"
path = f"/api/v1/projects/{project_id}/codes"
query_params = {"page": "1", "page_size": "20", "status": "unused"}
timestamp = int(time.time())

sig = generate_signature(
    method=method,
    path=path,
    query_params=query_params,
    body=None,
    timestamp=timestamp,
    secret=secret,
)
# 将 sig 填入请求头 X-Signature，并设置 X-API-Key、X-Timestamp
```

---

## FAQ

### 签名验证失败 / Invalid signature

如果 SDK 已经帮你签名但仍失败，优先检查：

- 机器时间是否准确（建议 NTP，同步服务器时间）
- `base_url` 是否指向正确环境（路径不同会导致签名不一致）
