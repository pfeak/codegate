/**
 * Toast 通知组件
 * 
 * Copyright 2026 pfeak
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { toast as sonnerToast } from "sonner";

import { Toaster } from "@/components/ui/sonner";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastContextType {
  show: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

/**
 * 兼容层：
 * - 旧代码通过 `ToastProvider/useToast()` 使用
 * - 底层实现已迁移到 shadcn 推荐的 Sonner
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const api = useMemo<ToastContextType>(() => {
    const show = (message: string, type: ToastType = "info", duration?: number) => {
      const opts = duration ? { duration } : undefined;
      if (type === "success") return sonnerToast.success(message, opts);
      if (type === "error") return sonnerToast.error(message, opts);
      if (type === "warning") return sonnerToast.warning(message, opts);
      return sonnerToast.info(message, opts);
    };

    return {
      show,
      success: (message, duration) => show(message, "success", duration),
      error: (message, duration) => show(message, "error", duration ?? 5000),
      warning: (message, duration) => show(message, "warning", duration ?? 4000),
      info: (message, duration) => show(message, "info", duration),
    };
  }, []);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <Toaster />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
