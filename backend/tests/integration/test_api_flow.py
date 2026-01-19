"""
API 流程集成测试

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
from fastapi.testclient import TestClient

from codegate.main import app


def _login_headers(client: TestClient) -> dict[str, str]:
    """使用默认管理员登录并返回认证头"""
    resp = client.post(
        "/api/auth/login",
        json={"username": "admin", "password": "123456"},
    )
    assert resp.status_code == 200
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


class TestAPIFlow:
    """API 流程集成测试类"""

    def test_create_project_and_generate_codes(self):
        """测试创建项目并生成激活码的完整流程"""
        with TestClient(app) as client:
            headers = _login_headers(client)

            # 1. 创建项目（使用唯一名称避免重复运行冲突）
            import uuid
            project_data = {
                "name": f"集成测试项目-{uuid.uuid4().hex}",
                "description": "用于集成测试的项目",
            }
            response = client.post("/api/projects", json=project_data, headers=headers)
            assert response.status_code == 201
            project = response.json()
            project_id = project["id"]

            # 2. 生成激活码
            code_request = {
                "count": 5,
                "length": 12,
            }
            response = client.post(
                f"/api/projects/{project_id}/codes/generate",
                json=code_request,
                headers=headers,
            )
            assert response.status_code == 201
            codes = response.json()
            assert len(codes) == 5

            # 3. 获取激活码列表
            response = client.get(f"/api/projects/{project_id}/codes", headers=headers)
            assert response.status_code == 200
            code_list = response.json()
            assert code_list["total"] == 5

            # 4. 核销激活码
            code = codes[0]["code"]
            verify_request = {
                "code": code,
                "verified_by": "test_user",
            }
            response = client.post("/api/codes/verify", json=verify_request, headers=headers)
            assert response.status_code == 200
            verify_result = response.json()
            assert verify_result["success"] is True

            # 5. 再次核销同一激活码（应该失败）
            response = client.post("/api/codes/verify", json=verify_request, headers=headers)
            assert response.status_code == 200
            verify_result = response.json()
            assert verify_result["success"] is False

            # 6. 核销不存在的激活码（应该业务失败，不能 500）
            response = client.post(
                "/api/codes/verify",
                json={"code": "THIS_CODE_DOES_NOT_EXIST", "verified_by": "test_user"},
                headers=headers,
            )
            assert response.status_code == 200
            verify_result = response.json()
            assert verify_result["success"] is False
            assert "不存在" in verify_result["message"]
