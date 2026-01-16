"""
Schema 工具函数

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
from datetime import datetime
from typing import Optional
from pydantic import field_serializer


def datetime_to_timestamp(dt: Optional[datetime]) -> Optional[int]:
    """
    将datetime转换为UTC时间戳(秒级)

    Args:
        dt: datetime对象（假设为UTC时间，如果是naive datetime）

    Returns:
        Optional[int]: UTC时间戳(秒级),如果为None则返回None
    """
    if dt is None:
        return None
    # 如果datetime是naive（没有时区信息），假设它是UTC时间
    # 使用 (dt - datetime(1970, 1, 1)).total_seconds() 来计算UTC时间戳
    if dt.tzinfo is None:
        # naive datetime，假设是UTC时间
        epoch = datetime(1970, 1, 1)
        return int((dt - epoch).total_seconds())
    else:
        # timezone-aware datetime，使用timestamp()方法
        return int(dt.timestamp())


def timestamp_to_datetime(ts: Optional[int]) -> Optional[datetime]:
    """
    将UTC时间戳(秒级)转换为datetime

    Args:
        ts: UTC时间戳(秒级)

    Returns:
        Optional[datetime]: datetime对象,如果为None则返回None
    """
    if ts is None:
        return None
    return datetime.utcfromtimestamp(ts)
