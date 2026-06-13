import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface TextInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  description: string;
  placeholder?: string;
  defaultValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function TextInputModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  placeholder = 'Enter value...',
  defaultValue = '',
  confirmLabel = 'Save',
  cancelLabel = 'Cancel'
}: TextInputModalProps) {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (value.trim()) {
      onClose();
      onConfirm(value.trim());
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-[440px] bg-surface-1 rounded border border-border shadow-2xl overflow-hidden"
          >
            <form onSubmit={handleSubmit}>
              <div className="p-4">
                <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
                <p className="text-[15px] text-text-secondary leading-normal mb-4">
                  {description}
                </p>

                <div className="bg-surface-0 rounded-md p-3 mb-2">
                  <label className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-2 block">{title}</label>
                  <input
                    ref={inputRef}
                    type="text"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none text-white placeholder:text-text-muted focus:outline-none p-0"
                  />
                </div>
              </div>

              <div className="bg-surface-2 p-4 flex items-center justify-end gap-3">
                <button 
                  type="button"
                  onClick={onClose}
                  className="text-sm font-medium text-white hover:underline px-4 py-2"
                >
                  {cancelLabel}
                </button>
                <button 
                  type="submit"
                  disabled={!value.trim()}
                  className={cn(
                    "px-6 py-2.5 rounded text-sm font-medium text-white transition-colors",
                    "bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {confirmLabel}
                </button>
              </div>
            </form>
          </motion.div>

        </div>
      )}
    </AnimatePresence>
  );
}
