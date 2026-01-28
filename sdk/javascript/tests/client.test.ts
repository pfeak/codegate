/**
 * 客户端测试：Mock fetch，验证 URL、Header、请求体与响应解析
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { CodeGateClient, CodeGateApiError } from '../src/client';

describe('CodeGateClient', () => {
  const config = {
    apiKey: '550e8400e29b41d4a716446655440000',
    secret: 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234',
    projectId: '550e8400e29b41d4a716446655440000',
    baseUrl: 'https://api.example.com',
  };

  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getProject: 正确 path、Header 含 X-API-Key、X-Timestamp、X-Signature', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: config.projectId, name: 'Test', status: true, expires_at: 0, created_at: 0, statistics: { total_codes: 0, used_codes: 0, unused_codes: 0, disabled_codes: 0, expired_codes: 0 } }),
    });

    const client = new CodeGateClient(config);
    const project = await client.getProject();

    expect(project.name).toBe('Test');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe(`https://api.example.com/api/v1/projects/${config.projectId}`);
    expect(opts.method).toBe('GET');
    expect(opts.headers['X-API-Key']).toBe(config.apiKey);
    expect(opts.headers['X-Timestamp']).toBeDefined();
    expect(opts.headers['X-Signature']).toMatch(/^[a-f0-9]{64}$/);
  });

  it('listCodes: query 使用 page、page_size、status、search', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          items: [],
          total: 0,
          page: 1,
          page_size: 10,
          total_pages: 0,
        }),
    });

    const client = new CodeGateClient(config);
    await client.listCodes({
      page: 1,
      pageSize: 10,
      status: 'unused',
      search: 'abc',
    });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=10');
    expect(url).toContain('status=unused');
    expect(url).toContain('search=abc');
  });

  it('verifyCode: POST body 含 code、verified_by', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          code: 'ABC123',
          verified_at: 1704153600,
          message: 'ok',
        }),
    });

    const client = new CodeGateClient(config);
    const res = await client.verifyCode({
      code: 'ABC123',
      verifiedBy: 'user1',
    });

    expect(res.success).toBe(true);
    const [, opts] = fetchMock.mock.calls[0];
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBe('application/json');
    const body = JSON.parse(opts.body as string);
    expect(body.code).toBe('ABC123');
    expect(body.verified_by).toBe('user1');
  });

  it('reactivateCode: body 含 code、reactivated_by、reason', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          code: 'ABC123',
          reactivated_at: 1704153600,
          message: 'ok',
        }),
    });

    const client = new CodeGateClient(config);
    await client.reactivateCode({
      code: 'ABC123',
      reactivatedBy: 'admin',
      reason: 'refund',
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    expect(body.code).toBe('ABC123');
    expect(body.reactivated_by).toBe('admin');
    expect(body.reason).toBe('refund');
  });

  it('getCodeByCode: path 对 code 做 encodeURIComponent', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: '1',
          code: 'A/B&C',
          status: false,
          is_disabled: false,
          is_expired: false,
          expires_at: null,
          verified_at: null,
          verified_by: null,
          created_at: 0,
        }),
    });

    const client = new CodeGateClient(config);
    await client.getCodeByCode('A/B&C');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain('/by-code/');
    expect(url).toContain(encodeURIComponent('A/B&C'));
  });

  it('4xx 时抛出 CodeGateApiError', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 401,
      text: async () => JSON.stringify({ detail: 'Invalid signature' }),
    });

    const client = new CodeGateClient(config);
    try {
      await client.getProject();
      expect.fail('should have thrown');
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(CodeGateApiError);
      if (e instanceof CodeGateApiError) {
        expect(e.status).toBe(401);
        expect(e.detail).toBe('Invalid signature');
      }
    }
  });

  it('baseUrl 末尾斜杠会被去掉', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          id: '1',
          name: 'n',
          status: true,
          expires_at: 0,
          created_at: 0,
          statistics: { total_codes: 0, used_codes: 0, unused_codes: 0, disabled_codes: 0, expired_codes: 0 },
        }),
    });

    const client = new CodeGateClient({
      ...config,
      baseUrl: 'https://api.example.com/',
    });
    await client.getProject();
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/api/v1/projects/550e8400e29b41d4a716446655440000');
  });
});
