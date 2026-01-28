'use client';

import { useUser } from "@clerk/nextjs";
import Link from "next/link";

export default function DashboardPage() {
  const { user } = useUser();

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-4">Welcome, {user?.firstName || "User"}!</h1>
      <p className="text-muted-foreground mb-8">
        This is your dashboard. From here you can manage your condo resources.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/dashboard/properties" className="block p-6 border rounded-lg hover:border-primary transition-colors">
          <h2 className="text-xl font-semibold mb-2">Properties</h2>
          <p className="text-sm text-muted-foreground">Manage houses and units in your community.</p>
        </Link>
        <Link href="/dashboard/settings" className="block p-6 border rounded-lg hover:border-primary transition-colors">
          <h2 className="text-xl font-semibold mb-2">Settings</h2>
          <p className="text-sm text-muted-foreground">Invite users and manage your profile.</p>
        </Link>
      </div>
    </div>
  );
}
