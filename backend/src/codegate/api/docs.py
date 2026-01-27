"""
文档 API 路由

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
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from pathlib import Path
import logging

from ..schemas.auth import AdminResponse
from ..api.auth import require_admin

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/docs", tags=["docs"])

# 文档文件路径（相对于 backend 目录）
DOCS_BASE_PATH = Path(__file__).parent.parent.parent.parent / "docs" / "sdk_api"


@router.get("/sdk-api", response_class=PlainTextResponse)
def get_sdk_api_doc(
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取 SDK API 文档内容
    """
    doc_path = DOCS_BASE_PATH / "README.md"

    if not doc_path.exists():
        logger.error(f"文档文件不存在: {doc_path}")
        raise HTTPException(status_code=404, detail="文档文件不存在")

    try:
        content = doc_path.read_text(encoding="utf-8")
        return content
    except Exception as e:
        logger.error(f"读取文档文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"读取文档文件失败: {str(e)}")


@router.get("/python-sdk", response_class=PlainTextResponse)
def get_python_sdk_doc(
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取 Python SDK 文档内容
    """
    doc_path = DOCS_BASE_PATH / "python.md"

    if not doc_path.exists():
        logger.error(f"文档文件不存在: {doc_path}")
        raise HTTPException(status_code=404, detail="文档文件不存在")

    try:
        content = doc_path.read_text(encoding="utf-8")
        return content
    except Exception as e:
        logger.error(f"读取文档文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"读取文档文件失败: {str(e)}")
