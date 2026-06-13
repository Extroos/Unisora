import React from 'react';
import { cn } from '../../lib/utils';
import { Search } from 'lucide-react';

type InputProps = {
  variant?: 'default' | 'search' | 'chat';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  label?: string;
} & React.InputHTMLAttributes<HTMLInputElement>;

export function Input({
  variant = 'default',
  leftIcon,
  rightIcon,
  error,
  label,
  className,
  ...props
}: InputProps) {
  const baseClasses = "w-full bg-surface-2 border text-text-primary placeholder:text-text-muted focus:outline-none transition-all duration-200 font-sans";

  const variantStyles: Record<string, string> = {
    default: "border-border focus:border-accent/50 focus:ring-2 focus:ring-accent/10 rounded-xl px-4 py-2.5 text-sm",
    search: "border-border focus:border-accent/50 focus:ring-2 focus:ring-accent/10 rounded-xl py-2 text-sm",
    chat: "border-transparent bg-transparent focus:ring-0 text-[15px] py-1.5",
  };

  if (variant === 'search') {
    return (
      <div className={cn("relative", className)}>
        {label && <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">{label}</label>}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input className={cn(baseClasses, variantStyles.search, "pl-9 pr-4")} {...props} />
        </div>
        {error && <p className="text-danger text-xs mt-1.5 font-medium">{error}</p>}
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      {label && <label className="block text-[11px] font-bold text-text-tertiary uppercase tracking-wider mb-2">{label}</label>}
      <div className="relative">
        {leftIcon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">{leftIcon}</span>}
        <input
          className={cn(
            baseClasses,
            variantStyles[variant],
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            error && "border-danger/50 focus:border-danger focus:ring-danger/10",
          )}
          {...props}
        />
        {rightIcon && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">{rightIcon}</span>}
      </div>
      {error && <p className="text-danger text-xs mt-1.5 font-medium">{error}</p>}
    </div>
  );
}
