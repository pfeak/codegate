# SDK 远程调用 API 设计文档

> **文档职责**：此文档定义 CodeGate 项目的 SDK 远程调用 API 规范，用于提供 Python SDK 集成能力。这些 API 采用行业标准的 HMAC-SHA256 签名认证方式（类似 AWS Signature），Secret 永不传输，操作范围限定在单个项目内，便于其他项目快速集成。
>
> **相关文档**：
>
> - 后端全局规范请参考 [`../../../common/backend/backend_prd_default.md`](../../../common/backend/backend_prd_default.md)
> - 项目业务逻辑请参考 [`../project.md`](../project.md)
> - 激活码状态逻辑请参考 [`../code_status_logic.md`](../code_status_logic.md)
> - Python SDK 实现请参考 [`python.md`](./python.md)

---

## 0. SDK 包结构

### 0.1 目录结构

CodeGate SDK 采用多语言 SDK 目录结构，各语言 SDK 位于独立的目录中：

```
codegate/
├── sdk/                      # SDK 根目录
│   ├── python/               # Python SDK（已完成）
│   │   ├── src/
│   │   │   └── codegate_sdk/ # SDK 包源码
│   │   │       ├── __init__.py
│   │   │       ├── signature.py  # 签名计算模块
│   │   │       └── client.py      # 客户端实现
│   │   ├── tests/            # 测试文件
│   │   ├── pyproject.toml    # Python 包配置（独立构建）
│   │   └── README.md         # Python SDK 文档
│   ├── javascript/           # JavaScript/TypeScript SDK（计划中）
│   ├── go/                   # Go SDK（计划中）
│   ├── java/                 # Java SDK（计划中）
│   └── README.md             # SDK 总览文档
└── backend/                  # 后端服务（独立项目）
    └── pyproject.toml         # 后端项目配置（整包嵌入位置）
```

### 0.2 构建和安装

#### Python SDK

Python SDK 使用独立的 `pyproject.toml` 配置，可以通过 `uv build` 构建：

```bash
# 进入 Python SDK 目录
cd sdk/python

# 构建包
uv build

# 构建产物位于 dist/ 目录
# - codegate-sdk-0.1.0-py3-none-any.whl
# - codegate-sdk-0.1.0.tar.gz
```

**安装方式**：

```bash
# 从本地构建的 wheel 文件安装
pip install dist/codegate-sdk-0.1.0-py3-none-any.whl

# 或使用 uv
uv pip install dist/codegate-sdk-0.1.0-py3-none-any.whl
```

**包信息**：
- **包名**：`codegate-sdk`
- **版本**：`0.1.0`
- **Python 版本要求**：`>=3.10`
- **依赖**：`requests>=2.28.0`

#### 其他语言 SDK

其他语言的 SDK 将在未来版本中提供，目录结构已预留。

### 0.3 设计说明

**重要**：
- SDK 包与后端服务包（`backend/pyproject.toml`）是**完全独立**的
- 后端 `pyproject.toml` 用于整包嵌入场景（将来可能将后端作为库嵌入其他项目）
- SDK 包仅包含客户端代码，不包含服务端代码
- 每个语言的 SDK 都有独立的构建配置和版本管理

---

## 1. 概述

### 1.1 设计目标

- **快速集成**：为第三方项目提供简单易用的 API，支持 Python SDK 封装
- **安全认证**：使用 API Key + HMAC 签名认证（行业标准），Secret 永不传输，确保接口安全
- **项目隔离**：每个项目都有独立的 API Key 和 Secret，操作范围严格限制在该项目内
- **RESTful 设计**：遵循 RESTful 规范，提供清晰的接口语义

### 1.2 适用场景

- 第三方系统需要集成激活码核销功能
- 移动应用、Web 应用需要验证激活码
- 自动化系统需要批量查询激活码状态
- 需要将 CodeGate 作为服务集成到现有业务系统

### 1.3 与现有 API 的区别

| 特性 | 管理 API（现有） | SDK API（新增） |
|------|----------------|----------------|
| 认证方式 | Cookie Session / Bearer Token（管理员登录） | API Key + HMAC 签名 |
| 权限范围 | 所有项目（管理员权限） | 单个项目（项目级别） |
| 使用场景 | 管理后台操作 | 第三方系统集成 |
| 操作类型 | 完整的 CRUD 操作 | 只读查询 + 核销操作 + 重新激活 |
| 路径前缀 | `/api/*` | `/api/v1/*` |

---

## 2. 认证机制

### 2.1 API Key 和 Secret

#### 2.1.1 生成方式

- **重要特性**：**每个项目都有独立的 API Key 和 Secret**，不同项目之间的凭证互不干扰
- **生成位置**：在项目详情页的"API 密钥"管理界面，管理员可以为项目生成、刷新、删除 API Key 和 Secret
- **生成规则**：
  - API Key：32 位 UUID（去除连字符），格式：`550e8400e29b41d4a716446655440000`
  - Secret：随机生成的 64 位十六进制字符串，格式：`a1b2c3d4e5f6...`（64 个字符）
  - 生成后立即显示，后续不可再次查看（仅支持刷新重新生成）
- **管理功能**：
  - **生成**：为项目创建新的 API Key 和 Secret
  - **刷新**：重新生成 API Key 和 Secret（旧凭证立即失效）
  - **删除**：删除项目的 API Key 和 Secret（删除后立即失效）
- **存储方式**：
  - **Secret 明文存储**：由于 HMAC 签名算法需要原始 Secret 进行计算，Secret 必须以明文形式存储在数据库中
  - **安全措施**：
    - 数据库访问控制：限制数据库访问权限，仅允许应用服务器访问
    - 加密存储（可选）：在生产环境中，可以使用数据库加密功能或应用层加密（AES-256）对 Secret 进行加密存储
    - 传输加密：所有 API 请求必须使用 HTTPS
    - 审计日志：记录所有 API Key 的生成、使用、禁用操作
  - API Key 明文存储（用于查询和匹配）
- **绑定关系**：每个 API Key 绑定到单个项目（`project_id`）

#### 2.1.2 数据模型

**新增数据表：`api_keys`**

```python
class ApiKey(Base):
    __tablename__ = "api_keys"
    
    id: str = Column(String(32), primary_key=True)  # UUID 去除连字符
    project_id: str = Column(String(32), ForeignKey("projects.id"), nullable=False, index=True)
    api_key: str = Column(String(32), unique=True, nullable=False, index=True)  # 明文存储
    secret: str = Column(String(64), nullable=False)  # 明文存储（HMAC 签名需要原始值）
    name: str = Column(String(100), nullable=True)  # 可选的 API Key 名称（便于管理）
    is_active: bool = Column(Boolean, default=True, nullable=False)  # 是否启用
    last_used_at: DateTime = Column(DateTime, nullable=True)  # 最后使用时间
    created_at: DateTime = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by: str = Column(String(32), ForeignKey("admins.id"), nullable=False)  # 创建者
```

**索引设计**：

- 主键索引：`id`
- 唯一索引：`api_key`
- 查询索引：`(project_id, is_active)`
- 时间索引：`last_used_at`

#### 2.1.3 管理功能（界面操作）

所有 API Key 和 Secret 的管理操作都在项目详情页的"API 密钥"管理界面完成：

- **生成 API Key**：
  - 操作位置：项目详情页 → "API 密钥"标签页 → "生成密钥"按钮
  - 功能：为当前项目生成新的 API Key 和 Secret
  - 响应：返回 `api_key`、`secret` 和 `project_id`（仅显示一次，必须立即保存）

    ```json
    {
      "id": "880e8400e29b41d4a716446655440003",
      "api_key": "550e8400e29b41d4a716446655440000",
      "secret": "a1b2c3d4e5f6...",
      "project_id": "550e8400e29b41d4a716446655440000",
      "name": "生产环境 API Key",
      "created_at": 1704067200
    }
    ```

  - **重要**：生成后必须立即保存 `api_key`、`secret` 和 `project_id`，后续无法再次查看 Secret

- **刷新 API Key**：
  - 操作位置：项目详情页 → "API 密钥"标签页 → "刷新密钥"按钮
  - 功能：重新生成 API Key 和 Secret（旧凭证立即失效）
  - 响应：返回新的 `api_key`、`secret` 和 `project_id`（仅显示一次）
  - **注意**：刷新后，旧的 API Key 和 Secret 立即失效，使用旧凭证的请求将返回 401 错误

- **删除 API Key**：
  - 操作位置：项目详情页 → "API 密钥"标签页 → "删除密钥"按钮
  - 功能：删除项目的 API Key 和 Secret（删除后立即失效）
  - 确认：删除操作需要二次确认，防止误操作
  - **注意**：删除后，该项目的 API Key 和 Secret 立即失效，使用该凭证的请求将返回 401 错误

- **查看 API Key 信息**：
  - 操作位置：项目详情页 → "API 密钥"标签页
  - 显示信息：`api_key`、`name`、`is_active`、`last_used_at`、`created_at`
  - **不显示**：Secret 不会显示（出于安全考虑）

#### 2.1.4 Project ID 获取方式

SDK 客户端需要知道 `project_id` 才能调用 API。有以下几种方式获取：

1. **生成 API Key 时获取**（推荐）：
   - 生成 API Key 时，响应中包含 `project_id`
   - 将 `project_id` 与 `api_key`、`secret` 一起保存到配置文件

2. **通过 API Key 查询**（如果忘记）：
   - 虽然 SDK API 需要 project_id，但可以通过管理 API 查询：
   - `GET /api/api-keys/{api_key_id}` - 返回 API Key 信息（包含 `project_id`）
   - 或者查看项目详情页的 API Key 列表，每个 API Key 都显示绑定的项目 ID

3. **SDK 客户端配置示例**：

   ```python
   # config.py 或环境变量
   CODEGATE_API_KEY = "550e8400e29b41d4a716446655440000"
   CODEGATE_SECRET = "a1b2c3d4e5f6..."
   CODEGATE_PROJECT_ID = "550e8400e29b41d4a716446655440000"  # 必须配置
   CODEGATE_BASE_URL = "https://api.example.com"
   ```

### 2.2 认证方式（HMAC 签名认证）

#### 2.2.1 认证原理

采用行业标准的 **HMAC-SHA256 签名认证**方式（类似 AWS Signature、阿里云 API Gateway），确保 Secret 不会在网络传输中暴露：

- **API Key**：在 HTTP Header 中传递（可公开）
- **Secret**：**不直接传递**，而是用于生成请求签名
- **签名验证**：服务器使用相同的算法验证签名，确保请求的完整性和真实性

**优势**：

- ✅ Secret 永不传输，即使请求被拦截也无法获取 Secret
- ✅ 防止重放攻击（通过时间戳验证）
- ✅ 防止请求篡改（签名包含请求内容）
- ✅ 所有编程语言通用（标准 HMAC 算法）

#### 2.2.2 HTTP Header 要求

所有 SDK API 请求必须在 HTTP Header 中包含以下信息：

```shell
X-API-Key: {api_key}
X-Timestamp: {timestamp}
X-Signature: {signature}
```

**Header 说明**：

- `X-API-Key`：API Key（32 位 UUID，无连字符）
- `X-Timestamp`：Unix 时间戳（秒级，UTC 时间）
- `X-Signature`：HMAC-SHA256 签名（十六进制字符串，64 个字符）

#### 2.2.3 签名生成算法

**步骤 1：构建签名字符串（String to Sign）**

签名字符串由以下部分按顺序拼接（使用换行符 `\n` 分隔）：

```txt
{http_method}\n
{request_path}\n
{query_string}\n
{request_body_hash}\n
{timestamp}
```

**字段说明**：

- `http_method`：HTTP 方法（大写），如 `GET`、`POST`、`PUT`、`DELETE`
- `request_path`：请求路径（不含查询参数），如 `/api/v1/projects/{project_id}`
- `query_string`：查询参数字符串（URL 编码，按键名排序，格式：`key1=value1&key2=value2`），如果无查询参数则为空字符串
- `request_body_hash`：请求体的 SHA256 哈希值（十六进制，小写），如果无请求体则使用空字符串的哈希值
  - **空字符串哈希常量**：`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
  - 这是空字符串 `""` 的 SHA256 哈希值，所有语言实现必须使用此常量值
- `timestamp`：Unix 时间戳（秒级，与 `X-Timestamp` Header 相同）

**步骤 2：计算 HMAC-SHA256 签名**

使用 Secret 作为密钥，对签名字符串进行 HMAC-SHA256 计算：

```python
signature = HMAC-SHA256(secret, string_to_sign)
```

然后将结果转换为十六进制字符串（小写，64 个字符）。

**步骤 3：设置 HTTP Header**

将计算得到的签名设置到 `X-Signature` Header 中。

#### 2.2.4 服务器端验证流程

1. **提取 Header**：从请求 Header 中提取 `X-API-Key`、`X-Timestamp`、`X-Signature`
2. **时间戳验证**：检查 `X-Timestamp` 是否在允许的时间窗口内（默认 ±5 分钟，可配置）
   - 如果时间戳过期，返回 `401 Unauthorized`，错误信息：`"Timestamp expired"`
3. **查询 API Key**：根据 `X-API-Key` 查询 `api_keys` 表
   - 如果不存在或 `is_active=False`，返回 `401 Unauthorized`
4. **获取 Secret**：从数据库获取 Secret（明文，用于签名验证）
5. **构建签名字符串**：使用与客户端相同的算法构建签名字符串
6. **计算签名**：使用 Secret 计算 HMAC-SHA256 签名
7. **验证签名**：比较计算得到的签名与 `X-Signature` Header 是否一致
   - 如果不一致，返回 `401 Unauthorized`，错误信息：`"Invalid signature"`
8. **验证项目 ID 匹配**：比较路径参数中的 `project_id`（如果存在）与 API Key 绑定的项目 ID
   - 如果路径中包含 `project_id`，必须与 `api_keys.project_id` 完全匹配
   - 如果不匹配，返回 `403 Forbidden`，错误信息：`"Project ID in path does not match API Key's project"`
9. **验证项目状态**：检查项目是否启用（`status=True`）且未过期
10. **更新使用时间**：认证成功后，更新 `api_keys.last_used_at` 为当前时间

#### 2.2.5 时间戳防重放

- **时间窗口**：默认 ±5 分钟（300 秒），可通过环境变量 `SDK_SIGNATURE_TIMESTAMP_WINDOW` 配置
- **验证逻辑**：服务器时间戳与请求时间戳的差值必须在时间窗口内
- **错误响应**：

  ```json
  {
    "detail": "Timestamp expired. Request timestamp is too old or too far in the future."
  }
  ```

#### 2.2.6 认证失败响应

- **401 Unauthorized**：认证失败
  - API Key 不存在或已禁用
  - 时间戳过期
  - 签名验证失败
  - 项目已禁用或已过期
- **403 Forbidden**：权限不足
  - 路径中的 `project_id` 与 API Key 绑定的项目 ID 不匹配
- **响应格式**：

  ```json
  {
    "detail": "Invalid API credentials"
  }
  ```

---

## 3. API 端点设计

### 3.1 路径前缀与资源层级

所有 SDK API 使用统一路径前缀：`/api/v1/*`

**设计原则**（遵循 RESTful 和行业标准）：

- **版本控制**：使用 `/api/v1` 作为路径前缀，便于未来版本升级和兼容性管理
- **资源层级明确**：激活码资源属于项目，路径中明确体现层级关系：`/api/v1/projects/{project_id}/codes`
- **双重验证**：路径中的 `project_id` 必须与 API Key 绑定的项目匹配，提供额外的安全验证
- **清晰语义**：URL 自文档化，开发者可以清楚知道操作的是哪个项目的资源
- **参考标准**：类似 GitHub API（`/orgs/{org}/projects`）、Google Cloud API 的设计模式

### 3.2 项目信息 API

#### 3.2.1 获取项目信息

**端点**：`GET /api/v1/projects/{project_id}`

**功能**：获取指定项目的详细信息

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：路径中的 `project_id` 必须与 API Key 绑定的项目 ID 完全匹配
  - 如果不匹配，返回 `403 Forbidden`

**响应**：

```json
{
  "id": "550e8400e29b41d4a716446655440000",
  "name": "示例项目",
  "description": "项目描述",
  "status": true,
  "expires_at": 1735689600,
  "created_at": 1704067200,
  "statistics": {
    "total_codes": 1000,
    "used_codes": 500,
    "unused_codes": 400,
    "disabled_codes": 50,
    "expired_codes": 50
  }
}
```

### 3.3 激活码查询 API

#### 3.3.1 查询激活码列表

**端点**：`GET /api/v1/projects/{project_id}/codes`

**功能**：查询指定项目下的激活码列表（支持分页和筛选）

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：必须与 API Key 绑定的项目 ID 匹配

**查询参数**：

- `page`（可选，默认 1）：页码，>= 1
- `page_size`（可选，默认 20，最大 100）：每页数量
- `status`（可选）：状态筛选
  - `unused`：未使用
  - `used`：已使用
  - `disabled`：已禁用
  - `expired`：已过期
- `search`（可选）：搜索关键词（搜索激活码内容）

**响应**：

```json
{
  "items": [
    {
      "id": "660e8400e29b41d4a716446655440001",
      "code": "ABC12345",
      "status": false,
      "is_disabled": false,
      "is_expired": false,
      "expires_at": 1735689600,
      "verified_at": null,
      "verified_by": null,
      "created_at": 1704067200
    }
  ],
  "total": 1000,
  "page": 1,
  "page_size": 20,
  "total_pages": 50
}
```

#### 3.3.2 查询单个激活码详情

**端点**：`GET /api/v1/projects/{project_id}/codes/{code_id}`

**功能**：查询指定项目下单个激活码的详细信息

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：必须与 API Key 绑定的项目 ID 匹配
- `code_id`：激活码 ID（32 位 UUID，无连字符）

**响应**：

```json
{
  "id": "660e8400e29b41d4a716446655440001",
  "code": "ABC12345",
  "status": false,
  "is_disabled": false,
  "is_expired": false,
  "expires_at": 1735689600,
  "verified_at": null,
  "verified_by": null,
  "created_at": 1704067200,
  "verification_logs": [
    {
      "id": "770e8400e29b41d4a716446655440002",
      "verified_at": 1704153600,
      "verified_by": "user123",
      "ip_address": "192.168.1.1",
      "result": "success"
    }
  ]
}
```

#### 3.3.3 通过激活码内容查询

**端点**：`GET /api/v1/projects/{project_id}/codes/by-code/{code}`

**功能**：通过激活码内容（而非 ID）查询指定项目下的激活码信息

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：必须与 API Key 绑定的项目 ID 匹配
- `code`：激活码内容（URL 编码）

**响应**：与 `GET /api/v1/projects/{project_id}/codes/{code_id}` 相同

**错误响应**：

- **404 Not Found**：激活码不存在或不属于当前项目

### 3.4 激活码核销 API

#### 3.4.1 核销激活码

**端点**：`POST /api/v1/projects/{project_id}/codes/verify`

**功能**：核销验证指定项目下的激活码（核心功能）

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：必须与 API Key 绑定的项目 ID 匹配

**请求体**：

```json
{
  "code": "ABC12345",
  "verified_by": "user123"
}
```

**字段说明**：

- `code`（必需）：激活码内容
- `verified_by`（可选）：核销用户标识（用于记录）

**响应（成功）**：

```json
{
  "success": true,
  "code_id": "660e8400e29b41d4a716446655440001",
  "code": "ABC12345",
  "verified_at": 1704153600,
  "message": "Code verified successfully"
}
```

**响应（失败）**：

```json
{
  "success": false,
  "code": "ABC12345",
  "error_code": "CODE_ALREADY_USED",
  "message": "Code has already been used"
}
```

**错误码定义**：

- `CODE_NOT_FOUND`：激活码不存在
- `CODE_ALREADY_USED`：激活码已使用
- `CODE_DISABLED`：激活码已禁用
- `CODE_EXPIRED`：激活码已过期
- `PROJECT_DISABLED`：项目已禁用
- `PROJECT_EXPIRED`：项目已过期

**HTTP 状态码**：

- **200 OK**：请求成功（无论核销成功或失败，都返回 200，通过 `success` 字段区分）
- **400 Bad Request**：请求参数错误
- **401 Unauthorized**：认证失败

**核销逻辑**：

1. 验证激活码是否存在且属于当前项目
2. 检查激活码状态：`status=False`（未使用）、`is_disabled=False`（未禁用）、`is_expired=False`（未过期）
3. 检查项目状态：`status=True`（启用）且未过期
4. 如果验证通过：
   - 更新激活码状态：`status=True`，设置 `verified_at` 和 `verified_by`
   - 记录核销日志（`verification_logs` 表）
   - 返回成功响应
5. 如果验证失败：
   - 返回失败响应，包含错误码和错误信息
   - 不更新激活码状态

#### 3.4.2 重新激活激活码

**端点**：`POST /api/v1/projects/{project_id}/codes/reactivate`

**功能**：重新激活已使用的激活码，将其状态重置为未使用状态

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：必须与 API Key 绑定的项目 ID 匹配

**请求体**：

```json
{
  "code": "ABC12345",
  "reactivated_by": "admin123",
  "reason": "用户退款，需要重新激活"
}
```

**字段说明**：

- `code`（必需）：激活码内容
- `reactivated_by`（可选）：重新激活操作的用户标识（用于记录）
- `reason`（可选）：重新激活的原因说明

**响应（成功）**：

```json
{
  "success": true,
  "code_id": "660e8400e29b41d4a716446655440001",
  "code": "ABC12345",
  "reactivated_at": 1704153600,
  "message": "Code reactivated successfully"
}
```

**响应（失败）**：

```json
{
  "success": false,
  "code": "ABC12345",
  "error_code": "CODE_NOT_FOUND",
  "message": "Code not found"
}
```

**错误码定义**：

- `CODE_NOT_FOUND`：激活码不存在或不属于当前项目
- `CODE_ALREADY_UNUSED`：激活码已经是未使用状态，无需重新激活
- `CODE_DISABLED`：激活码已禁用，无法重新激活
- `CODE_EXPIRED`：激活码已过期，无法重新激活
- `PROJECT_DISABLED`：项目已禁用
- `PROJECT_EXPIRED`：项目已过期

**HTTP 状态码**：

- **200 OK**：请求成功（无论重新激活成功或失败，都返回 200，通过 `success` 字段区分）
- **400 Bad Request**：请求参数错误
- **401 Unauthorized**：认证失败

**重新激活逻辑**：

1. 验证激活码是否存在且属于当前项目
2. 检查激活码状态：
   - 必须是 `status=True`（已使用）状态才能重新激活
   - `is_disabled=False`（未禁用）
   - `is_expired=False`（未过期）
3. 检查项目状态：`status=True`（启用）且未过期
4. 如果验证通过：
   - 更新激活码状态：`status=False`（重置为未使用）
   - 清空 `verified_at` 和 `verified_by` 字段
   - 记录重新激活日志（`verification_logs` 表，`result` 为 `reactivated`）
   - 返回成功响应
5. 如果验证失败：
   - 返回失败响应，包含错误码和错误信息
   - 不更新激活码状态

**使用场景**：

- 用户退款后需要重新激活激活码
- 误操作核销后需要撤销
- 测试环境需要重置激活码状态

### 3.5 统计信息 API

#### 3.5.1 获取项目统计信息

**端点**：`GET /api/v1/projects/{project_id}/statistics`

**功能**：获取指定项目的详细统计信息

**认证**：需要 API Key + HMAC 签名

**路径参数**：

- `project_id`：项目 ID（32 位 UUID，无连字符）
  - **验证要求**：必须与 API Key 绑定的项目 ID 匹配

**响应**：

```json
{
  "project_id": "550e8400e29b41d4a716446655440000",
  "total_codes": 1000,
  "used_codes": 500,
  "unused_codes": 400,
  "disabled_codes": 50,
  "expired_codes": 50,
  "usage_rate": 0.5,
  "recent_verifications": [
    {
      "code": "ABC12345",
      "verified_at": 1704153600,
      "verified_by": "user123"
    }
  ]
}
```

---

## 4. 权限与限制

### 4.1 操作范围限制

- **项目隔离**：每个 API Key 只能访问绑定的单个项目
- **双重验证**：路径中的 `project_id` 必须与 API Key 绑定的项目 ID 匹配，提供额外的安全层
- **只读查询**：支持查询项目信息、激活码列表、激活码详情、统计信息
- **核销操作**：支持核销激活码（仅限绑定的项目）
- **重新激活操作**：支持重新激活已使用的激活码（仅限绑定的项目）
- **禁止操作**：
  - ❌ 创建项目
  - ❌ 修改项目
  - ❌ 删除项目
  - ❌ 生成激活码
  - ❌ 删除激活码
  - ❌ 禁用/启用激活码
  - ❌ 修改激活码信息

### 4.2 速率限制

- **默认限制**：每个 API Key 每分钟最多 60 次请求
- **可配置**：通过环境变量 `SDK_RATE_LIMIT_PER_MINUTE` 配置
- **限流策略**：基于 API Key 的令牌桶算法
- **限流响应**：
  - **429 Too Many Requests**：超过速率限制

  ```json
  {
    "detail": "Rate limit exceeded. Please try again later."
  }
  ```

---

## 5. 错误处理

### 5.1 错误响应格式

所有错误响应遵循统一格式：

```json
{
  "detail": "Error message"
}
```

### 5.2 HTTP 状态码

| 状态码 | 说明 | 场景 |
|--------|------|------|
| 200 OK | 请求成功 | 查询成功、核销成功/失败（通过 `success` 字段区分） |
| 400 Bad Request | 请求参数错误 | 参数验证失败、project_id 格式错误 |
| 401 Unauthorized | 认证失败 | API Key 错误、签名验证失败、时间戳过期、项目已禁用/过期 |
| 403 Forbidden | 权限不足 | 路径中的 project_id 与 API Key 绑定的项目不匹配、IP 不在白名单内 |
| 404 Not Found | 资源不存在 | 项目不存在、激活码不存在或不属于指定项目 |
| 429 Too Many Requests | 速率限制 | 超过请求频率限制 |
| 500 Internal Server Error | 服务器错误 | 内部错误 |

### 5.3 错误码定义

核销 API 的错误码（在响应体的 `error_code` 字段中）：

- `CODE_NOT_FOUND`：激活码不存在
- `CODE_ALREADY_USED`：激活码已使用
- `CODE_ALREADY_UNUSED`：激活码已经是未使用状态（重新激活时）
- `CODE_DISABLED`：激活码已禁用
- `CODE_EXPIRED`：激活码已过期
- `PROJECT_DISABLED`：项目已禁用
- `PROJECT_EXPIRED`：项目已过期

---

## 6. 安全考虑

### 6.1 HMAC 签名安全性

HMAC-SHA256 签名认证方式提供了多层安全保障：

- **Secret 永不传输**：Secret 仅在客户端和服务端本地使用，永远不会在网络中传输
- **防止重放攻击**：通过时间戳验证（±5 分钟窗口），确保请求的时效性
- **防止请求篡改**：签名包含请求方法、路径、查询参数、请求体，任何修改都会导致签名验证失败
- **防止中间人攻击**：即使请求被拦截，攻击者也无法获取 Secret 或伪造有效签名
- **行业标准**：采用与 AWS、阿里云、腾讯云等主流云服务相同的签名算法，经过充分验证

### 6.2 Secret 存储安全

- **明文存储原因**：HMAC 签名算法需要原始 Secret 进行计算，因此必须以明文形式存储
- **安全措施**：
  - **数据库访问控制**：限制数据库访问权限，仅允许应用服务器访问
  - **加密存储（可选）**：在生产环境中，可以使用数据库加密功能（如 MySQL 的透明数据加密）或应用层加密（AES-256）对 Secret 进行加密存储
  - **传输加密**：所有 API 请求必须使用 HTTPS（TLS 1.2+）
  - **审计日志**：记录所有 API Key 的生成、使用、禁用操作
- **不可查看**：Secret 生成后仅返回一次，后续不可查看，仅支持重新生成

### 6.3 API Key 管理

- **定期轮换**：建议定期（如每 3-6 个月）重新生成 API Key 和 Secret
- **及时禁用**：发现泄露或异常使用时立即禁用 API Key
- **使用记录**：通过 `last_used_at` 字段监控 API Key 使用情况，及时发现异常
- **最小权限原则**：每个 API Key 仅绑定单个项目，限制操作范围

---

## 7. API 端点汇总

| 方法 | 端点 | 功能 | 认证 |
|------|------|------|------|
| GET | `/api/v1/projects/{project_id}` | 获取项目信息 | API Key + HMAC 签名 |
| GET | `/api/v1/projects/{project_id}/codes` | 查询激活码列表 | API Key + HMAC 签名 |
| GET | `/api/v1/projects/{project_id}/codes/{code_id}` | 查询单个激活码详情 | API Key + HMAC 签名 |
| GET | `/api/v1/projects/{project_id}/codes/by-code/{code}` | 通过激活码内容查询 | API Key + HMAC 签名 |
| POST | `/api/v1/projects/{project_id}/codes/verify` | 核销激活码 | API Key + HMAC 签名 |
| POST | `/api/v1/projects/{project_id}/codes/reactivate` | 重新激活激活码 | API Key + HMAC 签名 |
| GET | `/api/v1/projects/{project_id}/statistics` | 获取统计信息 | API Key + HMAC 签名 |

**管理 API（管理员使用）**：

| 方法 | 端点 | 功能 | 认证 |
|------|------|------|------|
| POST | `/api/projects/{project_id}/api-keys` | 生成 API Key | Cookie Session |
| GET | `/api/projects/{project_id}/api-keys` | 查看 API Key 列表 | Cookie Session |
| PUT | `/api/api-keys/{api_key_id}` | 禁用/启用 API Key | Cookie Session |
| DELETE | `/api/api-keys/{api_key_id}` | 删除 API Key | Cookie Session |
