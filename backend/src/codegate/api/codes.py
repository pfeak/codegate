"""
激活码 API 路由

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
    CodeUpdateRequest,
    InvitationCodeResponse,
    InvitationCodeListResponse,
    BatchDisableUnusedRequest,
    BatchDisableUnusedResponse,
)
from ..schemas.auth import AdminResponse
from ..api.auth import require_admin
from ..services.code import CodeService
from ..services.project import ProjectService
from ..core.exceptions import ProjectNotFoundError, CodeNotFoundError, CodeAlreadyVerifiedError
from ..services.code.code_repository import CodeRepository

router = APIRouter(prefix="/api/projects/{project_id}/codes", tags=["codes"])


@router.post("/generate", response_model=list[InvitationCodeResponse], status_code=201)
def generate_codes(
    project_id: str,
    request: CodeGenerateRequest,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    批量生成激活码
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
    project_id: str,
    page: int = Query(1, ge=1, description="页码"),
    page_size: int = Query(50, ge=1, le=100, description="每页数量"),
    status: Optional[bool] = Query(None, description="状态筛选（True=已使用, False=未使用）"),
    is_disabled: Optional[bool] = Query(None, description="是否禁用筛选（True=已禁用, False=未禁用）"),
    is_expired: Optional[bool] = Query(None, description="是否过期筛选（True=已过期, False=未过期）"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取激活码列表
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
        is_disabled=is_disabled,
        is_expired=is_expired,
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
    project_id: str,
    code_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取激活码详情
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    code = CodeService.get_by_id(db=db, code_id=code_id)
    if not code or code.project_id != project_id:
        raise HTTPException(status_code=404, detail="激活码不存在")

    return InvitationCodeResponse.model_validate(code)


@router.delete("/{code_id}", status_code=204)
def delete_code(
    project_id: str,
    code_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    删除激活码
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    code = CodeService.get_by_id(db=db, code_id=code_id)
    if not code or code.project_id != project_id:
        raise HTTPException(status_code=404, detail="激活码不存在")

    success = CodeService.delete(db=db, code_id=code_id)
    if not success:
        raise HTTPException(status_code=404, detail="激活码不存在")


@router.post("/batch-disable-unused", response_model=BatchDisableUnusedResponse)
def batch_disable_unused(
    project_id: str,
    request: BatchDisableUnusedRequest,
    status: Optional[bool] = Query(None, description="状态筛选（True=已使用, False=未使用）"),
    is_disabled: Optional[bool] = Query(None, description="是否禁用筛选（True=已禁用, False=未禁用）"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    批量禁用未使用的激活码（根据当前筛选条件）

    仅禁用未使用的激活码（status=false 且 is_disabled=false）
    支持通过查询参数传递筛选条件
    """
    try:
        # 批量禁用仅针对未使用的激活码，所以固定 status=False, is_disabled=False
        # 但支持通过 search 参数进行进一步筛选
        disabled_count = CodeService.batch_disable_unused(
            db=db,
            project_id=project_id,
            status=False,  # 固定为未使用
            is_disabled=False,  # 固定为未禁用
            search=search,  # 支持搜索筛选
        )

        return BatchDisableUnusedResponse(
            success=True,
            message=f"已成功禁用 {disabled_count} 个激活码",
            disabled_count=disabled_count,
        )
    except ProjectNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/batch-disable-unused/count")
def batch_disable_unused_count(
    project_id: str,
    search: Optional[str] = Query(None, description="搜索关键词"),
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取当前筛选条件下可批量禁用的数量（用于前端确认弹框展示）。

    规则与 batch_disable_unused 一致：
    - 未使用(status=False)
    - 未禁用(is_disabled=False)
    - 未过期(is_expired=False)
    - 支持 search 进一步筛选
    """
    # 检查项目是否存在
    project = ProjectService.get_by_id(db=db, project_id=project_id)
    if not project:
        raise HTTPException(status_code=404, detail="项目不存在")

    count = CodeRepository.count_disable_unused(db=db, project_id=project_id, search=search)
    return {"count": count}


# 独立的激活码API路由（不依赖project_id）
router_standalone = APIRouter(prefix="/api/codes", tags=["codes"])


@router_standalone.get("/{code_id}", response_model=InvitationCodeResponse)
def get_code_standalone(
    code_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取激活码详情（独立路由）
    """
    code = CodeService.get_by_id(db=db, code_id=code_id)
    if not code:
        raise HTTPException(status_code=404, detail="激活码不存在")

    return InvitationCodeResponse.model_validate(code)


@router_standalone.put("/{code_id}", response_model=InvitationCodeResponse)
def update_code(
    code_id: str,
    update_data: CodeUpdateRequest,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    更新激活码（支持禁用/启用操作）
    """
    try:
        code = CodeService.update_by_id(db=db, code_id=code_id, update_data=update_data)
        return InvitationCodeResponse.model_validate(code)
    except CodeNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router_standalone.post("/{code_id}/reactivate", response_model=InvitationCodeResponse)
def reactivate_code(
    code_id: str,
    db: Session = Depends(get_db),
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    重新激活激活码（将状态从"已使用"改为"未使用"）

    根据设计文档 code_status_logic.md 的要求：
    - 前置条件：status=True（已使用）且 is_disabled=False（未禁用）且 is_expired=False（未过期）
    - 操作结果：status=False，清除 verified_at 和 verified_by，expires_at 保持不变
    """
    code = CodeService.get_by_id(db=db, code_id=code_id)
    if not code:
        raise HTTPException(status_code=404, detail="激活码不存在")

    # 检查前置条件
    if not code.status:
        raise HTTPException(status_code=400, detail="激活码未使用，无需重新激活")

    if code.is_disabled:
        raise HTTPException(status_code=400, detail="已禁用的激活码无法重新激活")

    if code.is_expired:
        raise HTTPException(status_code=400, detail="已过期的激活码无法重新激活")

    # 重新激活：将状态改为未使用，清除核销时间和核销用户，过期时间保持不变
    code.status = False
    code.verified_at = None
    code.verified_by = None
    # expires_at 保持不变（根据设计文档要求）

    updated_code = CodeService.update(db=db, code=code)
    return InvitationCodeResponse.model_validate(updated_code)
