'use client';

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSession } from "next-auth/react";
import { UserMenu } from "@/components/auth/UserMenu";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const t = useTranslations('header');
  const { data: session } = useSession();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled
        ? 'bg-background/90 backdrop-blur-xl border-b border-border shadow-sm'
        : 'bg-transparent'
    }`}>
      <div className="container-tight">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-sm group-hover:shadow-md group-hover:shadow-primary/20 transition-shadow">
              <span className="text-primary-foreground font-bold text-sm">C</span>
            </div>
            <span className="text-xl font-bold">{t('brand')}</span>
          </Link>

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

          <div className="hidden lg:flex items-center gap-3">
            <LanguageSwitcher />
            {!session ? (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-sm font-medium">
                    {t('login')}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button className="btn-primary text-sm py-2.5 px-6">
                    {t('requestDemo')}
                  </Button>
                </Link>
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
            className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="absolute top-0 right-0 w-72 h-full bg-background border-l border-border shadow-2xl animate-in slide-in-from-right duration-300"
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
                      <Button variant="ghost" className="justify-start w-full">
                        {t('login')}
                      </Button>
                    </Link>
                    <Link href="/login">
                      <Button className="btn-primary w-full">
                        {t('requestDemo')}
                      </Button>
                    </Link>
                  </>
                ) : null}
                {session ? (
                  <>
                    <Link href="/dashboard">
                      <Button className="btn-primary w-full">
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
