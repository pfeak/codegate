"""
CodeGate Python SDK

一个轻量级的 Python SDK，用于与 CodeGate API 进行交互。
提供激活码查询、核销、重新激活等功能。
"""

from .client import CodeGateClient
from .signature import generate_signature, EMPTY_STRING_HASH

__version__ = "0.1.0"
__all__ = ["CodeGateClient", "generate_signature", "EMPTY_STRING_HASH"]
