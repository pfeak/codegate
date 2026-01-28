/**
 * 签名计算模块测试
 * 与 Python SDK test_signature 对齐，并验证与 README 算法一致
 */

import { describe, it, expect } from 'vitest';
import { generateSignature, EMPTY_STRING_HASH } from '../src/signature';
import { createHash } from 'crypto';

describe('generateSignature', () => {
  it('GET 无查询参数：返回 64 位十六进制', () => {
    const sig = generateSignature(
      'GET',
      '/api/v1/projects/test',
      undefined,
      undefined,
      1704153600,
      'test_secret'
    );
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(sig).toHaveLength(64);
  });

  it('GET 有查询参数：返回 64 位十六进制', () => {
    const sig = generateSignature(
      'GET',
      '/api/v1/projects/test/codes',
      { page: '1', page_size: '20' },
      undefined,
      1704153600,
      'test_secret'
    );
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(sig).toHaveLength(64);
  });

  it('POST 有请求体：返回 64 位十六进制', () => {
    const body = JSON.stringify({ code: 'ABC12345' });
    const sig = generateSignature(
      'POST',
      '/api/v1/projects/test/codes/verify',
      undefined,
      body,
      1704153600,
      'test_secret'
    );
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    expect(sig).toHaveLength(64);
  });

  it('空字符串哈希常量正确', () => {
    const expected = createHash('sha256').update('', 'utf8').digest('hex');
    expect(EMPTY_STRING_HASH).toBe(expected);
  });

  it('无 body 时使用 EMPTY_STRING_HASH', () => {
    const sigNull = generateSignature('GET', '/x', undefined, undefined, 1, 'k');
    const sigEmpty = generateSignature('GET', '/x', undefined, '', 1, 'k');
    expect(sigNull).toBe(sigEmpty);
  });

  it('缺少 timestamp 时抛出', () => {
    expect(() =>
      generateSignature('GET', '/api/v1/projects/test', undefined, undefined, NaN, 'sec')
    ).toThrow('timestamp is required');
  });

  it('缺少 secret 时抛出', () => {
    expect(() =>
      generateSignature('GET', '/api/v1/projects/test', undefined, undefined, 1704153600, '')
    ).toThrow('secret is required');
  });

  it('与 Python 签名的确定性：相同输入得到相同输出', () => {
    const body = JSON.stringify({ code: 'ABC12345' });
    const a = generateSignature(
      'POST',
      '/api/v1/projects/p1/codes/verify',
      undefined,
      body,
      1704153600,
      'test_secret'
    );
    const b = generateSignature(
      'POST',
      '/api/v1/projects/p1/codes/verify',
      undefined,
      body,
      1704153600,
      'test_secret'
    );
    expect(a).toBe(b);
  });

  it('查询参数按键排序参与签名', () => {
    const q = { page_size: '20', page: '1', status: 'unused' };
    const sig = generateSignature(
      'GET',
      '/api/v1/projects/p/codes',
      q,
      undefined,
      1704153600,
      'k'
    );
    expect(sig).toMatch(/^[a-f0-9]{64}$/);
    // 不同顺序应得到相同签名（因为内部会排序）
    const q2 = { status: 'unused', page: '1', page_size: '20' };
    const sig2 = generateSignature(
      'GET',
      '/api/v1/projects/p/codes',
      q2,
      undefined,
      1704153600,
      'k'
    );
    expect(sig).toBe(sig2);
  });
});
