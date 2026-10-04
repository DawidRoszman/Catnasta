import Link from "next/link";
import { cn } from "@/app/lib/cn";

export function PawIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <ellipse cx="12" cy="15.5" rx="5.2" ry="4.4" />
      <ellipse cx="5.2" cy="10.4" rx="2.1" ry="2.6" transform="rotate(-18 5.2 10.4)" />
      <ellipse cx="9.3" cy="6.6" rx="2.2" ry="2.8" transform="rotate(-6 9.3 6.6)" />
      <ellipse cx="14.7" cy="6.6" rx="2.2" ry="2.8" transform="rotate(6 14.7 6.6)" />
      <ellipse cx="18.8" cy="10.4" rx="2.1" ry="2.6" transform="rotate(18 18.8 10.4)" />
    </svg>
  );
}

export default function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn("group inline-flex items-center gap-2.5", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-brass text-felt-950 shadow-[0_6px_18px_-6px_rgb(227_169_75/0.8)] transition-transform group-hover:-rotate-6">
        <PawIcon className="h-5 w-5" />
      </span>
      <span className="font-display text-xl font-semibold tracking-tight text-cream">
        Catnasta
      </span>
    </Link>
  );
}
