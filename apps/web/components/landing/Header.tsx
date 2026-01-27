'use client';

import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Menu } from "lucide-react";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/nextjs";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const t = useTranslations('header');

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
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="ghost" className="text-sm font-medium">
                  {t('login')}
                </Button>
              </SignInButton>
              <Button className="btn-primary text-sm py-2.5 px-6">
                {t('requestDemo')}
              </Button>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
          </div>

          <button
            className="lg:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden py-4 border-t border-border">
            <nav className="flex flex-col gap-4">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t('features')}
              </a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t('howItWorks')}
              </a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                {t('testimonials')}
              </a>
              <div className="flex flex-col gap-2 pt-4">
                <LanguageSwitcher />
                <SignedOut>
                  <SignInButton mode="modal">
                    <Button variant="ghost" className="justify-start">
                      {t('login')}
                    </Button>
                  </SignInButton>
                  <Button className="btn-primary">
                    {t('requestDemo')}
                  </Button>
                </SignedOut>
                <SignedIn>
                  <UserButton afterSignOutUrl="/" />
                </SignedIn>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
