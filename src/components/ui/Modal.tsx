import React from 'react';
import { cn } from '../../lib/utils';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  title?: string;
  showClose?: boolean;
  className?: string;
}

const sizeClasses: Record<string, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-5xl',
  full: 'max-w-[95vw] h-[90vh]',
};

export function Modal({ isOpen, onClose, children, size = 'md', title, showClose = true, className }: ModalProps) {
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={cn(
              "relative w-full bg-surface-1 border border-border rounded-lg shadow-2xl overflow-hidden flex flex-col",
              sizeClasses[size],
              className
            )}
          >
            {(title || showClose) && (
              <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 shrink-0">
                {title && (
                  <h2 className="text-[15px] font-bold text-white tracking-tight leading-none">
                    {title}
                  </h2>
                )}
                {showClose && (
                  <button
                    onClick={onClose}
                    className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-surface-3 text-text-muted hover:text-white transition-all ml-auto"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            )}
            <div className="flex-1 overflow-hidden flex flex-col">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function ModalBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-5 overflow-y-auto custom-scrollbar flex-1", className)}>{children}</div>;
}

export function ModalFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-5 py-4 bg-surface-2 border-t border-border/50 flex items-center justify-end gap-3 shrink-0", className)}>
      {children}
    </div>
  );
}
