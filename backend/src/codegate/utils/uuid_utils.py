"""
UUID 工具函数

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
import uuid
from typing import Optional


def generate_uuid() -> str:
    """
    生成UUID并去除连字符

    Returns:
        str: UUID字符串（去除连字符），例如：550e8400e29b41d4a716446655440000
    """
    return uuid.uuid4().hex


def format_uuid_display(uuid_str: str, length: int = 8) -> str:
    """
    格式化UUID显示（显示前N位+...）

    Args:
        uuid_str: UUID字符串（去除连字符）
        length: 显示长度，默认8位

    Returns:
        str: 格式化后的UUID，例如：550e8400...
    """
    if not uuid_str:
        return "-"
    if len(uuid_str) <= length:
        return uuid_str
    return f"{uuid_str[:length]}..."


def is_valid_uuid(uuid_str: str) -> bool:
    """
    验证UUID格式（去除连字符的32位十六进制字符串）

    Args:
        uuid_str: UUID字符串

    Returns:
        bool: 是否为有效的UUID格式
    """
    if not uuid_str:
        return False
    if len(uuid_str) != 32:
        return False
    try:
        # 尝试转换为UUID对象验证格式
        uuid.UUID(uuid_str)
        return True
    except (ValueError, AttributeError):
        return False
