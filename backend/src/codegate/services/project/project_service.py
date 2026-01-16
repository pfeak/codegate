"""
项目服务层

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
from datetime import datetime
from sqlalchemy.orm import Session

from ...models.project import Project
from ...schemas.project import ProjectCreate, ProjectUpdate
from ...core.exceptions import ProjectNotFoundError, ProjectAlreadyExistsError
from .project_repository import ProjectRepository


class ProjectService:
    """项目服务"""

    @staticmethod
    def create(db: Session, project_data: ProjectCreate) -> Project:
        """
        创建项目

        Args:
            db: 数据库会话
            project_data: 项目创建数据

        Returns:
            Project: 创建的项目

        Raises:
            ProjectAlreadyExistsError: 项目名称已存在
        """
        # 检查项目名称是否已存在
        existing = ProjectRepository.get_by_name(db, project_data.name)
        if existing:
            raise ProjectAlreadyExistsError(project_data.name)

        # 转换时间戳为datetime
        expires_at = None
        if project_data.expires_at is not None:
            expires_at = datetime.utcfromtimestamp(project_data.expires_at)

        project = Project(
            name=project_data.name,
            description=project_data.description,
            expires_at=expires_at,
            status=True,
        )
        return ProjectRepository.create(db, project)

    @staticmethod
    def get_by_id(db: Session, project_id: str) -> Optional[Project]:
        """
        根据ID获取项目

        Args:
            db: 数据库会话
            project_id: 项目ID

        Returns:
            Optional[Project]: 项目对象，不存在返回 None
        """
        return ProjectRepository.get_by_id(db, project_id)

    @staticmethod
    def get_list(
        db: Session,
        page: int = 1,
        page_size: int = 20,
        search: Optional[str] = None,
        status: Optional[bool] = None,
    ) -> tuple[list[Project], int]:
        """
        获取项目列表

        Args:
            db: 数据库会话
            page: 页码
            page_size: 每页数量
            search: 搜索关键词（项目名称或描述）
            status: 项目状态筛选

        Returns:
            tuple[list[Project], int]: (项目列表, 总数)
        """
        return ProjectRepository.get_list(db, page, page_size, search, status)

    @staticmethod
    def update(db: Session, project_id: str, project_data: ProjectUpdate) -> Optional[Project]:
        """
        更新项目

        Args:
            db: 数据库会话
            project_id: 项目ID
            project_data: 项目更新数据

        Returns:
            Optional[Project]: 更新后的项目，不存在返回 None

        Raises:
            ProjectNotFoundError: 项目不存在
        """
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        if project_data.name is not None:
            # 检查新名称是否与其他项目冲突
            existing = ProjectRepository.get_by_name(db, project_data.name)
            if existing and existing.id != project_id:
                raise ProjectAlreadyExistsError(project_data.name)
            project.name = project_data.name
        if project_data.description is not None:
            project.description = project_data.description
        if project_data.expires_at is not None:
            # 转换时间戳为datetime
            project.expires_at = datetime.utcfromtimestamp(project_data.expires_at)
        if project_data.status is not None:
            project.status = project_data.status

        return ProjectRepository.update(db, project)

    @staticmethod
    def delete(db: Session, project_id: str) -> bool:
        """
        删除项目

        Args:
            db: 数据库会话
            project_id: 项目ID

        Returns:
            bool: 是否删除成功

        Raises:
            ProjectNotFoundError: 项目不存在
        """
        project = ProjectRepository.get_by_id(db, project_id)
        if not project:
            raise ProjectNotFoundError(project_id)

        ProjectRepository.delete(db, project)
        return True
