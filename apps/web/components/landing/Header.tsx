'use client';

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/auth/UserMenu";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('header');
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
      <div className="container-tight">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold">{t('brand')}</span>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('features')}
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('howItWorks')}
            </a>
            <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {t('testimonials')}
            </a>
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
            {!session ? (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-sm font-medium">
                    {t('login')}
                  </Button>
                </Link>
                <Button className="btn-primary text-sm py-2.5 px-6">
                  {t('requestDemo')}
                </Button>
              </>
            ) : null}
            {session ? (
              <>
                <Link href="/dashboard">
                  <Button className="btn-primary text-sm py-2.5 px-6">
                    {t('dashboard')}
                  </Button>
                </Link>
                <UserMenu />
              </>
            ) : null}
          </div>

          <button
            className="lg:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 z-40 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="absolute top-0 right-0 w-72 h-full bg-background border-l border-border shadow-xl animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-1 p-4">
              <a
                href="#features"
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t('features')}
              </a>
              <a
                href="#how-it-works"
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t('howItWorks')}
              </a>
              <a
                href="#testimonials"
                onClick={() => setIsOpen(false)}
                className="px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                {t('testimonials')}
              </a>
              <div className="border-t border-border mt-4 pt-4 flex flex-col gap-3 px-4">
                <LanguageSwitcher />
                {!session ? (
                  <>
                    <Link href="/login">
                      <Button variant="ghost" className="justify-start">
                        {t('login')}
                      </Button>
                    </Link>
                    <Button className="btn-primary">
                      {t('requestDemo')}
                    </Button>
                  </>
                ) : null}
                {session ? (
                  <>
                    <Link href="/dashboard">
                      <Button className="btn-primary">
                        {t('dashboard')}
                      </Button>
                    </Link>
                    <UserMenu />
                  </>
                ) : null}
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
