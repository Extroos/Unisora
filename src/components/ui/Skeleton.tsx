import React from 'react';
import { cn } from '../../lib/utils';

interface SkeletonProps {
  className?: string;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

const roundedClasses: Record<string, string> = {
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
  full: 'rounded-full',
};

export function Skeleton({ className, rounded = 'lg' }: SkeletonProps) {
  return (
    <div className={cn(
      "bg-surface-3/50 animate-shimmer",
      roundedClasses[rounded],
      className
    )} />
  );
}

export function SkeletonMessage() {
  return (
    <div className="flex gap-4 p-2">
      <Skeleton className="w-10 h-10 shrink-0" rounded="xl" />
      <div className="flex-1 space-y-2 py-1">
        <div className="flex items-center gap-3">
          <Skeleton className="h-3.5 w-24" rounded="md" />
          <Skeleton className="h-3 w-12" rounded="md" />
        </div>
        <Skeleton className="h-3.5 w-3/4" rounded="md" />
        <Skeleton className="h-3.5 w-1/2" rounded="md" />
      </div>
    </div>
  );
}

export function SkeletonChannel() {
  return (
    <div className="flex items-center gap-2.5 px-2 py-2">
      <Skeleton className="w-4 h-4 shrink-0" rounded="sm" />
      <Skeleton className="h-3.5 flex-1 max-w-[120px]" rounded="md" />
    </div>
  );
}

export function SkeletonMember() {
  return (
    <div className="flex items-center gap-3 px-2 py-2">
      <Skeleton className="w-8 h-8 shrink-0" rounded="xl" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-20" rounded="md" />
        <Skeleton className="h-2.5 w-14" rounded="md" />
      </div>
    </div>
  );
}
