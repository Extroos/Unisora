import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { Construction } from 'lucide-react';
import { Button } from '../ui/Button';

export function ComingSoonModal() {
  const { comingSoonFeature, setComingSoonFeature } = useAppStore();

  return (
    <AnimatePresence>
      {comingSoonFeature && (
        <div className="fixed inset-0 z-200 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setComingSoonFeature(null)}
            className="absolute inset-0 bg-black/60"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="relative w-full max-w-[400px] bg-surface-1 rounded border border-border shadow-2xl overflow-hidden"
          >
            <div className="p-6">
              <h2 className="text-lg font-bold text-white mb-2 uppercase tracking-widest">Under Development</h2>
              <p className="text-[14px] text-text-secondary leading-relaxed mb-0">
                The <span className="text-text-primary font-bold">{comingSoonFeature}</span> module is currently undergoing system integration and is scheduled for a future deployment.
              </p>
            </div>

            <div className="bg-surface-2 p-4 flex items-center justify-end">
              <button 
                onClick={() => setComingSoonFeature(null)}
                className="px-6 py-2.5 rounded text-sm font-medium text-white bg-accent hover:bg-accent-hover transition-colors"
              >
                Got it
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
