"""
SDK API 认证依赖

提供 HMAC-SHA256 签名验证功能
"""
import hmac
import hashlib
import time
import urllib.parse
from typing import Optional, Dict
from fastapi import Request, HTTPException, Header, Depends
from sqlalchemy.orm import Session

from ...database import get_db
from ...models.api_key import ApiKey

# 空字符串的 SHA256 哈希值（常量）
EMPTY_STRING_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

# 时间戳窗口（秒），默认 ±5 分钟
TIMESTAMP_WINDOW = 300


def verify_signature(
    method: str,
    path: str,
    query_params: Optional[Dict[str, str]],
    body: Optional[str],
    timestamp: int,
    secret: str,
    signature: str
) -> bool:
    """
    验证 HMAC-SHA256 签名
    
    Args:
        method: HTTP 方法
        path: 请求路径
        query_params: 查询参数字典
        body: 请求体字符串
        timestamp: 时间戳
        secret: API Secret
        signature: 客户端提供的签名
    
    Returns:
        签名是否有效
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
        body_hash = EMPTY_STRING_HASH
    
    # 3. 构建签名字符串
    string_to_sign = f"{method}\n{path}\n{query_string}\n{body_hash}\n{timestamp}"
    
    # 4. 计算 HMAC-SHA256 签名
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    # 5. 使用安全的比较方法
    return hmac.compare_digest(expected_signature, signature)


async def verify_sdk_auth(
    request: Request,
    x_api_key: str = Header(..., alias="X-API-Key"),
    x_timestamp: str = Header(..., alias="X-Timestamp"),
    x_signature: str = Header(..., alias="X-Signature"),
    db: Session = Depends(get_db)
) -> ApiKey:
    """
    SDK API 认证依赖
    
    验证 API Key 和 HMAC 签名
    
    Returns:
        ApiKey 对象
    
    Raises:
        HTTPException: 认证失败
    """
    # 1. 提取 Header
    try:
        timestamp = int(x_timestamp)
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid timestamp format")
    
    # 2. 时间戳验证
    current_time = int(time.time())
    time_diff = abs(current_time - timestamp)
    if time_diff > TIMESTAMP_WINDOW:
        raise HTTPException(
            status_code=401,
            detail="Timestamp expired. Request timestamp is too old or too far in the future."
        )
    
    # 3. 查询 API Key
    from sqlalchemy import select
    stmt = select(ApiKey).where(
        ApiKey.api_key == x_api_key,
        ApiKey.is_active == True
    )
    api_key = db.execute(stmt).scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API credentials")
    
    # 4. 获取请求体和查询参数
    body = None
    if request.method in ["POST", "PUT", "PATCH"]:
        body_bytes = await request.body()
        if body_bytes:
            body = body_bytes.decode('utf-8')
    
    # 获取查询参数
    query_params = dict(request.query_params)
    
    # 5. 构建路径（不含查询参数）
    path = request.url.path
    
    # 6. 验证签名
    if not verify_signature(
        method=request.method,
        path=path,
        query_params=query_params if query_params else None,
        body=body,
        timestamp=timestamp,
        secret=api_key.secret,
        signature=x_signature
    ):
        raise HTTPException(status_code=401, detail="Invalid signature")
    
    # 7. 更新最后使用时间
    from datetime import datetime
    api_key.last_used_at = datetime.utcnow()
    db.commit()
    
    return api_key
