# JavaScript/TypeScript SDK（推荐）

本文档面向 **Node.js / TypeScript 调用方**：说明如何安装并使用 CodeGate JS/TS SDK 完成常见任务。

API 侧的认证、签名规则与错误码说明见 `README.md`（本目录）。

## 安装

```bash
npm install codegate-sdk
```

要求：

- Node.js >= 18（使用原生 `fetch`、`crypto`）

---

## 最小可运行示例

```typescript
import { CodeGateClient } from 'codegate-sdk';

const client = new CodeGateClient({
  apiKey: 'YOUR_API_KEY',
  secret: 'YOUR_SECRET',
  projectId: 'YOUR_PROJECT_ID',
  baseUrl: 'https://api.example.com',
});

const project = await client.getProject();
console.log(project.id, project.name);
```

---

## 常见用法（按场景）

### 1) 查询激活码列表（分页/筛选）

```typescript
const codes = await client.listCodes({ page: 1, pageSize: 20, status: 'unused' });
for (const item of codes.items) {
  print(item.code, item.status);
}
```

### 2) 查询单个激活码

按 ID：

```typescript
const code = await client.getCode('CODE_ID');
console.log(code.code, code.status);
```

或通过激活码内容查询：

```typescript
const code = await client.getCodeByCode('ABC12345');
console.log(code.code, code.status);
```

### 3) 核销激活码（核心）

```typescript
const result = await client.verifyCode({ code: 'ABC12345', verifiedBy: 'user123' });
if (result.success) {
  console.log('核销成功', result.verified_at);
} else {
  console.log('核销失败', result.error_code, result.message);
}
```

### 4) 重新激活激活码

```typescript
const result = await client.reactivateCode({
  code: 'ABC12345',
  reactivatedBy: 'admin123',
  reason: '用户退款，需要重新激活',
});
console.log(result.success, result.message);
```

### 5) 获取统计信息

```typescript
const stats = await client.getStatistics();
console.log(stats.usage_rate, stats.used_codes, stats.unused_codes);
```

---

## 配置建议（环境变量）

```typescript
import { CodeGateClient } from 'codegate-sdk';

const client = new CodeGateClient({
  apiKey: process.env.CODEGATE_API_KEY!,
  secret: process.env.CODEGATE_SECRET!,
  projectId: process.env.CODEGATE_PROJECT_ID!,
  baseUrl: process.env.CODEGATE_BASE_URL || 'https://api.example.com',
});
```

---

## 错误处理（调用方关注）

### 认证失败（401）

当凭证或时间戳异常时，服务端会返回 401，SDK 抛出 `CodeGateApiError`，可按状态码分支处理：

```typescript
import { CodeGateApiError } from 'codegate-sdk';

try {
  await client.getProject();
} catch (e) {
  if (e instanceof CodeGateApiError && e.status === 401) {
    console.log('认证失败：请检查 API Key/Secret/时间戳');
  } else {
    throw e;
  }
}
```

### 触发限流（429）

当服务端返回 429 时，同样会抛出 `CodeGateApiError`，建议做退避重试：

```typescript
try {
  await client.getProject();
} catch (e) {
  if (e instanceof CodeGateApiError && e.status === 429) {
    console.log('触发限流：建议退避重试');
  } else {
    throw e;
  }
}
```

### 业务错误（核销/重新激活返回 success=false）

核销、重新激活接口在参数正确但业务不满足时，会返回 `success=false` 与 `error_code`（HTTP 状态码仍为 200）：

```typescript
const res = await client.verifyCode({ code: 'ABC12345', verifiedBy: 'user123' });
if (!res.success) {
  // 如 CODE_ALREADY_USED / CODE_NOT_FOUND / CODE_DISABLED / CODE_EXPIRED
  console.log(res.error_code, res.message);
}
```

---

## 自定义 HTTP：generateSignature

需要自建 HTTP 客户端时，可直接使用 `generateSignature` 生成签名（其算法与 `README.md` 保持一致）：

```typescript
import { generateSignature } from 'codegate-sdk';

const projectId = process.env.CODEGATE_PROJECT_ID!;
const secret = process.env.CODEGATE_SECRET!;

const method = 'GET';
const path = `/api/v1/projects/${projectId}/codes`;
const queryParams = { page: '1', page_size: '20', status: 'unused' };
const timestamp = Math.floor(Date.now() / 1000);

const sig = generateSignature(method, path, queryParams, undefined, timestamp, secret);
// 将 sig 填入请求头 X-Signature，并设置 X-API-Key、X-Timestamp
```

---

## FAQ

### 签名验证失败 / Invalid signature

如果 SDK 已经帮你签名但仍失败，优先检查：

- 运行环境时间是否准确（建议 NTP，同步服务器时间）
- `baseUrl` 是否指向正确环境（路径不同会导致签名不一致）
