import React from "react";
import { cn } from "@/app/lib/cn";

export const inputClasses = cn(
  "h-11 w-full rounded-xl bg-felt-950/60 px-3.5 text-cream placeholder:text-muted/70",
  "ring-1 ring-inset ring-line transition-shadow duration-150",
  "hover:ring-line-strong focus:outline-none focus:ring-2 focus:ring-brass",
  "disabled:opacity-50",
);

export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-cream-dim">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-sm text-coral" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}
