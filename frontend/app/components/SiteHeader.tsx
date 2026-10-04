"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { useCookies } from "next-client-cookies";
import { ChevronDown, KeyRound, LogOut, ShieldCheck } from "lucide-react";
import Logo from "./Logo";
import { useUserContext, useUserDispatch } from "./UserContext";
import { UserActionType } from "./userReduces";
import { Button, ButtonLink } from "./ui/Button";
import { Modal } from "./ui/Modal";
import { Field, Input } from "./ui/Input";
import { useToast } from "./ui/Feedback";
import { Skeleton } from "./ui/Skeleton";
import { api } from "../lib/api";
import { cn } from "../lib/cn";

const NAV = [
  { href: "/", label: "Play" },
  { href: "/game", label: "Lobby" },
  { href: "/#rules", label: "Rules" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const user = useUserContext();

  // The game table is a full-screen experience with its own HUD.
  if (pathname.startsWith("/game/")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-felt-950/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Logo />
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                pathname === item.href
                  ? "text-cream"
                  : "text-muted hover:text-cream",
              )}
            >
              {item.label}
            </Link>
          ))}
          {user?.username === "admin" && (
            <Link
              href="/admin"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                pathname === "/admin" ? "text-cream" : "text-muted hover:text-cream",
              )}
            >
              Admin
            </Link>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {!user?.ready ? (
            <Skeleton className="h-9 w-32" />
          ) : user.username ? (
            <AccountMenu username={user.username} />
          ) : (
            <>
              <ButtonLink href="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/register" size="sm">
                Sign up
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function AccountMenu({ username }: { username: string }) {
  const [open, setOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const cookies = useCookies();
  const dispatch = useUserDispatch();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const signOut = () => {
    cookies.remove("token");
    dispatch?.({ type: UserActionType.SET_USERNAME, payload: "" });
    setOpen(false);
    toast("You've been signed out.", { tone: "success" });
    router.push("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2.5 text-sm font-semibold text-cream ring-1 ring-line transition-colors hover:ring-line-strong"
        aria-haspopup="menu"
        aria-expanded={open}
        id="account-menu"
      >
        <span className="grid h-7 w-7 place-items-center rounded-lg bg-felt-600 font-display text-sm uppercase text-brass">
          {username.charAt(0)}
        </span>
        <span className="max-w-[10rem] truncate">{username}</span>
        <ChevronDown className={cn("h-4 w-4 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-56 overflow-hidden rounded-xl bg-surface-raised p-1.5 ring-1 ring-line-strong shadow-card animate-pop-in"
        >
          <p className="px-3 pb-2 pt-1.5 text-xs text-muted">
            Signed in as <span className="font-semibold text-cream-dim">{username}</span>
          </p>
          {username === "admin" && (
            <Link
              role="menuitem"
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-cream-dim hover:bg-white/5 hover:text-cream"
            >
              <ShieldCheck className="h-4 w-4" />Admin panel
            </Link>
          )}
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              setPasswordOpen(true);
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-cream-dim hover:bg-white/5 hover:text-cream"
          >
            <KeyRound className="h-4 w-4" />Change password
          </button>
          <button
            role="menuitem"
            type="button"
            onClick={signOut}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-coral hover:bg-coral/10"
          >
            <LogOut className="h-4 w-4" />Sign out
          </button>
        </div>
      )}
      <ChangePasswordModal
        open={passwordOpen}
        onClose={() => setPasswordOpen(false)}
        token={cookies.get("token") ?? ""}
      />
    </div>
  );
}

function ChangePasswordModal({
  open,
  onClose,
  token,
}: {
  open: boolean;
  onClose: () => void;
  token: string;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const close = () => {
    setOldPassword("");
    setNewPassword("");
    setError("");
    onClose();
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await axios.put(
        api + "/user/edit_password",
        { oldPassword, newPassword },
        { headers: { Authorization: "Bearer " + token } },
      );
      const msg: string = response.data.msg ?? "Password updated";
      if (/updated|changed|success/i.test(msg)) {
        toast(msg, { tone: "success" });
        close();
      } else {
        setError(msg);
      }
    } catch {
      setError("Couldn't update your password. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Change password"
      description="Use at least a few characters you don't use anywhere else."
      footer={
        <>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="change-password" loading={saving}>
            Save password
          </Button>
        </>
      }
    >
      <form id="change-password" onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Current password" htmlFor="old-password">
          <Input
            id="old-password"
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
            required
            data-autofocus
          />
        </Field>
        <Field label="New password" htmlFor="new-password" error={error || undefined}>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
