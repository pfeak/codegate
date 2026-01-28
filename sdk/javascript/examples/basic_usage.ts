/**
 * CodeGate SDK 基本使用示例
 *
 * 运行前请设置环境变量：CODEGATE_API_KEY, CODEGATE_SECRET, CODEGATE_PROJECT_ID
 * 或直接替换下方的配置。
 *
 * 使用已构建的 SDK： node --experimental-strip-types examples/basic_usage.ts
 * 或： npx tsx examples/basic_usage.ts
 */

import { CodeGateClient } from '../src/index';

const client = new CodeGateClient({
  apiKey: process.env.CODEGATE_API_KEY ?? '550e8400e29b41d4a716446655440000',
  secret: process.env.CODEGATE_SECRET ?? 'a1b2c3d4e5f6...',
  projectId: process.env.CODEGATE_PROJECT_ID ?? '550e8400e29b41d4a716446655440000',
  baseUrl: process.env.CODEGATE_BASE_URL ?? 'https://api.example.com',
});

async function main() {
  // 获取项目信息
  const project = await client.getProject();
  console.log('Project:', project.name, '| Total codes:', project.statistics.total_codes);

  // 查询激活码列表
  const { items, total } = await client.listCodes({ page: 1, pageSize: 20, status: 'unused' });
  console.log('Codes total:', total);
  items.slice(0, 3).forEach((c) => console.log('  -', c.code, c.status));

  // 按 ID 查询
  if (items[0]) {
    const one = await client.getCode(items[0].id);
    console.log('Code by id:', one.code, one.status);
  }

  // 按激活码内容查询
  // const byCode = await client.getCodeByCode('ABC12345');
  // console.log('Code by value:', byCode.code);

  // 核销
  // const verifyRes = await client.verifyCode({ code: 'ABC12345', verifiedBy: 'user123' });
  // console.log('Verify:', verifyRes.success, verifyRes.message);

  // 重新激活
  // const reactRes = await client.reactivateCode({
  //   code: 'ABC12345',
  //   reactivatedBy: 'admin123',
  //   reason: '用户退款，需要重新激活',
  // });
  // console.log('Reactivate:', reactRes.success);

  // 统计
  const stats = await client.getStatistics();
  console.log('Stats: usage_rate=', stats.usage_rate, '| used=', stats.used_codes, '| unused=', stats.unused_codes);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
