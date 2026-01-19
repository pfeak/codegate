"""
pytest 全局配置

确保测试环境不依赖本地持久化数据库状态。
"""

import os

# 必须在任何 `codegate.*` 模块导入之前设置，否则 settings/engine 会按默认值初始化
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
