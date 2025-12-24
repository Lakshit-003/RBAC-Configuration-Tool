"use client";

import React, { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  title?: string;
  description?: string;
  type?: ToastType;
};

type ToastContextType = {
  toast: (t: Omit<Toast, "id">) => void;
};

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((prev) => [...prev, { id, ...t }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      4000
    );
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`max-w-xs rounded-md p-3 shadow-md transition-opacity $
              t.type === "error" ? "bg-destructive text-destructive-foreground" : "bg-card text-card-foreground"
            }`}
            role="status"
            aria-live="polite"
          >
            {t.title && <div className="font-medium">{t.title}</div>}
            {t.description && <div className="text-sm">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx.toast;
}
