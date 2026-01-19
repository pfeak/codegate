/**
 * AuthGate
 *
 * 目标（遵循 docs/design/ui/common/ui_prd_default.md 与 ui_prd_common.md）：
 * - 未登录访问任意页面 -> 跳转 `/login`
 * - 使用初始密码登录 -> 强制跳转 `/change-password`
 * - 已登录访问 `/login` -> 自动跳转到正确页面
 */

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { authApi } from "@/lib/api";

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (lastPathRef.current === pathname) return;
    lastPathRef.current = pathname;

    let cancelled = false;
    setReady(false);

    const run = async () => {
      try {
        const me = await authApi.me();

        if (cancelled) return;

        // 登录页：已登录则直接跳转
        if (pathname === "/login") {
          router.replace(me.is_initial_password ? "/change-password" : "/");
          return;
        }

        // 初始密码强制改密
        if (me.is_initial_password && pathname !== "/change-password") {
          router.replace("/change-password");
          return;
        }

        // 改密页：非初始密码用户不允许访问
        if (!me.is_initial_password && pathname === "/change-password") {
          router.replace("/");
          return;
        }

        setReady(true);
      } catch {
        if (cancelled) return;

        // 未登录：
        // - 允许访问登录页
        // - 其他页面统一跳转登录
        if (pathname === "/login") {
          setReady(true);
          return;
        }

        router.replace("/login");
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">加载中...</div>
      </div>
    );
  }

  return <>{children}</>;
}

