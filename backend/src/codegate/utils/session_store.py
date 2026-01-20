"""
会话存储抽象

支持内存与 Redis，提供 TTL 管控。
"""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional, Protocol
import logging

logger = logging.getLogger(__name__)


class SessionStore(Protocol):
    def set(self, session_id: str, admin_id: str) -> None: ...

    def get(self, session_id: str) -> Optional[str]: ...

    def delete(self, session_id: str) -> None: ...


class MemorySessionStore:
    """进程内存储，附带 TTL 与惰性清理"""

    def __init__(self, ttl_seconds: int):
        self.ttl_seconds = ttl_seconds
        self._store: dict[str, tuple[str, datetime]] = {}

    def _is_expired(self, expires_at: datetime) -> bool:
        return datetime.utcnow() >= expires_at

    def _cleanup(self) -> None:
        now = datetime.utcnow()
        expired_keys = [k for k, (_, exp) in self._store.items() if exp <= now]
        for key in expired_keys:
            self._store.pop(key, None)

    def set(self, session_id: str, admin_id: str) -> None:
        expires_at = datetime.utcnow() + timedelta(seconds=self.ttl_seconds)
        self._store[session_id] = (admin_id, expires_at)
        # 惰性清理，避免长期堆积
        self._cleanup()

    def get(self, session_id: str) -> Optional[str]:
        data = self._store.get(session_id)
        if not data:
            return None
        admin_id, expires_at = data
        if self._is_expired(expires_at):
            self._store.pop(session_id, None)
            return None
        return admin_id

    def delete(self, session_id: str) -> None:
        self._store.pop(session_id, None)


class RedisSessionStore:
    """Redis 持久化存储"""

    def __init__(self, redis_url: str, ttl_seconds: int):
        try:
            import redis  # type: ignore
        except ImportError as exc:
            raise RuntimeError("Redis 会话存储需要安装 redis 依赖") from exc

        self.ttl_seconds = ttl_seconds
        self.client = redis.Redis.from_url(redis_url, decode_responses=True)

    def set(self, session_id: str, admin_id: str) -> None:
        self.client.set(session_id, admin_id, ex=self.ttl_seconds)

    def get(self, session_id: str) -> Optional[str]:
        return self.client.get(session_id)

    def delete(self, session_id: str) -> None:
        self.client.delete(session_id)


def get_session_store(settings) -> SessionStore:
    """根据配置返回会话存储实现"""
    backend = (settings.SESSION_BACKEND or "memory").lower()

    if backend == "redis":
        if not settings.SESSION_REDIS_URL:
            logger.warning("SESSION_BACKEND=redis 但 SESSION_REDIS_URL 未配置，回退到内存会话")
        else:
            logger.info("使用 Redis 会话存储")
            return RedisSessionStore(settings.SESSION_REDIS_URL, settings.SESSION_TTL_SECONDS)

    logger.info("使用内存会话存储（进程内，非持久化）")
    return MemorySessionStore(settings.SESSION_TTL_SECONDS)
