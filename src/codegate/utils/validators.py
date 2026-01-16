"""
验证器工具函数

Copyright 2026 pfeak

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
"""
import re
from typing import Optional


def validate_code_format(
    code: str,
    min_length: int = 1,
    max_length: int = 100,
    allowed_chars: Optional[str] = None,
) -> bool:
    """
    验证邀请码格式
    
    Args:
        code: 邀请码字符串
        min_length: 最小长度
        max_length: 最大长度
        allowed_chars: 允许的字符集（正则表达式），默认允许字母数字
    
    Returns:
        bool: 格式是否有效
    """
    if not code or not isinstance(code, str):
        return False
    
    if len(code) < min_length or len(code) > max_length:
        return False
    
    if allowed_chars is None:
        # 默认允许字母、数字、连字符、下划线
        allowed_chars = r'^[a-zA-Z0-9_-]+$'
    
    if not re.match(allowed_chars, code):
        return False
    
    return True
