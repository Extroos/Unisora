import React from 'react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';

interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

export function TooltipWrapper({ children, content, position = 'top' }: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false);

  // In a real app we'd use Floating UI or Radix for robust tooltips, 
  // but for raw tailwind performance and simplicity we'll implement a fast one.
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  };

  return (
    <div 
      className="relative flex items-center justify-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className={cn(
            "absolute z-50 px-2.5 py-1.5 text-sm font-medium text-white bg-black rounded-md shadow-xl whitespace-nowrap pointer-events-none",
            positionClasses[position]
          )}
        >
          {content}
          <div className={cn(
            "absolute w-2 h-2 bg-black transform rotate-45",
            position === 'right' && "left-0 -ml-1 top-1/2 -translate-y-1/2",
            position === 'top' && "bottom-0 -mb-1 left-1/2 -translate-x-1/2",
            position === 'bottom' && "top-0 -mt-1 left-1/2 -translate-x-1/2",
            position === 'left' && "right-0 -mr-1 top-1/2 -translate-y-1/2",
          )} />
        </motion.div>
      )}
    </div>
  );
}
