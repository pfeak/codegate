"""
项目数据访问层

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
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ...models.project import Project


class ProjectRepository:
    """项目数据访问层"""

    @staticmethod
    def create(db: Session, project: Project) -> Project:
        """
        创建项目

        Args:
            db: 数据库会话
            project: 项目对象

        Returns:
            Project: 创建的项目
        """
        db.add(project)
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def get_by_id(db: Session, project_id: int) -> Optional[Project]:
        """
        根据ID获取项目

        Args:
            db: 数据库会话
            project_id: 项目ID

        Returns:
            Optional[Project]: 项目对象，不存在返回 None
        """
        return db.query(Project).filter(Project.id == project_id).first()

    @staticmethod
    def get_by_name(db: Session, name: str) -> Optional[Project]:
        """
        根据名称获取项目

        Args:
            db: 数据库会话
            name: 项目名称

        Returns:
            Optional[Project]: 项目对象，不存在返回 None
        """
        return db.query(Project).filter(Project.name == name).first()

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
        query = db.query(Project)

        # 搜索筛选
        if search:
            query = query.filter(
                or_(
                    Project.name.contains(search),
                    Project.description.contains(search),
                )
            )

        # 状态筛选
        if status is not None:
            query = query.filter(Project.status == status)

        # 总数
        total = query.count()

        # 分页
        offset = (page - 1) * page_size
        projects = query.order_by(Project.created_at.desc()).offset(offset).limit(page_size).all()

        return projects, total

    @staticmethod
    def update(db: Session, project: Project) -> Project:
        """
        更新项目

        Args:
            db: 数据库会话
            project: 项目对象

        Returns:
            Project: 更新后的项目
        """
        db.commit()
        db.refresh(project)
        return project

    @staticmethod
    def delete(db: Session, project: Project) -> None:
        """
        删除项目

        Args:
            db: 数据库会话
            project: 项目对象
        """
        db.delete(project)
        db.commit()

    @staticmethod
    def exists(db: Session, project_id: int) -> bool:
        """
        检查项目是否存在

        Args:
            db: 数据库会话
            project_id: 项目ID

        Returns:
            bool: 是否存在
        """
        return db.query(Project).filter(Project.id == project_id).first() is not None
