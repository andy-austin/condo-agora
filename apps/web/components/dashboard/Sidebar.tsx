'use client';

import { useState, createContext, useContext, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { UserButton } from '@clerk/nextjs';
import { useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import {
  LayoutDashboard,
  Building2,
  Users,
  Lightbulb,
  Vote,
  BarChart3,
  Archive,
  Settings,
  Menu,
  X,
  ChevronLeft,
} from 'lucide-react';
import NotificationBell from './NotificationBell';

const navItems = [
  { href: '/dashboard', key: 'overview', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/properties', key: 'properties', icon: Building2 },
  { href: '/dashboard/committee', key: 'committee', icon: Users },
  { href: '/dashboard/proposals', key: 'proposals', icon: Lightbulb },
  { href: '/dashboard/vote', key: 'voting', icon: Vote },
  { href: '/dashboard/reports', key: 'reports', icon: BarChart3 },
  { href: '/dashboard/archive', key: 'archive', icon: Archive },
];

const bottomNavItems = [
  { href: '/dashboard/settings', key: 'settings', icon: Settings },
];

const SidebarContext = createContext({ collapsed: false });

export function useSidebar() {
  return useContext(SidebarContext);
}

export function SidebarLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className="min-h-screen bg-background">
        <SidebarNav collapsed={collapsed} setCollapsed={setCollapsed} />
        {/* Desktop top bar */}
        <TopBar collapsed={collapsed} />
        <main
          className={`pt-14 lg:pt-14 min-h-screen transition-all duration-300 ${
            collapsed ? 'lg:pl-[68px]' : 'lg:pl-60'
          }`}
        >
          {children}
        </main>
      </div>
    </SidebarContext.Provider>
  );
}

function TopBar({ collapsed }: { collapsed: boolean }) {
  return (
    <header
      className={`hidden lg:flex fixed top-0 right-0 h-14 z-30 items-center justify-end gap-3 px-6 border-b border-border bg-background transition-all duration-300 ${
        collapsed ? 'left-[68px]' : 'left-60'
      }`}
    >
      <LanguageSwitcher />
      <NotificationBell />
      <UserButton
        appearance={{
          elements: { avatarBox: 'w-8 h-8' },
        }}
      />
    </header>
  );
}

function SidebarNav({
  collapsed,
  setCollapsed,
}: {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}) {
  const pathname = usePathname();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations('dashboard');

  const isActive = (href: string, exact?: boolean) => {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + '/');
  };

  /* Sidebar content shared between desktop and mobile */
  const navigationContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
            <span className="text-primary-foreground font-bold text-sm">C</span>
          </div>
          {!collapsed && (
            <span className="text-lg font-bold truncate">Condo Ágora</span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md hover:bg-sidebar-accent transition-colors text-muted-foreground"
          aria-label={collapsed ? t('sidebar.expandSidebar') : t('sidebar.collapseSidebar')}
        >
          <ChevronLeft
            size={16}
            className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href, item.exact);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm">{t(`sidebar.${item.key}`)}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-sidebar-border px-3 py-4 space-y-1">
        {bottomNavItems.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 relative ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-sidebar-accent hover:text-foreground'
              }`}
            >
              {active && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <Icon size={20} className="shrink-0" />
              {!collapsed && <span className="text-sm">{t(`sidebar.${item.key}`)}</span>}
            </Link>
          );
        })}

        {/* User profile — mobile drawer only */}
        <div className="lg:hidden">
          <div className="px-3 mt-2">
            <LanguageSwitcher />
          </div>
          <div className="flex items-center gap-3 px-3 py-3 mt-2 rounded-lg bg-sidebar-accent/50">
            <UserButton
              appearance={{
                elements: { avatarBox: 'w-8 h-8' },
              }}
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">
                {user?.firstName || user?.lastName
                  ? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
                  : user?.primaryEmailAddress?.emailAddress}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
            <NotificationBell />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-background border-b border-border flex items-center px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-muted transition-colors"
          aria-label={t('sidebar.openMenu')}
        >
          <Menu size={20} />
        </button>
        <Link href="/dashboard" className="flex items-center gap-2 ml-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">C</span>
          </div>
          <span className="text-lg font-bold">Condo Ágora</span>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div
            className="w-72 h-full bg-sidebar-background border-r border-sidebar-border shadow-xl animate-in slide-in-from-left duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted transition-colors"
              aria-label={t('sidebar.closeMenu')}
            >
              <X size={18} />
            </button>
            {navigationContent}
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col fixed top-0 left-0 h-screen bg-sidebar-background border-r border-sidebar-border z-40 transition-all duration-300 ${
          collapsed ? 'w-[68px]' : 'w-60'
        }`}
      >
        {navigationContent}
      </aside>
    </>
  );
}

export default SidebarNav;
