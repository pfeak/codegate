# Python SDK 实现文档

> **文档职责**：此文档提供 CodeGate SDK API 的 Python 实现指南，包括签名计算、完整 SDK 客户端实现和使用示例。
>
> **相关文档**：
>
> - 设计使用文档请参考 [`README.md`](./README.md)

---

## 1. 签名计算实现

### 1.1 核心签名函数

```python
import hmac
import hashlib
import time
import urllib.parse
from typing import Dict, Optional

# 空字符串的 SHA256 哈希值（常量）
EMPTY_STRING_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

def generate_signature(
    method: str,
    path: str,
    query_params: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timestamp: int,
    secret: str
) -> str:
    """
    生成 HMAC-SHA256 签名
    
    Args:
        method: HTTP 方法（大写），如 'GET', 'POST', 'PUT', 'DELETE'
        path: 请求路径（不含查询参数），如 '/api/v1/projects/{project_id}'
        query_params: 查询参数字典（可选）
        body: 请求体字符串（可选）
        timestamp: Unix 时间戳（秒级）
        secret: API Secret（64 位十六进制字符串）
    
    Returns:
        HMAC-SHA256 签名的十六进制字符串（64 个字符，小写）
    """
    # 1. 构建查询字符串（按键名排序，URL 编码）
    if query_params:
        sorted_params = sorted(query_params.items())
        query_string = urllib.parse.urlencode(sorted_params)
    else:
        query_string = ""
    
    # 2. 计算请求体哈希
    if body:
        body_hash = hashlib.sha256(body.encode('utf-8')).hexdigest()
    else:
        # 使用空字符串哈希常量
        body_hash = EMPTY_STRING_HASH
    
    # 3. 构建签名字符串
    string_to_sign = f"{method}\n{path}\n{query_string}\n{body_hash}\n{timestamp}"
    
    # 4. 计算 HMAC-SHA256 签名
    signature = hmac.new(
        secret.encode('utf-8'),
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature
```

### 1.2 使用示例

```python
# 示例 1：GET 请求（无查询参数）
project_id = "550e8400e29b41d4a716446655440000"
timestamp = int(time.time())
signature = generate_signature(
    method="GET",
    path=f"/api/v1/projects/{project_id}",
    query_params=None,
    body=None,
    timestamp=timestamp,
    secret="a1b2c3d4e5f6..."
)
print(f"Signature: {signature}")

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

## 2. 完整 SDK 客户端实现

### 2.1 SDK 客户端类

```python
import requests
import json
import time
from typing import Dict, Optional, Any, List
from urllib.parse import urlencode

class CodeGateClient:
    """CodeGate SDK 客户端"""
    
    def __init__(
        self,
        api_key: str,
        secret: str,
        project_id: str,
        base_url: str = "https://api.example.com"
    ):
        """
        初始化客户端
        
        Args:
            api_key: API Key（32 位 UUID，无连字符）
            secret: API Secret（64 位十六进制字符串）
            project_id: 项目 ID（32 位 UUID，无连字符）
            base_url: API 基础 URL
        """
        self.api_key = api_key
        self.secret = secret
        self.project_id = project_id
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
    
    def _generate_signature(
        self,
        method: str,
        path: str,
        query_params: Optional[Dict[str, str]] = None,
        body: Optional[str] = None,
        timestamp: int = None
    ) -> str:
        """生成 HMAC-SHA256 签名（内部方法）"""
        if timestamp is None:
            timestamp = int(time.time())
        
        return generate_signature(
            method=method,
            path=path,
            query_params=query_params,
            body=body,
            timestamp=timestamp,
            secret=self.secret
        )
    
    def _make_request(
        self,
        method: str,
        path: str,
        query_params: Optional[Dict[str, Any]] = None,
        body: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        发送 HTTP 请求（内部方法）
        
        Args:
            method: HTTP 方法
            path: 请求路径
            query_params: 查询参数字典
            body: 请求体字典
        
        Returns:
            响应 JSON 数据
        """
        # 构建完整 URL
        url = f"{self.base_url}{path}"
        
        # 准备查询参数（转换为字符串）
        query_string_dict = None
        if query_params:
            query_string_dict = {k: str(v) for k, v in query_params.items()}
            url += f"?{urlencode(query_string_dict)}"
        
        # 准备请求体
        body_string = None
        if body:
            body_string = json.dumps(body, ensure_ascii=False)
        
        # 生成时间戳和签名
        timestamp = int(time.time())
        signature = self._generate_signature(
            method=method,
            path=path,
            query_params=query_string_dict,
            body=body_string,
            timestamp=timestamp
        )
        
        # 设置请求头
        headers = {
            "X-API-Key": self.api_key,
            "X-Timestamp": str(timestamp),
            "X-Signature": signature,
            "Content-Type": "application/json"
        }
        
        # 发送请求
        response = self.session.request(
            method=method,
            url=url,
            headers=headers,
            data=body_string if body_string else None
        )
        
        # 处理响应
        response.raise_for_status()
        return response.json()
    
    # ========== 项目信息 API ==========
    
    def get_project(self) -> Dict[str, Any]:
        """
        获取项目信息
        
        Returns:
            项目信息字典
        """
        path = f"/api/v1/projects/{self.project_id}"
        return self._make_request("GET", path)
    
    # ========== 激活码查询 API ==========
    
    def list_codes(
        self,
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        查询激活码列表
        
        Args:
            page: 页码（>= 1）
            page_size: 每页数量（1-100）
            status: 状态筛选（'unused', 'used', 'disabled', 'expired'）
            search: 搜索关键词
        
        Returns:
            激活码列表响应
        """
        path = f"/api/v1/projects/{self.project_id}/codes"
        query_params = {
            "page": page,
            "page_size": page_size
        }
        if status:
            query_params["status"] = status
        if search:
            query_params["search"] = search
        
        return self._make_request("GET", path, query_params=query_params)
    
    def get_code(self, code_id: str) -> Dict[str, Any]:
        """
        查询单个激活码详情
        
        Args:
            code_id: 激活码 ID（32 位 UUID，无连字符）
        
        Returns:
            激活码详情
        """
        path = f"/api/v1/projects/{self.project_id}/codes/{code_id}"
        return self._make_request("GET", path)
    
    def get_code_by_code(self, code: str) -> Dict[str, Any]:
        """
        通过激活码内容查询
        
        Args:
            code: 激活码内容
        
        Returns:
            激活码详情
        """
        from urllib.parse import quote
        encoded_code = quote(code, safe='')
        path = f"/api/v1/projects/{self.project_id}/codes/by-code/{encoded_code}"
        return self._make_request("GET", path)
    
    # ========== 激活码核销 API ==========
    
    def verify_code(
        self,
        code: str,
        verified_by: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        核销激活码
        
        Args:
            code: 激活码内容
            verified_by: 核销用户标识（可选）
        
        Returns:
            核销结果
        """
        path = f"/api/v1/projects/{self.project_id}/codes/verify"
        body = {"code": code}
        if verified_by:
            body["verified_by"] = verified_by
        
        return self._make_request("POST", path, body=body)
    
    def reactivate_code(
        self,
        code: str,
        reactivated_by: Optional[str] = None,
        reason: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        重新激活激活码
        
        Args:
            code: 激活码内容
            reactivated_by: 重新激活操作的用户标识（可选）
            reason: 重新激活的原因说明（可选）
        
        Returns:
            重新激活结果
        """
        path = f"/api/v1/projects/{self.project_id}/codes/reactivate"
        body = {"code": code}
        if reactivated_by:
            body["reactivated_by"] = reactivated_by
        if reason:
            body["reason"] = reason
        
        return self._make_request("POST", path, body=body)
    
    # ========== 统计信息 API ==========
    
    def get_statistics(self) -> Dict[str, Any]:
        """
        获取项目统计信息
        
        Returns:
            统计信息
        """
        path = f"/api/v1/projects/{self.project_id}/statistics"
        return self._make_request("GET", path)
```

### 2.2 使用示例

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

### 2.3 错误处理示例

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

## 3. 依赖安装

### 3.1 使用 pip 安装依赖

```bash
pip install requests
```

### 3.2 requirements.txt

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

# 在客户端中添加日志
class CodeGateClient:
    # ... 其他代码 ...
    
    def _make_request(self, method, path, query_params=None, body=None):
        logger.info(f"Making {method} request to {path}")
        try:
            result = self._make_request_impl(method, path, query_params, body)
            logger.info(f"Request successful: {path}")
            return result
        except Exception as e:
            logger.error(f"Request failed: {path}, Error: {e}")
            raise
```

---

## 5. 测试

### 5.1 单元测试示例

```python
import unittest
from unittest.mock import Mock, patch
from codegate_sdk import CodeGateClient, generate_signature

class TestCodeGateClient(unittest.TestCase):
    
    def setUp(self):
        self.client = CodeGateClient(
            api_key="test_api_key",
            secret="test_secret",
            project_id="test_project_id"
        )
    
    def test_generate_signature(self):
        """测试签名生成"""
        signature = generate_signature(
            method="GET",
            path="/api/v1/projects/test",
            query_params=None,
            body=None,
            timestamp=1704153600,
            secret="test_secret"
        )
        self.assertIsInstance(signature, str)
        self.assertEqual(len(signature), 64)  # SHA256 十六进制字符串长度为 64
    
    @patch('codegate_sdk.requests.Session')
    def test_get_project(self, mock_session):
        """测试获取项目信息"""
        mock_response = Mock()
        mock_response.json.return_value = {"id": "test", "name": "Test Project"}
        mock_response.raise_for_status = Mock()
        mock_session.return_value.request.return_value = mock_response
        
        result = self.client.get_project()
        self.assertEqual(result["name"], "Test Project")

if __name__ == '__main__':
    unittest.main()
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
