/**
 * CodeGate SDK 类型定义
 * 与 API 响应结构对应（README / ai-specs）
 */

export interface CodeGateClientConfig {
  apiKey: string;
  secret: string;
  projectId: string;
  baseUrl?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: boolean;
  expires_at: number;
  created_at: number;
  statistics: {
    total_codes: number;
    used_codes: number;
    unused_codes: number;
    disabled_codes: number;
    expired_codes: number;
  };
}

export interface VerificationLog {
  id: string;
  verified_at: number;
  verified_by: string;
  ip_address?: string;
  result: string;
}

export interface Code {
  id: string;
  code: string;
  status: boolean;
  is_disabled: boolean;
  is_expired: boolean;
  expires_at: number | null;
  verified_at: number | null;
  verified_by: string | null;
  created_at: number;
  verification_logs?: VerificationLog[];
}

export interface CodeListResponse {
  items: Code[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface VerifyResult {
  success: boolean;
  code_id?: string;
  code?: string;
  verified_at?: number;
  message?: string;
  error_code?: string;
}

export interface ReactivateResult {
  success: boolean;
  code_id?: string;
  code?: string;
  reactivated_at?: number;
  message?: string;
  error_code?: string;
}

export interface Statistics {
  project_id: string;
  total_codes: number;
  used_codes: number;
  unused_codes: number;
  disabled_codes: number;
  expired_codes: number;
  usage_rate: number;
  recent_verifications?: Array<{
    code: string;
    verified_at: number;
    verified_by: string;
  }>;
}

export type CodeStatus = 'unused' | 'used' | 'disabled' | 'expired';

export interface ListCodesOptions {
  page?: number;
  pageSize?: number;
  status?: CodeStatus;
  search?: string;
}

export interface VerifyCodeOptions {
  code: string;
  verifiedBy?: string;
}

export interface ReactivateCodeOptions {
  code: string;
  reactivatedBy?: string;
  reason?: string;
}
