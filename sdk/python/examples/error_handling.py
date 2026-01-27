"""
CodeGate Python SDK 错误处理示例
"""

import requests
from codegate_sdk import CodeGateClient

client = CodeGateClient(
    api_key="550e8400e29b41d4a716446655440000",
    secret="a1b2c3d4e5f6...",
    project_id="550e8400e29b41d4a716446655440000"
)

try:
    # 核销激活码
    result = client.verify_code(code="ABC12345")
    
    if result['success']:
        print(f"核销成功: {result['message']}")
    else:
        error_code = result.get('error_code')
        if error_code == 'CODE_ALREADY_USED':
            print("激活码已被使用")
        elif error_code == 'CODE_NOT_FOUND':
            print("激活码不存在")
        elif error_code == 'CODE_DISABLED':
            print("激活码已禁用")
        elif error_code == 'CODE_EXPIRED':
            print("激活码已过期")
        else:
            print(f"核销失败: {result['message']}")

except requests.exceptions.HTTPError as e:
    if e.response.status_code == 401:
        print("认证失败：请检查 API Key 和 Secret")
    elif e.response.status_code == 403:
        print("权限不足：项目 ID 不匹配")
    elif e.response.status_code == 404:
        print("资源不存在")
    elif e.response.status_code == 429:
        print("请求频率过高，请稍后重试")
    else:
        print(f"请求失败: {e}")

except Exception as e:
    print(f"发生错误: {e}")
