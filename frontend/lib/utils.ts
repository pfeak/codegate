/**
 * 前端通用工具函数
 *
 * - cn(): Tailwind className 合并（shadcn/ui 约定）
 * - 时间/数字/UUID 展示格式化：遵循 docs/design/ui/common/ui_prd_default.md
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * UTC 秒级时间戳 -> 本地时间字符串 `YYYY-MM-DD HH:mm`
 */
export function timestampToLocal(timestamp?: number | null): string {
  if (!timestamp) return "-";
  const date = new Date(timestamp * 1000);
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

/**
 * UTC 秒级时间戳 -> `datetime-local` 输入值（本地时间） `YYYY-MM-DDTHH:mm`
 */
export function timestampToDateTimeLocalValue(timestamp?: number | null): string {
  if (!timestamp) return "";
  const date = new Date(timestamp * 1000);
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mm = pad2(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/**
 * `datetime-local` 输入值（本地时间） -> UTC 秒级时间戳
 */
export function dateTimeLocalToTimestamp(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  const ms = date.getTime();
  if (Number.isNaN(ms)) return null;
  return Math.floor(ms / 1000);
}

export function formatNumber(value?: number | null): string {
  const n = typeof value === "number" ? value : 0;
  return new Intl.NumberFormat("zh-CN").format(n);
}

export function truncateText(
  text: string | null | undefined,
  maxLength: number,
): string {
  if (!text) return "-";
  const t = String(text);
  if (t.length <= maxLength) return t;
  return `${t.slice(0, Math.max(0, maxLength))}...`;
}

export function shortUuid(uuid?: string | null): string {
  if (!uuid) return "-";
  const u = String(uuid);
  return u.length <= 8 ? u : `${u.slice(0, 8)}...`;
}

/**
 * 从 Error 或未知异常中提取可读错误信息，失败时回退到给定的默认文案。
 */
export function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }
  if (error && typeof error === "object") {
    const maybeMessage = (error as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.trim()) {
      return maybeMessage.trim();
    }
  }
  return fallback;
}

