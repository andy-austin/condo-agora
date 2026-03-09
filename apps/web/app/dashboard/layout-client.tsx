'use client';

import { ReactNode } from 'react';
import { SidebarLayout } from '@/components/dashboard/Sidebar';

export function DashboardLayoutClient({ children }: { children: ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
