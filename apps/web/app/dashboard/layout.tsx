'use client';

import { ReactNode } from "react";
import { SidebarLayout } from "@/components/dashboard/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <SidebarLayout>{children}</SidebarLayout>;
}
