'use client';

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b border-border bg-background/80 backdrop-blur-lg sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">C</span>
              </div>
              <span className="text-xl font-bold">Condo Agora</span>
            </Link>
            <div className="hidden md:flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/dashboard/properties"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Properties
              </Link>
              <Link
                href="/dashboard/settings"
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Settings
              </Link>
            </div>
          </div>
          <UserButton />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
