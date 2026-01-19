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
  const checkingRef = useRef(false);
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;

    // 如果路径没有变化，则跳过
    if (lastPathRef.current === pathname) {
      return;
    }

    // 如果正在检查中，等待当前检查完成
    if (checkingRef.current) {
      return;
    }

    // 标记开始检查
    checkingRef.current = true;
    const currentPath = pathname;
    lastPathRef.current = currentPath;
    setReady(false);

    let cancelled = false;

    const run = async () => {
      // 对于登录页面，先尝试检查是否已登录，如果失败则直接允许访问
      if (currentPath === "/login") {
        try {
          const me = await authApi.me();

          if (cancelled) return;

          // 检查 pathname 是否在请求期间发生了变化
          if (currentPath !== pathname) {
            checkingRef.current = false;
            return;
          }

          // 已登录，跳转到正确页面
          router.replace(me.is_initial_password ? "/change-password" : "/");
          checkingRef.current = false;
          return;
        } catch {
          // 未登录，允许访问登录页
          if (cancelled) return;

          if (currentPath !== pathname) {
            checkingRef.current = false;
            return;
          }

          setReady(true);
          checkingRef.current = false;
          return;
        }
      }

      // 对于其他页面，需要检查登录状态
      try {
        const me = await authApi.me();

        if (cancelled) return;

        // 检查 pathname 是否在请求期间发生了变化
        if (currentPath !== pathname) {
          checkingRef.current = false;
          return;
        }

        // 初始密码强制改密
        if (me.is_initial_password && currentPath !== "/change-password") {
          router.replace("/change-password");
          checkingRef.current = false;
          return;
        }

        // 改密页：非初始密码用户不允许访问
        if (!me.is_initial_password && currentPath === "/change-password") {
          router.replace("/");
          checkingRef.current = false;
          return;
        }

        setReady(true);
        checkingRef.current = false;
      } catch {
        // 未登录，跳转到登录页
        if (cancelled) return;

        if (currentPath !== pathname) {
          checkingRef.current = false;
          return;
        }

        router.replace("/login");
        checkingRef.current = false;
      }
    };

    run();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  return <>{children}</>;
}

