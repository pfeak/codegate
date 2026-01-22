"""
API Key 业务逻辑
"""
from typing import Optional
from sqlalchemy.orm import Session

from ...models.api_key import ApiKey
from .api_key_repository import ApiKeyRepository


class ApiKeyService:
    """API Key 服务"""

    @staticmethod
    def generate_or_refresh(db: Session, project_id: str, name: Optional[str], admin_id: str) -> ApiKey:
        """
        生成或刷新 API Key

        - 如果项目已有 API Key，先删除后重新生成
        - 返回包含 secret 的对象（调用方负责序列化）
        """
        # 删除旧记录
        ApiKeyRepository.delete_by_project(db, project_id)

        # 创建新记录
        api_key = ApiKey(
            project_id=project_id,
            api_key=ApiKey.generate_api_key(),
            secret=ApiKey.generate_secret(),
            name=name.strip() if name else None,
            created_by=admin_id,
            is_active=True,
        )
        ApiKeyRepository.create(db, api_key)
        return api_key

    @staticmethod
    def list_by_project(db: Session, project_id: str):
        """按项目获取列表"""
        return ApiKeyRepository.list_by_project(db, project_id)

    @staticmethod
    def toggle_status(db: Session, api_key_id: str, is_active: bool) -> ApiKey:
        """启用/禁用"""
        api_key = ApiKeyRepository.get_by_id(db, api_key_id)
        if not api_key:
            raise ValueError("API Key 不存在")
        api_key.is_active = is_active
        return api_key

    @staticmethod
    def delete(db: Session, api_key_id: str) -> None:
        """删除 API Key"""
        deleted = ApiKeyRepository.delete_by_id(db, api_key_id)
        if deleted == 0:
            raise ValueError("API Key 不存在")
