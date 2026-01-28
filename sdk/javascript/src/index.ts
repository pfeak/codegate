/**
 * CodeGate JavaScript/TypeScript SDK
 * @packageDocumentation
 */

export { generateSignature, EMPTY_STRING_HASH } from './signature';
export { CodeGateClient, CodeGateApiError } from './client';
export type {
  CodeGateClientConfig,
  Project,
  Code,
  CodeListResponse,
  VerifyResult,
  ReactivateResult,
  Statistics,
  CodeStatus,
  ListCodesOptions,
  VerifyCodeOptions,
  ReactivateCodeOptions,
  VerificationLog,
} from './types';
