"""
项目模型测试

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
from datetime import datetime, timedelta

from codegate.models.project import Project


class TestProject:
    """项目模型测试类"""

    def test_project_creation(self):
        """测试项目创建"""
        project = Project(
            name="测试项目",
            description="测试描述",
            status=True,
        )
        assert project.name == "测试项目"
        assert project.description == "测试描述"
        assert project.status is True
        assert project.expires_at is None

    def test_project_is_expired(self):
        """测试项目过期检查"""
        # 未过期项目
        project1 = Project(
            name="未过期项目",
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
        assert project1.is_expired is False

        # 已过期项目
        project2 = Project(
            name="已过期项目",
            expires_at=datetime.utcnow() - timedelta(days=1),
        )
        assert project2.is_expired is True

        # 无过期时间项目
        project3 = Project(name="无过期时间项目")
        assert project3.is_expired is False

    def test_project_is_active(self):
        """测试项目激活状态检查"""
        # 启用且未过期
        project1 = Project(
            name="激活项目",
            status=True,
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
        assert project1.is_active is True

        # 禁用项目
        project2 = Project(
            name="禁用项目",
            status=False,
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
        assert project2.is_active is False

        # 已过期项目
        project3 = Project(
            name="已过期项目",
            status=True,
            expires_at=datetime.utcnow() - timedelta(days=1),
        )
        assert project3.is_active is False
