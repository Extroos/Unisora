import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  isDanger = false
}: ConfirmationModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-[440px] bg-surface-1 rounded border border-border shadow-2xl overflow-hidden"
          >
            <div className="p-4">
              <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
              <p className="text-[15px] text-text-secondary leading-normal">
                {description}
              </p>
            </div>

            <div className="bg-surface-2 p-4 flex items-center justify-end gap-3">
              <button 
                onClick={onClose}
                className="text-sm font-medium text-white hover:underline px-4 py-2"
              >
                {cancelLabel}
              </button>
              <button 
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
                className={cn(
                  "px-6 py-2.5 rounded text-sm font-medium text-white transition-colors",
                  isDanger ? "bg-danger hover:bg-danger/80" : "bg-accent hover:bg-accent-hover"
                )}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
