"""
API Key 数据访问层
"""
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select, delete

from ...models.api_key import ApiKey


class ApiKeyRepository:
    """API Key 数据访问层"""

    @staticmethod
    def list_by_project(db: Session, project_id: str) -> List[ApiKey]:
        """按项目获取 API Key 列表"""
        stmt = select(ApiKey).where(ApiKey.project_id == project_id).order_by(ApiKey.created_at.desc())
        return list(db.execute(stmt).scalars().all())

    @staticmethod
    def get_by_id(db: Session, api_key_id: str) -> Optional[ApiKey]:
        """根据 ID 获取 API Key"""
        stmt = select(ApiKey).where(ApiKey.id == api_key_id)
        return db.execute(stmt).scalar_one_or_none()

    @staticmethod
    def delete_by_id(db: Session, api_key_id: str) -> int:
        """根据 ID 删除 API Key，返回删除数量"""
        stmt = delete(ApiKey).where(ApiKey.id == api_key_id)
        result = db.execute(stmt)
        return result.rowcount or 0

    @staticmethod
    def delete_by_project(db: Session, project_id: str) -> int:
        """删除项目下的所有 API Key，返回删除数量"""
        stmt = delete(ApiKey).where(ApiKey.project_id == project_id)
        result = db.execute(stmt)
        return result.rowcount or 0

    @staticmethod
    def create(db: Session, api_key: ApiKey) -> ApiKey:
        """创建 API Key"""
        db.add(api_key)
        return api_key
