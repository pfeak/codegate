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
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/docs", tags=["docs"])


def _resolve_docs_base_path() -> Path:
    """
    解析文档目录。

    说明：
    - 开发环境通常直接从源码目录运行（cwd 往往是 backend/），相对路径可用
    - Docker 镜像内使用 `pip install .` 后，__file__ 会指向 site-packages，
      不能再用 `Path(__file__).parents[...]` 推导到仓库根目录
    """
    env_path = settings.CODEGATE_DOCS_BASE_PATH
    candidates: list[Path] = []

    if env_path:
        candidates.append(Path(env_path))

    # 最常见：容器 WORKDIR=/app 且 docs 被复制到 /app/docs/...
    candidates.append(Path.cwd() / "docs" / "sdk_api")

    # 兼容直接从 backend/ 或仓库根目录运行的情况
    candidates.append(Path.cwd() / "backend" / "docs" / "sdk_api")

    # 回退：若仍是从源码运行（而不是 site-packages），这个推导仍然有效
    candidates.append(Path(__file__).resolve().parents[4] / "docs" / "sdk_api")

    for p in candidates:
        if p.exists():
            return p

    # 都不存在时，返回“最合理”的默认值，便于日志里看到期望路径
    return candidates[0] if candidates else (Path.cwd() / "docs" / "sdk_api")


DOCS_BASE_PATH = _resolve_docs_base_path()


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


@router.get("/javascript-sdk", response_class=PlainTextResponse)
def get_javascript_sdk_doc(
    current_admin: AdminResponse = Depends(require_admin),
):
    """
    获取 JavaScript/TypeScript SDK 文档内容
    """
    doc_path = DOCS_BASE_PATH / "javascript.md"

    if not doc_path.exists():
        logger.error(f"文档文件不存在: {doc_path}")
        raise HTTPException(status_code=404, detail="文档文件不存在")

    try:
        content = doc_path.read_text(encoding="utf-8")
        return content
    except Exception as e:
        logger.error(f"读取文档文件失败: {e}")
        raise HTTPException(status_code=500, detail=f"读取文档文件失败: {str(e)}")
