"""
自定义异常类模块

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


class CodeGateException(Exception):
    """CodeGate 基础异常类"""
    pass


class ProjectNotFoundError(CodeGateException):
    """项目不存在异常"""

    def __init__(self, project_id: int):
        self.project_id = project_id
        super().__init__(f"项目 {project_id} 不存在")


class ProjectAlreadyExistsError(CodeGateException):
    """项目已存在异常"""

    def __init__(self, project_name: str):
        self.project_name = project_name
        super().__init__(f"项目 '{project_name}' 已存在")


class CodeNotFoundError(CodeGateException):
    """邀请码不存在异常"""

    def __init__(self, code: str):
        self.code = code
        super().__init__(f"邀请码 '{code}' 不存在")


class CodeAlreadyVerifiedError(CodeGateException):
    """邀请码已核销异常"""

    def __init__(self, code: str):
        self.code = code
        super().__init__(f"邀请码 '{code}' 已被核销")


class CodeExpiredError(CodeGateException):
    """邀请码已过期异常"""

    def __init__(self, code: str):
        self.code = code
        super().__init__(f"邀请码 '{code}' 已过期")


class ProjectDisabledError(CodeGateException):
    """项目已禁用异常"""

    def __init__(self, project_id: int):
        self.project_id = project_id
        super().__init__(f"项目 {project_id} 已禁用")


class ProjectExpiredError(CodeGateException):
    """项目已过期异常"""

    def __init__(self, project_id: int):
        self.project_id = project_id
        super().__init__(f"项目 {project_id} 已过期")


class CodeGenerationError(CodeGateException):
    """邀请码生成失败异常"""

    def __init__(self, message: str):
        self.message = message
        super().__init__(f"邀请码生成失败: {message}")


class ValidationError(CodeGateException):
    """数据验证失败异常"""

    def __init__(self, message: str):
        self.message = message
        super().__init__(f"数据验证失败: {message}")
