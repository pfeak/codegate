/**
 * CodeGate SDK 错误处理示例
 *
 * 运行： npx tsx examples/error_handling.ts
 */

import { CodeGateClient, CodeGateApiError } from '../src/index';

const client = new CodeGateClient({
  apiKey: process.env.CODEGATE_API_KEY ?? 'your-api-key',
  secret: process.env.CODEGATE_SECRET ?? 'your-secret',
  projectId: process.env.CODEGATE_PROJECT_ID ?? 'your-project-id',
  baseUrl: process.env.CODEGATE_BASE_URL ?? 'https://api.example.com',
});

async function main() {
  try {
    const result = await client.verifyCode({ code: 'ABC12345' });

    if (result.success) {
      console.log('核销成功:', result.message);
    } else {
      switch (result.error_code) {
        case 'CODE_ALREADY_USED':
          console.log('激活码已被使用');
          break;
        case 'CODE_NOT_FOUND':
          console.log('激活码不存在');
          break;
        case 'CODE_DISABLED':
          console.log('激活码已禁用');
          break;
        case 'CODE_EXPIRED':
          console.log('激活码已过期');
          break;
        default:
          console.log('核销失败:', result.message);
      }
    }
  } catch (e: unknown) {
    if (e instanceof CodeGateApiError) {
      if (e.status === 401) console.log('认证失败：请检查 API Key 和 Secret');
      else if (e.status === 403) console.log('权限不足：项目 ID 不匹配');
      else if (e.status === 404) console.log('资源不存在');
      else if (e.status === 429) console.log('请求频率过高，请稍后重试');
      else console.log('API 错误:', e.status, e.detail);
    } else {
      console.log('请求失败:', (e as Error).message);
    }
  }
}

main();
