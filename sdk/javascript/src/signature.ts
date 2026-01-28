/**
 * 签名计算模块
 * HMAC-SHA256 签名生成，用于 API 认证。算法与 Python SDK、README 一致。
 */

import { createHash, createHmac } from 'crypto';

/** 空字符串的 SHA256 哈希值（常量） */
export const EMPTY_STRING_HASH =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

/**
 * 构建查询字符串：按键名排序，URL 编码
 */
function buildQueryString(params: Record<string, string>): string {
  return Object.keys(params)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&');
}

/**
 * 生成 HMAC-SHA256 签名
 *
 * @param method - HTTP 方法（大写），如 'GET', 'POST'
 * @param path - 请求路径（不含查询参数）
 * @param queryParams - 查询参数字典（可选）
 * @param body - 请求体字符串（可选）
 * @param timestamp - Unix 时间戳（秒级）
 * @param secret - API Secret（64 位十六进制字符串）
 * @returns HMAC-SHA256 签名的十六进制字符串（64 个字符，小写）
 */
export function generateSignature(
  method: string,
  path: string,
  queryParams: Record<string, string> | null | undefined,
  body: string | null | undefined,
  timestamp: number,
  secret: string
): string {
  if (timestamp == null || (typeof timestamp === 'number' && isNaN(timestamp))) {
    throw new Error('timestamp is required');
  }
  if (secret == null || secret === '') {
    throw new Error('secret is required');
  }

  // 1. 构建查询字符串（按键名排序，URL 编码）
  const queryString = queryParams && Object.keys(queryParams).length > 0
    ? buildQueryString(queryParams)
    : '';

  // 2. 计算请求体哈希
  const bodyHash = body
    ? createHash('sha256').update(body, 'utf8').digest('hex')
    : EMPTY_STRING_HASH;

  // 3. 构建签名字符串
  const stringToSign = `${method}\n${path}\n${queryString}\n${bodyHash}\n${timestamp}`;

  // 4. 计算 HMAC-SHA256 签名
  return createHmac('sha256', secret)
    .update(stringToSign, 'utf8')
    .digest('hex');
}
