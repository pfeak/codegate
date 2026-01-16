"""
全局常量定义模块

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

# 邀请码生成配置
DEFAULT_CODE_LENGTH = 12
MIN_CODE_LENGTH = 4
MAX_CODE_LENGTH = 32
DEFAULT_CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 排除易混淆字符（0, O, I, 1）

# 分页配置
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100
MIN_PAGE = 1

# 批量操作限制
MAX_BATCH_GENERATE_COUNT = 10000
MAX_BATCH_DELETE_COUNT = 1000
MAX_BATCH_IMPORT_COUNT = 50000

# 项目配置
MAX_PROJECT_NAME_LENGTH = 100
MAX_PROJECT_DESCRIPTION_LENGTH = 1000

# 邀请码配置
MAX_CODE_PREFIX_LENGTH = 10
MAX_CODE_SUFFIX_LENGTH = 10

# 文件上传配置
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_IMPORT_FORMATS = ["csv", "json"]

# 验证配置
MAX_VERIFICATION_ATTEMPTS = 5  # 同一IP的最大验证尝试次数
VERIFICATION_RATE_LIMIT_SECONDS = 60  # 验证频率限制（秒）

# 数据清理配置
DEFAULT_CLEANUP_RETENTION_DAYS = 90  # 默认保留天数
