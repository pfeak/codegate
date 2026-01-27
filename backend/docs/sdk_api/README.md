# SDK API 使用指南

面向 **API 调用方**：如何用 API Key + HMAC-SHA256 签名调用接口，完成查询、核销、重新激活等操作。

> **使用 Python？** 推荐直接用 [Python SDK](python.md)，无需手写签名。

---

## 一、准备与第一个请求

### 需要准备

| 配置 | 说明 |
|------|------|
| `api_key` | API Key |
| `secret` | API Secret（仅用于本地签名，不随请求发送） |
| `project_id` | 项目 ID，所有请求都在该项目下 |
| `base_url` | 如 `https://api.example.com` |

### 每个请求必带 3 个 Header

```text
X-API-Key: {api_key}
X-Timestamp: {秒级 Unix 时间戳}
X-Signature: {签名的十六进制小写，64 位}
```

### 最小示例：查项目信息

```bash
curl -X GET "{base_url}/api/v1/projects/{project_id}" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}"
```

把 `{base_url}`、`{project_id}`、`{api_key}`、`{timestamp}`、`{signature}` 换成你的实际值即可。

---

## 二、签名怎么算（自己发 HTTP 时）

1. **拼签名字符串**（用 `\n` 连接）：

   ```text
   {METHOD}\n{PATH}\n{QUERY_STRING}\n{BODY_SHA256_HEX}\n{TIMESTAMP}
   ```

   - `METHOD`：大写，如 `GET`、`POST`
   - `PATH`：路径，不含 query，如 `/api/v1/projects/xxx/codes`
   - `QUERY_STRING`：query 按键名排序后 `k1=v1&k2=v2`，没有则为空
   - `BODY_SHA256_HEX`：请求体字符串的 SHA256 十六进制小写；**无 body 时**用空串的 SHA256：`e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`
   - `TIMESTAMP`：与 Header 里 `X-Timestamp` 相同（秒）

2. **算 HMAC-SHA256**：`HMAC_SHA256(secret, 上面的字符串)`，输出十六进制小写。

3. **放到 Header**：`X-Signature: {上述结果}`

### 签名不对时先查

- 时间戳必须是 **秒**，不是毫秒
- Body 参与签名的字符串要和实际发的完全一致（空格、换行、字段顺序）
- Query 要按键名排序并正确编码；PATH 不要带上 query

---

## 三、常用操作与示例

### 1. 查项目信息

```bash
curl -X GET "{base_url}/api/v1/projects/{project_id}" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}"
```

### 2. 分页查激活码

```bash
curl -X GET "{base_url}/api/v1/projects/{project_id}/codes?page=1&page_size=20&status=unused" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}"
```

| 参数 | 说明 |
|------|------|
| `page` | 页码，默认 1 |
| `page_size` | 每页条数，默认 20，最大 100 |
| `status` | `unused` / `used` / `disabled` / `expired` |
| `search` | 按激活码内容搜索 |

### 3. 查单个激活码

按 ID：

```bash
curl -X GET "{base_url}/api/v1/projects/{project_id}/codes/{code_id}" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}"
```

按激活码内容：

```bash
curl -X GET "{base_url}/api/v1/projects/{project_id}/codes/by-code/ABC12345" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}"
```

### 4. 核销激活码

```bash
curl -X POST "{base_url}/api/v1/projects/{project_id}/codes/verify" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}" \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC12345","verified_by":"user123"}'
```

响应里看 `success`：`true` 为成功，`false` 时用 `error_code`、`message` 判断原因。

### 5. 重新激活已用码

```bash
curl -X POST "{base_url}/api/v1/projects/{project_id}/codes/reactivate" \
  -H "X-API-Key: {api_key}" \
  -H "X-Timestamp: {timestamp}" \
  -H "X-Signature: {signature}" \
  -H "Content-Type: application/json" \
  -d '{"code":"ABC12345","reactivated_by":"admin123","reason":"用户退款，需要重新激活"}'
```

---

## 四、出错时怎么处理

### HTTP 状态码

| 状态码 | 建议 |
|--------|------|
| 400 | 参数错误，改请求不要重试 |
| 401 | 查 Key、签名、时间戳、项目状态 |
| 403 | 查 `project_id` 是否与 Key 绑定一致 |
| 404 | 资源不存在，查 ID / code |
| 429 | 限流，退避重试（如指数退避 + 抖动） |
| 500 | 可重试（建议退避） |

### 业务错误码（核销 / 重新激活 的 `error_code`）

| 错误码 | 含义 |
|--------|------|
| `CODE_NOT_FOUND` | 激活码不存在 |
| `CODE_ALREADY_USED` | 已使用（核销时） |
| `CODE_ALREADY_UNUSED` | 已是未使用（重新激活时） |
| `CODE_DISABLED` | 已禁用 |
| `CODE_EXPIRED` | 已过期 |
| `PROJECT_DISABLED` | 项目已禁用 |
| `PROJECT_EXPIRED` | 项目已过期 |

---

## 五、约定与限制

- **项目隔离**：每个 API Key 只对应一个项目，`project_id` 需与 Key 一致
- **限流**：默认每 Key 每分钟 60 次，超限返回 429
- **HTTPS**：生产必须走 HTTPS

---

## 端点速查

| 方法 | 路径 | 用途 |
|------|------|------|
| GET | `/api/v1/projects/{project_id}` | 项目信息 |
| GET | `/api/v1/projects/{project_id}/codes` | 分页查激活码 |
| GET | `/api/v1/projects/{project_id}/codes/{code_id}` | 按 ID 查单个 |
| GET | `/api/v1/projects/{project_id}/codes/by-code/{code}` | 按内容查单个 |
| POST | `/api/v1/projects/{project_id}/codes/verify` | 核销 |
| POST | `/api/v1/projects/{project_id}/codes/reactivate` | 重新激活 |
| GET | `/api/v1/projects/{project_id}/statistics` | 统计信息 |
