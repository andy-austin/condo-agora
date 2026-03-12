"use client";

import { signOut, useSession } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { User, LogOut } from "lucide-react";

export function UserMenu() {
  const { data: session } = useSession();
  const t = useTranslations("userMenu");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!session?.user) return null;

  const initials = session.user.name
    ? session.user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : session.user.email?.[0]?.toUpperCase() || "?";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        {session.user.image ? (
          <img
            src={session.user.image}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-border bg-card py-1 shadow-lg">
          <div className="border-b border-border px-4 py-2.5">
            <p className="truncate text-sm font-medium text-foreground">
              {session.user.name || session.user.email}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {session.user.email || (session.user as any).phone}
            </p>
          </div>
          <div className="py-1">
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-foreground hover:bg-muted transition-colors"
            >
              <User className="w-4 h-4" />
              {t("profile")}
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-2 w-full px-4 py-2 text-sm text-destructive hover:bg-muted transition-colors"
            >
              <LogOut className="w-4 h-4" />
              {t("signOut")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
