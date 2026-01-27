"""
CodeGate Python SDK 基本使用示例
"""

from codegate_sdk import CodeGateClient

# 初始化客户端
client = CodeGateClient(
    api_key="550e8400e29b41d4a716446655440000",
    secret="a1b2c3d4e5f6...",
    project_id="550e8400e29b41d4a716446655440000",
    base_url="https://api.example.com"
)

# 获取项目信息
project = client.get_project()
print(f"Project: {project['name']}")
print(f"Total codes: {project['statistics']['total_codes']}")

# 查询激活码列表
codes = client.list_codes(page=1, page_size=20, status="unused")
print(f"Total codes: {codes['total']}")
for code_item in codes['items']:
    print(f"Code: {code_item['code']}, Status: {code_item['status']}")

# 查询单个激活码
code = client.get_code(code_id="660e8400e29b41d4a716446655440001")
print(f"Code: {code['code']}, Status: {code['status']}")

# 通过激活码内容查询
code = client.get_code_by_code("ABC12345")
print(f"Code: {code['code']}, Status: {code['status']}")

# 核销激活码
result = client.verify_code(code="ABC12345", verified_by="user123")
if result['success']:
    print(f"Code verified at: {result['verified_at']}")
else:
    print(f"Verification failed: {result['message']}")

# 重新激活激活码
result = client.reactivate_code(
    code="ABC12345",
    reactivated_by="admin123",
    reason="用户退款，需要重新激活"
)
if result['success']:
    print(f"Code reactivated at: {result['reactivated_at']}")
else:
    print(f"Reactivation failed: {result['message']}")

# 获取统计信息
stats = client.get_statistics()
print(f"Usage rate: {stats['usage_rate']}")
print(f"Used codes: {stats['used_codes']}")
print(f"Unused codes: {stats['unused_codes']}")
