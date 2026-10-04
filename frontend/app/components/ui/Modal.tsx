"use client";
import React, { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/app/lib/cn";
import { useIsClient } from "@/app/lib/useIsClient";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** When false the modal can't be closed by Escape, backdrop or the close button. */
  dismissible?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  size = "md",
  className,
}: ModalProps) {
  const isClient = useIsClient();
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current!;
    const focusables = () =>
      Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE));
    (dialog.querySelector<HTMLElement>("[data-autofocus]") ??
      focusables()[0] ??
      dialog
    ).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) {
        e.stopPropagation();
        onCloseRef.current?.();
      }
      if (e.key === "Tab") {
        const items = focusables();
        if (items.length === 0) {
          e.preventDefault();
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus?.();
    };
  }, [open, dismissible]);

  if (!open || !isClient) {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-felt-950/70 backdrop-blur-sm animate-fade-in"
        onClick={() => dismissible && onClose?.()}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full rounded-2xl bg-surface ring-1 ring-line-strong shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] animate-pop-in focus:outline-none",
          size === "sm" && "max-w-sm",
          size === "md" && "max-w-md",
          size === "lg" && "max-w-2xl",
          className,
        )}
      >
        <div className="flex items-start gap-4 px-6 pt-6">
          <div className="flex-1">
            <h2 id={titleId} className="font-display text-2xl font-semibold text-cream">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1.5 text-sm text-muted">
                {description}
              </p>
            )}
          </div>
          {dismissible && onClose && (
            <button
              type="button"
              onClick={onClose}
              className="-mr-2 -mt-1 rounded-lg p-2 text-muted transition-colors hover:bg-white/5 hover:text-cream"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        {children && <div className="px-6 pt-5">{children}</div>}
        <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-6">{footer}</div>
      </div>
    </div>,
    document.body,
  );
}
