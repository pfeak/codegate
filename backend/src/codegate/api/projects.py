"""
项目 API 路由

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
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from fastapi import Request

from ..database import get_db
from ..models.project import Project
from ..schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from ..schemas.auth import AdminResponse
from ..services.project import ProjectService
from ..api.auth import require_admin
from ..core.exceptions import (
    ProjectNotFoundError,
    ProjectAlreadyExistsError,
)
from ..utils.audit_log import log_admin

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=ProjectListResponse)
def get_projects(
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(10, ge=1, le=100, description="每页数量"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    status: Optional[bool] = Query(None, description="项目状态"),
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取项目列表
    """
    projects, total = ProjectService.get_list(
        db=db,
        page=page,
        page_size=page_size,
        search=search,
        status=status,
    )

    return ProjectListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[ProjectResponse.model_validate(p) for p in projects],
    )


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(
    request: Request,
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    创建项目
    """
    try:
        project = ProjectService.create(db=db, project_data=project_data)
        # 记录审计日志
        log_admin(db, "create_project", current_admin.id, "project", project.id, "success",
                  request=request, project_name=project.name, description=project.description)
        db.commit()
        return ProjectResponse.model_validate(project)
    except ProjectAlreadyExistsError as e:
        # 记录失败审计日志
        log_admin(db, "create_project", current_admin.id, "project", None, "failed",
                  request=request, project_name=project_data.name, reason=str(e))
        db.commit()
        raise HTTPException(status_code=409, detail=str(e))


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取项目详情
    """
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    stats = ProjectService.get_code_stats(db=db, project_id=project_id)

    return ProjectResponse.model_validate(
        {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "created_at": project.created_at,
            "expires_at": project.expires_at,
            "status": project.status,
            "is_expired": project.is_expired,
            "is_active": project.is_active,
            "code_count": stats["total"],
            "verified_count": stats["verified"],
            "unverified_count": stats["unverified"],
            "expired_count": stats["expired"],
        }
    )


@router.put("/{project_id}", response_model=ProjectResponse)
def update_project(
    request: Request,
    project_id: str,
    project_data: ProjectUpdate,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    更新项目
    """
    try:
        # 获取更新前的项目信息
        old_project = ProjectService.get_by_id(db=db, project_id=project_id)
        old_data = {
            "name": old_project.name if old_project else None,
            "description": old_project.description if old_project else None,
            "status": old_project.status if old_project else None,
            "expires_at": old_project.expires_at.isoformat() if old_project and old_project.expires_at else None,
        } if old_project else None

        project = ProjectService.update(db=db, project_id=project_id, project_data=project_data)

        # 记录审计日志
        new_data = {
            "name": project.name,
            "description": project.description,
            "status": project.status,
            "expires_at": project.expires_at.isoformat() if project.expires_at else None,
        }
        log_admin(db, "update_project", current_admin.id, "project", project_id, "success",
                  request=request, before=old_data, after=new_data)
        db.commit()
        return ProjectResponse.model_validate(project)
    except ProjectNotFoundError as e:
        log_admin(db, "update_project", current_admin.id, "project", project_id, "failed",
                  request=request, reason=str(e))
        db.commit()
        raise HTTPException(status_code=404, detail=str(e))
    except ProjectAlreadyExistsError as e:
        log_admin(db, "update_project", current_admin.id, "project", project_id, "failed",
                  request=request, reason=str(e))
        db.commit()
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{project_id}", status_code=204)
def delete_project(
    request: Request,
    project_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    删除项目
    """
    try:
        # 获取删除前的项目信息
        old_project = ProjectService.get_by_id(db=db, project_id=project_id)
        deleted_data = {
            "name": old_project.name if old_project else None,
            "description": old_project.description if old_project else None,
        } if old_project else None

        ProjectService.delete(db=db, project_id=project_id)

        # 记录审计日志
        log_admin(db, "delete_project", current_admin.id, "project", project_id, "success",
                  request=request, deleted=deleted_data)
        db.commit()
    except ProjectNotFoundError as e:
        log_admin(db, "delete_project", current_admin.id, "project", project_id, "failed",
                  request=request, reason=str(e))
        db.commit()
        raise HTTPException(status_code=404, detail=str(e))
