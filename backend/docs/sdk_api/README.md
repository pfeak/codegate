# SDK API（调用方使用指南）

本文档面向 **API 调用方**：介绍如何使用 **API Key + HMAC-SHA256 签名** 调用 SDK API 完成常见任务（查询、核销、重新激活等）。

---

## 快速开始：发起第一个请求

你需要 3 个配置：

- `api_key`：API Key
- `secret`：API Secret（用于签名，不会在网络中传输）
- `project_id`：项目 ID（SDK API 的操作范围固定在单个项目内）

请求统一前缀：

- Base URL：`{base_url}`
- API 前缀：`/api/v1`

请求必须携带以下 Header：

```shell
X-API-Key: {api_key}
X-Timestamp: {timestamp_in_seconds}
X-Signature: {signature_hex_lowercase}
```

最小示例（以“获取项目信息”为例）：

```bash
curl -X GET "{base_url}/api/v1/projects/{project_id}" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}"
```

---

## 认证与签名（HMAC-SHA256）

### 签名字符串（String to Sign）

签名字符串由以下字段按顺序拼接，用换行符 `\n` 分隔：

```txt
{METHOD}\n
{PATH}\n
{QUERY_STRING}\n
{BODY_SHA256_HEX}\n
{TIMESTAMP}
```

- `METHOD`：HTTP 方法（大写），如 `GET`、`POST`
- `PATH`：请求路径（不含查询参数），如 `/api/v1/projects/{project_id}/codes`
- `QUERY_STRING`：查询参数按键名排序并 URL 编码后拼接，形如 `k1=v1&k2=v2`；无查询参数则为空字符串
- `BODY_SHA256_HEX`：请求体原文（字符串）的 SHA256（十六进制小写）；无请求体时使用空字符串的 SHA256
  - 空字符串 SHA256：`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
- `TIMESTAMP`：Unix 时间戳（秒级，UTC），与 `X-Timestamp` 一致

### 计算签名

使用 `secret` 对签名字符串做 HMAC-SHA256，输出十六进制小写字符串（64 字符）：

```txt
signature = HMAC_SHA256_HEX(secret, string_to_sign)
```

### 常见签名失败原因（速查）

- 时间戳用成了 **毫秒**（必须秒）
- Query 未排序或编码不一致
- Body 参与签名的字符串与实际发送的 body 不一致（尤其 JSON 的空格/换行/字段顺序）
- PATH 参与签名时误带了 query

---

## 常见任务（按场景）

### 1) 查询项目信息

- `GET /api/v1/projects/{project_id}`

用于：确认项目状态、查看统计信息概览。

### 2) 分页查询激活码列表

- `GET /api/v1/projects/{project_id}/codes`

查询参数：

- `page`（默认 1）
- `page_size`（默认 20，最大 100）
- `status`：`unused` / `used` / `disabled` / `expired`
- `search`：按激活码内容搜索

### 3) 查询单个激活码

- 通过 ID：`GET /api/v1/projects/{project_id}/codes/{code_id}`
- 通过 code 内容：`GET /api/v1/projects/{project_id}/codes/by-code/{code}`

### 4) 核销激活码（核心）

- `POST /api/v1/projects/{project_id}/codes/verify`

请求体：

```json
{
  "code": "ABC12345",
  "verified_by": "user123"
}
```

响应中用 `success` 区分核销成功/失败；失败时会给出 `error_code`（见下文“错误码”）。

### 5) 重新激活已使用激活码

- `POST /api/v1/projects/{project_id}/codes/reactivate`

请求体：

```json
{
  "code": "ABC12345",
  "reactivated_by": "admin123",
  "reason": "用户退款，需要重新激活"
}
```

---

## 错误处理与重试建议

### HTTP 状态码（调用方关注）

| 状态码 | 说明 | 调用方建议 |
|--------|------|-----------|
| 400 | 参数错误 | 不要重试，修正参数 |
| 401 | 认证失败（Key/签名/时间戳/项目状态） | 检查签名流程与时间同步 |
| 403 | Project 不匹配等权限问题 | 检查 `project_id` 是否与 Key 绑定项目一致 |
| 404 | 资源不存在 | 确认资源 ID / code 是否正确 |
| 429 | 触发限流 | 退避重试（指数退避 + 抖动） |
| 500 | 服务端错误 | 可以重试（建议指数退避） |

### 业务错误码（核销/重新激活）

- `CODE_NOT_FOUND`：激活码不存在
- `CODE_ALREADY_USED`：激活码已使用（核销时）
- `CODE_ALREADY_UNUSED`：激活码已是未使用（重新激活时）
- `CODE_DISABLED`：激活码已禁用
- `CODE_EXPIRED`：激活码已过期
- `PROJECT_DISABLED`：项目已禁用
- `PROJECT_EXPIRED`：项目已过期

---

## 约定与限制

- **项目隔离**：每个 API Key 只能访问其绑定的单个项目；路径里的 `project_id` 必须匹配
- **速率限制**：默认每个 API Key 每分钟 60 次；超过会返回 `429`
- **HTTPS**：生产环境必须使用 HTTPS

---

## 附录：端点速查（精简）

| 方法 | 端点 | 用途 |
|------|------|------|
| GET | `/api/v1/projects/{project_id}` | 查询项目信息 |
| GET | `/api/v1/projects/{project_id}/codes` | 分页查询激活码 |
| GET | `/api/v1/projects/{project_id}/codes/{code_id}` | 查询单个激活码（ID） |
| GET | `/api/v1/projects/{project_id}/codes/by-code/{code}` | 查询单个激活码（内容） |
| POST | `/api/v1/projects/{project_id}/codes/verify` | 核销 |
| POST | `/api/v1/projects/{project_id}/codes/reactivate` | 重新激活 |
| GET | `/api/v1/projects/{project_id}/statistics` | 统计信息 |
