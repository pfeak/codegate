# Python SDK（调用方使用指南）

本文档面向 **Python 调用方**：说明如何安装并使用 CodeGate Python SDK 完成常见任务。

API 侧的认证、签名规则与错误码说明见 `API 文档`。

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

常见原因：

- Key/Secret 配置错误
- 客户端机器时间不准（时间戳签名校验）

### 触发限流（429）

建议做指数退避重试（例如 200ms、500ms、1s…）并加入抖动。

### 业务错误（核销/重新激活返回 success=false）

根据 `error_code` 做业务分支，例如：

- `CODE_ALREADY_USED`
- `CODE_NOT_FOUND`
- `CODE_DISABLED`
- `CODE_EXPIRED`

---

## FAQ

### 签名验证失败 / Invalid signature

如果 SDK 已经帮你签名但仍失败，优先检查：

- 机器时间是否准确（建议 NTP）
- `base_url` 是否指向正确环境（路径不同会导致签名不一致）
