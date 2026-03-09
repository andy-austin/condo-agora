'use client';

import { ReactNode } from 'react';
import { useAuth, RedirectToSignIn } from '@clerk/nextjs';
import { SidebarLayout } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return null;
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <SidebarLayout>{children}</SidebarLayout>;
}
