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

const colorMap: Record<string, string> = {
  properties: 'bg-amber-50 text-amber-500',
  residents: 'bg-blue-50 text-blue-500',
  proposals: 'bg-emerald-50 text-emerald-500',
  documents: 'bg-purple-50 text-purple-500',
  default: 'bg-primary/10 text-primary',
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
  const iconKey = typeof icon === 'string' ? icon : 'default';
  const Icon =
    typeof icon === 'string'
      ? iconMap[icon] || iconMap.default
      : icon;
  const colorClass = colorMap[iconKey] || colorMap.default;

  return (
    <div className="flex items-center justify-center py-16 px-4">
      <div className="text-center max-w-sm">
        {/* Illustration */}
        <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center mb-6 ${colorClass}`}>
          <Icon size={36} />
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
