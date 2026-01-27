"""
签名计算模块

提供 HMAC-SHA256 签名生成功能，用于 API 认证。
"""

import hmac
import hashlib
import urllib.parse
from typing import Dict, Optional

# 空字符串的 SHA256 哈希值（常量）
EMPTY_STRING_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"


def generate_signature(
    method: str,
    path: str,
    query_params: Optional[Dict[str, str]] = None,
    body: Optional[str] = None,
    timestamp: int = None,
    secret: str = None
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

    Raises:
        ValueError: 如果缺少必需的参数
    """
    if timestamp is None:
        raise ValueError("timestamp is required")
    if secret is None:
        raise ValueError("secret is required")

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
