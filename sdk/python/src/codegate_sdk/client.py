"""
CodeGate SDK 客户端

提供完整的 API 客户端实现，包括签名生成和请求发送。
"""

import requests
import json
import time
from typing import Dict, Optional, Any
from urllib.parse import urlencode, quote

from .signature import generate_signature


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

        Raises:
            requests.exceptions.HTTPError: HTTP 错误
            requests.exceptions.RequestException: 请求异常
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
