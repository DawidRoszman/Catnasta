"use client";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Info, LucideIcon, Megaphone, TriangleAlert, X } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useIsClient } from "@/app/lib/useIsClient";
import { Modal } from "./Modal";
import { Button } from "./Button";

type ToastTone = "info" | "success" | "error" | "announcement";

type Toast = {
  id: number;
  tone: ToastTone;
  title?: string;
  message: string;
};

type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
};

type FeedbackContextValue = {
  toast: (message: string, options?: { tone?: ToastTone; title?: string; duration?: number }) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function useToast() {
  const context = useContext(FeedbackContext);
  if (context === null) {
    throw new Error("useToast must be used within a FeedbackProvider");
  }
  return context.toast;
}

export function useConfirm() {
  const context = useContext(FeedbackContext);
  if (context === null) {
    throw new Error("useConfirm must be used within a FeedbackProvider");
  }
  return context.confirm;
}

const toneStyles: Record<ToastTone, { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "text-sky" },
  success: { icon: CheckCircle2, className: "text-mint" },
  error: { icon: TriangleAlert, className: "text-coral" },
  announcement: { icon: Megaphone, className: "text-brass" },
};

export function FeedbackProvider({ children }: { children: React.ReactNode }) {
  const isClient = useIsClient();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback<FeedbackContextValue["toast"]>(
    (message, { tone = "info", title, duration } = {}) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev.slice(-3), { id, tone, title, message }]);
      setTimeout(() => dismiss(id), duration ?? (tone === "error" ? 6000 : 4000));
    },
    [dismiss],
  );

  const confirm = useCallback((options: ConfirmOptions) => {
    setConfirmState(options);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolveRef.current?.(value);
    resolveRef.current = null;
    setConfirmState(null);
  };

  return (
    <FeedbackContext.Provider value={{ toast, confirm }}>
      {children}
      <Modal
        open={confirmState !== null}
        onClose={() => settle(false)}
        title={confirmState?.title}
        description={confirmState?.message}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => settle(false)}>
              {confirmState?.cancelLabel ?? "Cancel"}
            </Button>
            <Button
              variant={confirmState?.danger ? "danger" : "primary"}
              onClick={() => settle(true)}
              data-autofocus
            >
              {confirmState?.confirmLabel ?? "Confirm"}
            </Button>
          </>
        }
      />
      {isClient &&
        createPortal(
          <div
            className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
            aria-live="polite"
            role="region"
            aria-label="Notifications"
          >
            {toasts.map((item) => {
              const { icon: Icon, className } = toneStyles[item.tone];
              return (
                <div
                  key={item.id}
                  role={item.tone === "error" ? "alert" : "status"}
                  
                  className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl bg-surface-raised/95 px-4 py-3 ring-1 ring-line-strong shadow-card backdrop-blur-md animate-pop-in"
                >
                  <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", className)} aria-hidden />
                  <div className="flex-1 text-sm">
                    {item.title && <p className="font-semibold text-cream">{item.title}</p>}
                    <p className="text-cream-dim">{item.message}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dismiss(item.id)}
                    className="rounded-md p-1 text-muted hover:text-cream"
                    aria-label="Dismiss notification"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </FeedbackContext.Provider>
  );
}
