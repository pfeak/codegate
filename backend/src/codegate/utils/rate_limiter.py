"""
IP 频率限制工具

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
from datetime import datetime, timedelta
from typing import Optional
from collections import defaultdict
import threading

from ..core.constants import MAX_VERIFICATION_ATTEMPTS, VERIFICATION_RATE_LIMIT_SECONDS
from ..core.exceptions import RateLimitExceededError


class RateLimiter:
    """IP 频率限制器"""

    def __init__(self):
        """初始化频率限制器"""
        self._attempts: dict[str, list[datetime]] = defaultdict(list)
        self._lock = threading.Lock()

    def check_rate_limit(
        self,
        ip_address: Optional[str],
        max_attempts: int = MAX_VERIFICATION_ATTEMPTS,
        time_window_seconds: int = VERIFICATION_RATE_LIMIT_SECONDS,
    ) -> None:
        """
        检查 IP 频率限制

        Args:
            ip_address: IP 地址
            max_attempts: 最大尝试次数
            time_window_seconds: 时间窗口（秒）

        Raises:
            RateLimitExceededError: 超过频率限制
        """
        if not ip_address:
            return  # 无法获取 IP 地址时不限制

        with self._lock:
            now = datetime.utcnow()
            time_window = timedelta(seconds=time_window_seconds)

            # 清理过期记录
            attempts = self._attempts[ip_address]
            attempts[:] = [attempt_time for attempt_time in attempts if now - attempt_time < time_window]

            # 检查是否超过限制
            if len(attempts) >= max_attempts:
                raise RateLimitExceededError(
                    f"IP {ip_address} 在 {time_window_seconds} 秒内尝试次数超过 {max_attempts} 次，请稍后再试"
                )

            # 记录本次尝试
            attempts.append(now)

    def reset(self, ip_address: Optional[str]) -> None:
        """
        重置 IP 的频率限制记录

        Args:
            ip_address: IP 地址
        """
        if not ip_address:
            return

        with self._lock:
            if ip_address in self._attempts:
                del self._attempts[ip_address]


# 全局频率限制器实例
rate_limiter = RateLimiter()
