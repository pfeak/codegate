# CodeGate JavaScript/TypeScript SDK

CodeGate 的 JavaScript/TypeScript 客户端，用于与 CodeGate API 交互：激活码查询、核销、重新激活、统计等。

## 安装

```bash
npm install @codegate/sdk
```

或从本地构建产物安装（联调时）：

```bash
cd sdk/javascript && npm run build
npm install /path/to/codegate/sdk/javascript
```

## 快速开始

```typescript
import { CodeGateClient } from '@codegate/sdk';

const client = new CodeGateClient({
  apiKey: '550e8400e29b41d4a716446655440000',
  secret: 'a1b2c3d4e5f6...',
  projectId: '550e8400e29b41d4a716446655440000',
  baseUrl: 'https://api.example.com',
});

// 获取项目信息
const project = await client.getProject();
console.log(project.name, project.statistics.total_codes);

// 核销激活码
const result = await client.verifyCode({ code: 'ABC12345', verifiedBy: 'user123' });
if (result.success) console.log('Verified at:', result.verified_at);
```

## 环境要求

- **Node.js** >= 18（使用原生 `fetch`、`crypto`）
- **TypeScript** >= 4.5（可选）

## API 概览

| 方法 | 说明 |
|------|------|
| `getProject()` | 获取项目信息 |
| `listCodes(options?)` | 分页查询激活码（page, pageSize, status, search） |
| `getCode(codeId)` | 按 ID 查询单个激活码 |
| `getCodeByCode(code)` | 按激活码内容查询 |
| `verifyCode({ code, verifiedBy? })` | 核销激活码 |
| `reactivateCode({ code, reactivatedBy?, reason? })` | 重新激活 |
| `getStatistics()` | 项目统计信息 |

参数使用 camelCase（如 `pageSize`、`verifiedBy`），请求会转换为 API 的 snake_case。

## 错误处理

`4xx`/`5xx` 会抛出 `CodeGateApiError`，包含 `status`、`detail`：

```typescript
import { CodeGateClient, CodeGateApiError } from '@codegate/sdk';

try {
  await client.verifyCode({ code: 'X' });
} catch (e) {
  if (e instanceof CodeGateApiError) {
    if (e.status === 401) console.log('认证失败');
    else if (e.status === 429) console.log('限流，请稍后重试');
  }
}
```

## 开发

### 构建

```bash
cd sdk/javascript
npm install
npm run build
```

产物在 `dist/`：`index.js`（ESM）、`index.cjs`、`index.d.ts`。

### 测试

```bash
npm run test
```

### 示例

```bash
npx tsx examples/basic_usage.ts
npx tsx examples/error_handling.ts
```

需设置 `CODEGATE_API_KEY`、`CODEGATE_SECRET`、`CODEGATE_PROJECT_ID`、`CODEGATE_BASE_URL`（可选）。

## 其他用法

### 环境变量配置

通过环境变量注入凭证，便于不同环境切换：

```typescript
const client = new CodeGateClient({
  apiKey: process.env.CODEGATE_API_KEY!,
  secret: process.env.CODEGATE_SECRET!,
  projectId: process.env.CODEGATE_PROJECT_ID!,
  baseUrl: process.env.CODEGATE_BASE_URL || 'https://api.example.com',
});
```

### 自定义请求与 generateSignature

需要自建 HTTP 客户端时，可直接使用 `generateSignature` 生成签名：

```typescript
import { generateSignature } from '@codegate/sdk';

const method = 'GET';
const path = `/api/v1/projects/${projectId}/codes`;
const queryParams = { page: '1', page_size: '20', status: 'unused' };
const timestamp = Math.floor(Date.now() / 1000);
const sig = generateSignature(method, path, queryParams, undefined, timestamp, secret);
// 将 sig 填入请求头 X-Signature，并设置 X-API-Key、X-Timestamp
```

### 分页与筛选

`listCodes` 支持按状态、关键词分页查询，便于导表或批量处理：

```typescript
// 只查未使用、按关键词搜索
const { items, total, totalPages } = await client.listCodes({
  page: 1,
  pageSize: 50,
  status: 'unused',
  search: 'PROMO2024',
});

// 分页遍历全部未使用码
for (let p = 1; p <= totalPages; p++) {
  const { items } = await client.listCodes({ page: p, pageSize: 100, status: 'unused' });
  for (const c of items) console.log(c.code);
}
```

### 核销结果与 error_code

除 4xx/5xx 会抛 `CodeGateApiError` 外，核销接口通过 `success`、`error_code` 表示业务结果：

```typescript
const result = await client.verifyCode({ code: 'ABC12345', verifiedBy: 'user123' });
if (result.success) {
  console.log('核销成功', result.verified_at);
} else {
  // 如 CODE_ALREADY_USED、CODE_NOT_FOUND、CODE_DISABLED、CODE_EXPIRED
  console.log(result.error_code, result.message);
}
```

### 重试与容错

对 5xx 或网络异常可做有限次重试：

```typescript
async function withRetry<T>(fn: () => Promise<T>, max = 3): Promise<T> {
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e: any) {
      const ok = e?.status >= 500 || e?.code === 'ECONNRESET';
      if (i === max - 1 || !ok) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Unreachable');
}

const result = await withRetry(() => client.verifyCode({ code: 'ABC12345' }));
```

## 许可证

Apache-2.0
