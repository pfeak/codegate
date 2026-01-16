"""
激活码生成器

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
import random
import string
from typing import Optional, Set


def generate_codes(
    count: int,
    length: Optional[int] = None,
    prefix: Optional[str] = None,
    suffix: Optional[str] = None,
    existing_codes: Optional[Set[str]] = None,
    charset: str = string.ascii_uppercase + string.digits,
    max_attempts: int = 10000,
) -> list[str]:
    """
    批量生成唯一的激活码
    
    Args:
        count: 生成数量
        length: 激活码长度（不包括前缀和后缀），默认 12
        prefix: 前缀（可选）
        suffix: 后缀（可选）
        existing_codes: 已存在的激活码集合，用于避免重复
        charset: 字符集，默认大写字母+数字
        max_attempts: 生成单个激活码的最大尝试次数
    
    Returns:
        list[str]: 生成的激活码列表
    
    Raises:
        ValueError: 无法生成足够数量的唯一激活码
    """
    if existing_codes is None:
        existing_codes = set()
    
    # 默认长度
    if length is None:
        length = 12
    
    # 计算实际随机部分长度
    prefix_len = len(prefix) if prefix else 0
    suffix_len = len(suffix) if suffix else 0
    random_length = length - prefix_len - suffix_len
    
    if random_length <= 0:
        raise ValueError("激活码长度必须大于前缀和后缀的总长度")
    
    # 计算可能的组合数
    possible_combinations = len(charset) ** random_length
    if count > possible_combinations * 0.9:
        raise ValueError(
            f"请求生成的数量 ({count}) 过多，可能无法生成足够的唯一激活码。"
            f"当前配置最多可生成约 {int(possible_combinations * 0.9)} 个唯一激活码。"
        )
    
    generated_codes: list[str] = []
    used_codes = existing_codes.copy()
    
    for _ in range(count):
        code = None
        attempts = 0
        
        while code is None or code in used_codes:
            if attempts >= max_attempts:
                raise ValueError(
                    f"无法生成唯一激活码，已尝试 {max_attempts} 次。"
                    f"当前已生成 {len(generated_codes)} 个，请求 {count} 个。"
                )
            
            # 生成随机部分
            random_part = ''.join(random.choice(charset) for _ in range(random_length))
            
            # 组合前缀、随机部分和后缀
            code = (prefix or "") + random_part + (suffix or "")
            attempts += 1
        
        generated_codes.append(code)
        used_codes.add(code)
    
    return generated_codes
