import React from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps {
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'gradient';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  dot?: boolean;
  count?: number;
  className?: string;
}

const variantClasses: Record<string, string> = {
  default: 'bg-surface-3 text-text-secondary border border-border',
  accent: 'bg-surface-3 text-text-secondary border border-border',
  success: 'bg-success/10 text-success border border-success/20',
  warning: 'bg-warning/10 text-warning border border-warning/20',
  danger: 'bg-danger/10 text-danger border border-danger/20',
  info: 'bg-info/10 text-info border border-info/20',
  gradient: 'bg-surface-3 text-text-secondary border border-border',
};

const sizeClasses: Record<string, string> = {
  sm: 'text-[10px] px-1.5 py-0.5',
  md: 'text-xs px-2 py-0.5',
};

export function Badge({ variant = 'default', size = 'sm', children, dot, className }: BadgeProps) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 rounded-md font-semibold uppercase tracking-wider whitespace-nowrap",
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function NotificationBadge({ count, className }: { count: number; className?: string }) {
  if (count <= 0) return null;
  return (
    <span className={cn(
      "absolute -top-1 -right-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1 shadow-sm shadow-danger/30",
      className
    )}>
      {count > 99 ? '99+' : count}
    </span>
  );
}
