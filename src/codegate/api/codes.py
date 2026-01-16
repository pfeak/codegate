"""
邀请码 API 路由

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

from ..database import get_db
from ..schemas.invitation_code import (
    CodeGenerateRequest,
    InvitationCodeResponse,
    InvitationCodeListResponse,
)
from ..services.code import CodeService
from ..services.project import ProjectService
from ..core.exceptions import ProjectNotFoundError

router = APIRouter(prefix="/api/projects/{project_id}/codes", tags=["codes"])


@router.post("/generate", response_model=list[InvitationCodeResponse], status_code=201)
def generate_codes(
    project_id: int,
    request: CodeGenerateRequest,
    db: Session = Depends(get_db),
):
    """
    批量生成邀请码
    """
    try:
        codes = CodeService.generate(db=db, project_id=project_id, request=request)
        return [InvitationCodeResponse.model_validate(c) for c in codes]
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("", response_model=InvitationCodeListResponse)
def get_codes(
    project_id: int,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=100, description="每页数量"),
    status: Optional[bool] = Query(None, description="状态筛选"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
):
    """
    获取邀请码列表
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    codes, total = CodeService.get_list(
        db=db,
        project_id=project_id,
        page=page,
        page_size=page_size,
        status=status,
        search=search,
    )

    return InvitationCodeListResponse(
        total=total,
        page=page,
        page_size=page_size,
        items=[InvitationCodeResponse.model_validate(c) for c in codes],
    )


@router.get("/{code_id}", response_model=InvitationCodeResponse)
def get_code(
    project_id: int,
    code_id: int,
    db: Session = Depends(get_db),
):
    """
    获取邀请码详情
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    code = CodeService.get_by_id(db=db, code_id=code_id)
    if not code or code.project_id != project_id:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    return InvitationCodeResponse.model_validate(code)


@router.delete("/{code_id}", status_code=204)
def delete_code(
    project_id: int,
    code_id: int,
    db: Session = Depends(get_db),
):
    """
    删除邀请码
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    code = CodeService.get_by_id(db=db, code_id=code_id)
    if not code or code.project_id != project_id:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    success = CodeService.delete(db=db, code_id=code_id)
    if not success:
        raise HTTPException(status_code=404, detail="邀请码不存在")


@router.get("/code/{code}", response_model=InvitationCodeResponse)
def get_code_by_string(
    project_id: int,
    code: str,
    db: Session = Depends(get_db),
):
    """
    根据邀请码字符串获取详情
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    invitation_code = CodeService.get_by_code(db=db, code=code)
    if not invitation_code or invitation_code.project_id != project_id:
        raise HTTPException(status_code=404, detail="邀请码不存在")

    return InvitationCodeResponse.model_validate(invitation_code)
