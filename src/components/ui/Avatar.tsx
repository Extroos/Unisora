import React from 'react';
import { cn } from '../../lib/utils';
import { Moon } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'idle' | 'dnd' | 'offline';
  showStatus?: boolean;
  className?: string;
  onClick?: () => void;
  circular?: boolean;
}

const sizeClasses: Record<string, string> = {
  xs: 'w-6 h-6 min-w-[24px] min-h-[24px] aspect-square text-[8px]',
  sm: 'w-8 h-8 min-w-[32px] min-h-[32px] aspect-square text-[10px]',
  md: 'w-10 h-10 min-w-[40px] min-h-[40px] aspect-square text-xs',
  lg: 'w-14 h-14 min-w-[56px] min-h-[56px] aspect-square text-sm',
  xl: 'w-18 h-18 min-w-[72px] min-h-[72px] aspect-square text-lg',
};

const statusSizeClasses: Record<string, string> = {
  xs: 'w-2 h-2 border',
  sm: 'w-2.5 h-2.5 border-[1.5px]',
  md: 'w-3 h-3 border-2',
  lg: 'w-4 h-4 border-[2.5px]',
  xl: 'w-5 h-5 border-[3px]',
};

const statusColors: Record<string, string> = {
  online: 'bg-status-online',
  idle: 'bg-status-idle',
  dnd: 'bg-status-dnd',
  offline: 'bg-status-offline',
};

export function Avatar({ src, alt, fallback, size = 'md', status, showStatus = true, className, onClick, circular }: AvatarProps) {
  const initials = fallback || alt?.charAt(0)?.toUpperCase() || '?';
  const roundedClass = circular 
    ? 'rounded-full' 
    : (size === 'xs' || size === 'sm' ? 'rounded-md' : size === 'md' ? 'rounded-xl' : 'rounded-2xl');

  return (
    <div 
      className={cn(
        "relative shrink-0", 
        sizeClasses[size],
        onClick && "cursor-pointer", 
        roundedClass, 
        className
      )} 
      onClick={onClick}
    >
      {src ? (
        <img
          src={src}
          alt={alt || ''}
          className={cn(
            "w-full h-full object-cover",
            circular ? "border-none bg-transparent" : "bg-surface-3 border border-border",
            roundedClass
          )}
        />
      ) : (
        <div className={cn(
          "w-full h-full flex items-center justify-center font-bold text-text-secondary",
          circular ? "border-none bg-transparent" : "bg-surface-3 border border-border",
          roundedClass
        )}>
          {initials}
        </div>
      )}
      {showStatus && status && (
        status === 'idle' ? (
          <Moon 
            className={cn(
              "absolute -bottom-0.5 -right-0.5 select-none pointer-events-none fill-[#f0b232] text-[#f0b232] z-30",
              statusSizeClasses[size]
            )}
            style={{ border: 'none', backgroundColor: 'transparent' }}
          />
        ) : (
          <div className={cn(
            "absolute -bottom-0.5 -right-0.5 rounded-full border-surface-2 z-30",
            statusSizeClasses[size],
            status === 'offline' ? statusColors.offline : statusColors[status],
          )} />
        )
      )}
    </div>
  );
}

export function AvatarGroup({ children, max = 4, className }: { children: React.ReactNode; max?: number; className?: string }) {
  const childArray = React.Children.toArray(children);
  const visible = childArray.slice(0, max);
  const overflow = childArray.length - max;

  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {visible.map((child, i) => (
        <div key={i} className="relative z-1 hover:z-10 transition-transform hover:scale-110">
          {child}
        </div>
      ))}
      {overflow > 0 && (
        <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded bg-surface-3 border border-border text-text-tertiary text-xs font-semibold flex items-center justify-center z-1 shadow-sm">
          +{overflow}
        </div>
      )}
    </div>
  );
}
