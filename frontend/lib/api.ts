/**
 * 前端 API 封装
 *
 * 约定（对齐 docs/design/ui/common/ui_prd_default.md）：
 * - 所有请求默认携带 `credentials: 'include'`（安全 Cookie）
 * - 401 自动跳转到 `/login`
 * - 错误响应优先读取 `{detail: string}`，否则回退到通用文案
 */

// 根据当前访问地址 / 运行环境自动匹配 API 地址
// - 在浏览器中默认走相对路径 `/api/*`，交给 Next.js / 反向代理处理
// - 在 onebox / 容器内的 SSR 场景下，默认直连容器内的 FastAPI（127.0.0.1:BACKEND_PORT）
function getApiBaseUrl(): string {
  // 优先使用环境变量
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // 在客户端运行时，默认使用相对路径，让 Next.js rewrites / 反向代理处理 /api 转发
  if (typeof window !== "undefined") {
    return "";
  }

  // 服务端渲染时（例如 onebox 容器内），默认直连容器内部的 FastAPI 服务
  const backendPort = process.env.BACKEND_PORT ?? "8876";
  return `http://127.0.0.1:${backendPort}`;
}

export const API_BASE_URL = getApiBaseUrl();

// 前端默认分页大小（对齐 PRD：单页 10 条）
export const DEFAULT_PAGE_SIZE = 10;

type JsonRecord = Record<string, unknown>;

function toQueryString(params?: Record<string, unknown>) {
  if (!params) return "";
  const usp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    usp.set(k, String(v));
  }
  const s = usp.toString();
  return s ? `?${s}` : "";
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(options?.body ? { "Content-Type": "application/json" } : {}),
      ...(options?.headers || {}),
    },
  });

  if (response.status === 401) {
    // 如果当前在登录页面，不自动跳转（避免无限刷新）
    // AuthGate 组件会处理登录页面的权限检查
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    throw new Error("未认证");
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  const result = await safeJson(response);

  if (!response.ok) {
    const detail =
      typeof result === "object" && result
        ? (result as JsonRecord).detail
        : undefined;
    throw new Error(typeof detail === "string" ? detail : "请求失败");
  }

  return result as T;
}

// ------------------------
// Auth
// ------------------------

export interface AdminMeResponse {
  id: string;
  username: string;
  created_at: number;
  last_login_at: number | null;
  is_initial_password: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  admin: AdminMeResponse;
  is_initial_password: boolean;
}

export const authApi = {
  login: (username: string, password: string) =>
    apiRequest<LoginResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    apiRequest<{ success: boolean; message: string }>("/api/auth/logout", {
      method: "POST",
    }),
  me: () => apiRequest<AdminMeResponse>("/api/auth/me"),
  checkInitialPassword: () =>
    apiRequest<{ is_initial_password: boolean }>(
      "/api/auth/check-initial-password",
    ),
  changePassword: (
    old_password: string,
    new_password: string,
    confirm_password: string,
  ) =>
    apiRequest<{ success: boolean; message: string }>(
      "/api/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({ old_password, new_password, confirm_password }),
      },
    ),
};

// ------------------------
// Dashboard
// ------------------------

export interface RecentVerification {
  code_id: string;
  code: string;
  project_id: string;
  project_name: string;
  verified_at: number;
  verified_by: string | null;
}

export interface DashboardOverviewResponse {
  project_count: number;
  code_count: number;
  verified_count: number;
  unverified_count: number;
  recent_verifications: RecentVerification[];
}

export const dashboardApi = {
  overview: () =>
    apiRequest<DashboardOverviewResponse>("/api/dashboard/overview"),
};

// ------------------------
// Projects
// ------------------------

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: number;
  expires_at: number | null;
  status: boolean;
  is_expired: boolean;
  // 统计字段（详情页可能返回）
  code_count?: number;
  verified_count?: number;
  unverified_count?: number;
  expired_count?: number;
}

export interface PagedResponse<T> {
  total: number;
  page: number;
  page_size: number;
  items: T[];
}

export const projectsApi = {
  list: (params?: {
    page?: number;
    page_size?: number;
    search?: string;
    status?: boolean;
  }) =>
    apiRequest<PagedResponse<Project>>(
      `/api/projects${toQueryString({
        page_size: DEFAULT_PAGE_SIZE,
        ...params,
      })}`,
    ),

  create: (data: {
    name: string;
    description?: string | null;
    expires_at?: number | null;
  }) =>
    apiRequest<Project>("/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  get: (id: string) => apiRequest<Project>(`/api/projects/${id}`),

  update: (
    id: string,
    data: {
      name?: string;
      description?: string | null;
      expires_at?: number | null;
      status?: boolean;
    },
  ) =>
    apiRequest<Project>(`/api/projects/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/api/projects/${id}`, { method: "DELETE" }),
};

// ------------------------
// API Keys (Project scoped)
// ------------------------

export interface ApiKeyItem {
  id: string;
  project_id: string;
  api_key: string;
  name: string | null;
  is_active: boolean;
  last_used_at: number | null;
  created_at: number;
  created_by: string;
}

export interface ApiKeyWithSecret extends ApiKeyItem {
  secret: string;
}

export interface ApiKeyListResponse {
  items: ApiKeyItem[];
  total: number;
}

export const apiKeysApi = {
  list: (projectId: string) =>
    apiRequest<ApiKeyListResponse>(`/api/projects/${projectId}/api-keys`),

  generateOrRefresh: (projectId: string, data: { name?: string | null }) =>
    apiRequest<ApiKeyWithSecret>(`/api/projects/${projectId}/api-keys`, {
      method: "POST",
      body: JSON.stringify({ project_id: projectId, ...data }),
    }),

  toggle: (apiKeyId: string, isActive: boolean) =>
    apiRequest<ApiKeyItem>(`/api/api-keys/${apiKeyId}`, {
      method: "PUT",
      body: JSON.stringify({ is_active: isActive }),
    }),

  delete: (apiKeyId: string) =>
    apiRequest<{ success: boolean; message: string }>(`/api/api-keys/${apiKeyId}`, {
      method: "DELETE",
    }),
};

// ------------------------
// Codes
// ------------------------

export interface InvitationCode {
  id: string;
  code: string;
  project_id: string;
  status: boolean;
  is_disabled: boolean;
  is_expired: boolean;
  created_at: number;
  expires_at: number | null;
  verified_at: number | null;
  verified_by: string | null;
}

export const codesApi = {
  generate: (
    projectId: string,
    data: {
      count: number;
      expires_at?: number | null;
      length?: number | null;
      prefix?: string | null;
      suffix?: string | null;
    },
  ) =>
    apiRequest<InvitationCode[]>(`/api/projects/${projectId}/codes/generate`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  list: (
    projectId: string,
    params?: {
      page?: number;
      page_size?: number;
      status?: boolean;
      is_disabled?: boolean;
      is_expired?: boolean;
      search?: string;
    },
  ) =>
    apiRequest<PagedResponse<InvitationCode>>(
      `/api/projects/${projectId}/codes${toQueryString({
        page_size: DEFAULT_PAGE_SIZE,
        ...params,
      })}`,
    ),

  get: (projectId: string, codeId: string) =>
    apiRequest<InvitationCode>(`/api/projects/${projectId}/codes/${codeId}`),

  delete: (projectId: string, codeId: string) =>
    apiRequest<void>(`/api/projects/${projectId}/codes/${codeId}`, { method: "DELETE" }),

  update: (codeId: string, data: { is_disabled?: boolean }) =>
    apiRequest<InvitationCode>(`/api/codes/${codeId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  reactivate: (codeId: string) =>
    apiRequest<InvitationCode>(`/api/codes/${codeId}/reactivate`, {
      method: "POST",
    }),

  batchDisableUnused: (
    projectId: string,
    params?: { search?: string; status?: boolean; is_disabled?: boolean; is_expired?: boolean },
  ) =>
    apiRequest<{ success: boolean; message: string; disabled_count: number }>(
      `/api/projects/${projectId}/codes/batch-disable-unused${toQueryString(params)}`,
      { method: "POST", body: JSON.stringify({ status: false }) },
    ),

  batchDisableUnusedCount: (
    projectId: string,
    params?: { search?: string; status?: boolean; is_disabled?: boolean; is_expired?: boolean },
  ) =>
    apiRequest<{ count: number }>(
      `/api/projects/${projectId}/codes/batch-disable-unused/count${toQueryString(params)}`,
    ),
};

// ------------------------
// Verify
// ------------------------

export interface VerifyResponse {
  success: boolean;
  message: string;
  code_id?: string | null;
  project_id?: string | null;
  project_name?: string | null;
  verified_at?: number | null;
}

export const verifyApi = {
  verify: (code: string, verified_by?: string | null) =>
    apiRequest<VerifyResponse>("/api/codes/verify", {
      method: "POST",
      body: JSON.stringify({ code, verified_by: verified_by || null }),
    }),
};

// ------------------------
// Verification logs（用于 /verify 历史记录）
// ------------------------

export interface VerificationLogItem {
  id: string;
  code_id: string;
  code: string;
  project_id: string;
  project_name: string;
  verified_at: number;
  verified_by: string | null;
  result: "success" | "failed";
  reason: string | null;
}

export const verificationLogsApi = {
  list: (params?: { page?: number; page_size?: number }) =>
    apiRequest<PagedResponse<VerificationLogItem>>(
      `/api/verification-logs${toQueryString(params)}`,
    ),
};

// ------------------------
// Docs API
// ------------------------

export const docsApi = {
  getSdkApi: () =>
    apiRequest<string>("/api/docs/sdk-api", {
      headers: {
        Accept: "text/plain",
      },
    }).then((response) => {
      // 处理 PlainTextResponse
      if (typeof response === "string") {
        return response;
      }
      return JSON.stringify(response);
    }),

  getPythonSdk: () =>
    apiRequest<string>("/api/docs/python-sdk", {
      headers: {
        Accept: "text/plain",
      },
    }).then((response) => {
      // 处理 PlainTextResponse
      if (typeof response === "string") {
        return response;
      }
      return JSON.stringify(response);
    }),

  getJavascriptSdk: () =>
    apiRequest<string>("/api/docs/javascript-sdk", {
      headers: {
        Accept: "text/plain",
      },
    }).then((response) => {
      // 处理 PlainTextResponse
      if (typeof response === "string") {
        return response;
      }
      return JSON.stringify(response);
    }),
};
