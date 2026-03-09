'use client';

import { ReactNode } from 'react';
import {
  Building2,
  Users,
  Lightbulb,
  FileText,
  Inbox,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap: Record<string, LucideIcon> = {
  properties: Building2,
  residents: Users,
  proposals: Lightbulb,
  documents: FileText,
  default: Inbox,
};

type EmptyStateProps = {
  icon?: string | LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
};

export default function EmptyState({
  icon = 'default',
  title,
  message,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  const Icon =
    typeof icon === 'string'
      ? iconMap[icon] || iconMap.default
      : icon;

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <Icon size={36} className="text-primary" />
        </div>

        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-muted-foreground text-sm mb-6">{message}</p>

        {actionLabel && onAction && (
          <Button onClick={onAction}>{actionLabel}</Button>
        )}
        {children}
      </div>
    </div>
  );
}
