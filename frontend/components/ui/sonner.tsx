/**
 * Sonner Toaster（shadcn/ui 推荐）
 */

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        duration: 3000,
      }}
    />
  );
}

