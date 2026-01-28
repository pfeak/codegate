/**
 * CodeGate SDK 客户端
 * 提供项目信息、激活码查询、核销、重新激活、统计等 API。
 */

import { generateSignature } from './signature';
import type {
  Code,
  CodeListResponse,
  CodeGateClientConfig,
  ListCodesOptions,
  Project,
  ReactivateCodeOptions,
  ReactivateResult,
  Statistics,
  VerifyCodeOptions,
  VerifyResult,
} from './types';

const DEFAULT_BASE_URL = 'https://api.example.com';

/** 请求选项：query 为 snake_case，body 为 API 期望的 snake_case */
interface RequestOptions {
  query?: Record<string, string | number>;
  body?: Record<string, unknown>;
}

export class CodeGateClient {
  private readonly apiKey: string;
  private readonly secret: string;
  private readonly projectId: string;
  private readonly baseUrl: string;

  constructor(config: CodeGateClientConfig) {
    this.apiKey = config.apiKey;
    this.secret = config.secret;
    this.projectId = config.projectId;
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
  }

  /**
   * 生成签名并发送请求
   */
  private async request<T>(
    method: string,
    path: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { query, body } = options;

    // 查询参数：转为字符串，用于 URL 与签名
    const queryDict: Record<string, string> | undefined = query
      ? Object.fromEntries(
          Object.entries(query).map(([k, v]) => [k, String(v)])
        )
      : undefined;

    let url = `${this.baseUrl}${path}`;
    if (queryDict && Object.keys(queryDict).length > 0) {
      const pairs = Object.keys(queryDict)
        .sort()
        .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(queryDict[k])}`);
      url += `?${pairs.join('&')}`;
    }

    const bodyString = body
      ? JSON.stringify(body)
      : undefined;

    const timestamp = Math.floor(Date.now() / 1000);
    const signature = generateSignature(
      method,
      path,
      queryDict ?? undefined,
      bodyString,
      timestamp,
      this.secret
    );

    const headers: Record<string, string> = {
      'X-API-Key': this.apiKey,
      'X-Timestamp': String(timestamp),
      'X-Signature': signature,
    };
    if (bodyString) {
      headers['Content-Type'] = 'application/json';
    }

    const res = await fetch(url, {
      method,
      headers,
      body: bodyString,
    });

    const text = await res.text();
    let data: T;
    try {
      data = text ? (JSON.parse(text) as T) : ({} as T);
    } catch {
      throw new CodeGateApiError(res.status, text || res.statusText, 'Invalid JSON response');
    }

    if (!res.ok) {
      const detail = (data as { detail?: string })?.detail ?? (text || res.statusText);
      throw new CodeGateApiError(res.status, detail);
    }

    return data;
  }

  // ---------- 项目信息 ----------

  getProject(): Promise<Project> {
    return this.request<Project>('GET', `/api/v1/projects/${this.projectId}`);
  }

  // ---------- 激活码查询 ----------

  listCodes(options: ListCodesOptions = {}): Promise<CodeListResponse> {
    const { page = 1, pageSize = 20, status, search } = options;
    const query: Record<string, string | number> = {
      page,
      page_size: pageSize,
    };
    if (status) query.status = status;
    if (search) query.search = search;
    return this.request<CodeListResponse>('GET', `/api/v1/projects/${this.projectId}/codes`, {
      query,
    });
  }

  getCode(codeId: string): Promise<Code> {
    return this.request<Code>('GET', `/api/v1/projects/${this.projectId}/codes/${codeId}`);
  }

  getCodeByCode(code: string): Promise<Code> {
    const encoded = encodeURIComponent(code);
    return this.request<Code>(
      'GET',
      `/api/v1/projects/${this.projectId}/codes/by-code/${encoded}`
    );
  }

  // ---------- 激活码核销 ----------

  verifyCode(options: VerifyCodeOptions): Promise<VerifyResult> {
    const { code, verifiedBy } = options;
    const body: Record<string, string> = { code };
    if (verifiedBy != null) body.verified_by = verifiedBy;
    return this.request<VerifyResult>(
      'POST',
      `/api/v1/projects/${this.projectId}/codes/verify`,
      { body }
    );
  }

  reactivateCode(options: ReactivateCodeOptions): Promise<ReactivateResult> {
    const { code, reactivatedBy, reason } = options;
    const body: Record<string, string> = { code };
    if (reactivatedBy != null) body.reactivated_by = reactivatedBy;
    if (reason != null) body.reason = reason;
    return this.request<ReactivateResult>(
      'POST',
      `/api/v1/projects/${this.projectId}/codes/reactivate`,
      { body }
    );
  }

  // ---------- 统计 ----------

  getStatistics(): Promise<Statistics> {
    return this.request<Statistics>(
      'GET',
      `/api/v1/projects/${this.projectId}/statistics`
    );
  }
}

/**
 * API 请求错误（4xx/5xx）
 */
export class CodeGateApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: string,
    message?: string
  ) {
    super(message ?? `CodeGate API error: ${status} ${detail}`);
    this.name = 'CodeGateApiError';
    Object.setPrototypeOf(this, CodeGateApiError.prototype);
  }
}
