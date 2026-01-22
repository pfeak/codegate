"""
API Key 管理 API 路由
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.auth import AdminResponse
from ..schemas.api_key import (
    ApiKeyCreateRequest,
    ApiKeyResponse,
    ApiKeyWithSecretResponse,
    ApiKeyToggleRequest,
    ApiKeyListResponse,
)
from ..services.api_key.api_key_service import ApiKeyService
from ..api.auth import require_admin

router = APIRouter(prefix="/api", tags=["api_keys"])


@router.get("/projects/{project_id}/api-keys", response_model=ApiKeyListResponse)
def list_api_keys(
    project_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """获取项目的 API Key 列表（不返回 secret）"""
    keys = ApiKeyService.list_by_project(db, project_id)
    return ApiKeyListResponse(
        items=[ApiKeyResponse.model_validate(key) for key in keys],
        total=len(keys)
    )


@router.post("/projects/{project_id}/api-keys", response_model=ApiKeyWithSecretResponse)
def generate_or_refresh_api_key(
    project_id: str,
    payload: ApiKeyCreateRequest,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """生成或刷新 API Key（同一路由完成生成/刷新逻辑）"""
    if payload.project_id != project_id:
        raise HTTPException(status_code=400, detail="项目ID不匹配")
    api_key = ApiKeyService.generate_or_refresh(db, project_id, payload.name, current_admin.id)
    db.commit()
    db.refresh(api_key)
    return ApiKeyWithSecretResponse.model_validate(api_key)


@router.put("/api-keys/{api_key_id}", response_model=ApiKeyResponse)
def toggle_api_key(
    api_key_id: str,
    payload: ApiKeyToggleRequest,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """启用/禁用 API Key"""
    try:
        api_key = ApiKeyService.toggle_status(db, api_key_id, payload.is_active)
        db.commit()
        db.refresh(api_key)
        return ApiKeyResponse.model_validate(api_key)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/api-keys/{api_key_id}")
def delete_api_key(
    api_key_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """删除 API Key"""
    try:
        ApiKeyService.delete(db, api_key_id)
        db.commit()
        return {"success": True, "message": "删除 API Key 成功"}
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
