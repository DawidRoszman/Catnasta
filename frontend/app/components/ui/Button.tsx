import Link from "next/link";
import React from "react";
import { cn } from "@/app/lib/cn";
import Spinner from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg" | "icon";

const variants: Record<Variant, string> = {
  primary:
    "bg-brass text-felt-950 shadow-[0_8px_24px_-10px_rgb(227_169_75/0.7)] hover:bg-brass-strong active:bg-brass-deep",
  secondary:
    "bg-surface-raised text-cream ring-1 ring-inset ring-line-strong hover:ring-brass/60 hover:bg-felt-700",
  ghost: "text-cream-dim hover:text-cream hover:bg-white/5",
  danger:
    "bg-coral/15 text-coral ring-1 ring-inset ring-coral/40 hover:bg-coral hover:text-felt-950",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-2.5 rounded-xl",
  icon: "h-10 w-10 rounded-xl",
};

export function buttonClasses({
  variant = "primary",
  size = "md",
  className,
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(
    "inline-flex items-center justify-center font-semibold whitespace-nowrap select-none cursor-pointer",
    "transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-45",
    variants[variant],
    sizes[size],
    className,
  );
}

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export function Button({
  variant,
  size,
  loading = false,
  className,
  children,
  disabled,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Spinner className="h-4 w-4" />}
      {children}
    </button>
  );
}

type ButtonLinkProps = React.ComponentProps<typeof Link> & {
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <Link className={buttonClasses({ variant, size, className })} {...props} />;
}
