import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface MenuItem {
  id: string;
  label: React.ReactNode;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
  onClick?: () => void;
  danger?: boolean;
  divider?: boolean;
  submenu?: MenuItem[];
}

interface ContextMenuProps {
  children: React.ReactNode;
  items: MenuItem[] | (() => MenuItem[]);
  className?: string;
  key?: React.Key;
}

function ContextMenuItem({ item, onClose }: { item: MenuItem; onClose: () => void; key?: React.Key }) {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  
  return (
    <div
      onMouseEnter={() => setIsSubmenuOpen(true)}
      onMouseLeave={() => setIsSubmenuOpen(false)}
      className="relative"
    >
      <button
        disabled={item.disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (item.disabled) return;
          if (item.submenu) {
            item.onClick?.();
            return;
          }
          onClose();
          item.onClick?.();
        }}
        className={cn(
          "w-full flex items-center justify-between px-3 py-1.5 text-[13px] font-medium transition-colors text-left group",
          item.disabled
            ? "opacity-40 cursor-not-allowed text-text-muted"
            : item.danger 
              ? "text-[#f23f43] hover:bg-[#f23f43] hover:text-white" 
              : "text-text-secondary hover:bg-[#5865f2] hover:text-white"
        )}
      >
        <div className="flex items-center gap-2">
          {item.icon && <span className="opacity-70 group-hover:text-white">{item.icon}</span>}
          <div className="flex flex-col text-left">
            {item.label}
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {item.rightIcon && <span className="opacity-60 group-hover:text-white">{item.rightIcon}</span>}
          {typeof item.checked === 'boolean' && (
            <div className={cn(
              "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
              item.checked 
                ? "bg-[#5865f2] border-[#5865f2] text-white" 
                : "border-[#4e5058] group-hover:border-white"
            )}>
              {item.checked && (
                <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
              )}
            </div>
          )}
          {item.shortcut && <span className="text-[10px] opacity-50 tracking-widest">{item.shortcut}</span>}
        </div>
      </button>
      
      {item.submenu && isSubmenuOpen && (
        <div 
          className="absolute left-full top-0 ml-0.5 w-56 bg-surface-1 border border-border shadow-2xl rounded-xl py-1.5 z-[10000]"
          onClick={(e) => e.stopPropagation()}
        >
          {item.submenu.map((subItem, idx) => (
            subItem.divider ? (
              <div key={`sub-div-${idx}`} className="h-px bg-border my-1" />
            ) : (
              <button
                key={subItem.id}
                disabled={subItem.disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (subItem.disabled) return;
                  onClose();
                  subItem.onClick?.();
                }}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-1.5 text-[13px] font-medium transition-colors text-left group",
                  subItem.disabled
                    ? "opacity-40 cursor-not-allowed text-text-muted"
                    : subItem.danger 
                      ? "text-[#f23f43] hover:bg-[#f23f43] hover:text-white" 
                      : "text-text-secondary hover:bg-[#5865f2] hover:text-white"
                )}
              >
                <div className="flex items-center gap-2">
                  {subItem.icon && <span className="opacity-70 group-hover:text-white">{subItem.icon}</span>}
                  <div className="flex flex-col text-left">
                    {subItem.label}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {subItem.rightIcon && <span className="opacity-60 group-hover:text-white">{subItem.rightIcon}</span>}
                  {typeof subItem.checked === 'boolean' && (
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0",
                      subItem.checked 
                        ? "bg-[#5865f2] border-[#5865f2] text-white" 
                        : "border-[#4e5058] group-hover:border-white"
                    )}>
                      {subItem.checked && (
                        <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 24 24">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                        </svg>
                      )}
                    </div>
                  )}
                  {subItem.shortcut && <span className="text-[10px] opacity-50 tracking-widest">{subItem.shortcut}</span>}
                </div>
              </button>
            )
          ))}
        </div>
      )}
    </div>
  );
}

export function ContextMenu({ children, items, className }: ContextMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [computedItems, setComputedItems] = useState<MenuItem[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('contextmenu', handleClickOutside);
    }
    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('contextmenu', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleCloseAll = () => setIsOpen(false);
    window.addEventListener('nexus:close-menus', handleCloseAll);
    return () => window.removeEventListener('nexus:close-menus', handleCloseAll);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    const activeItems = typeof items === 'function' ? items() : items;
    if (!activeItems || activeItems.length === 0) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    // Close any other open menus
    window.dispatchEvent(new CustomEvent('nexus:close-menus'));
    
    // Adjust position to stay within screen
    let x = e.clientX;
    let y = e.clientY;
    
    // Approximate menu dimensions
    const menuWidth = 220;
    const menuHeight = activeItems.length * 36;
    
    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
    
    setComputedItems(activeItems);
    setPosition({ x, y });
    setIsOpen(true);
  };

  return (
    <div className={className} onContextMenu={handleContextMenu}>
      {children}
      
      {isOpen && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 9999 }}
          className="w-56 bg-surface-1 border border-border shadow-2xl rounded-xl py-1.5 transition-all select-none"
        >
          {computedItems.map((item, i) => (
            item.divider ? (
              <div key={`div-${i}`} className="h-px bg-border my-1" />
            ) : (
              <ContextMenuItem key={item.id} item={item} onClose={() => setIsOpen(false)} />
            )
          ))}
        </div>
      )}
    </div>
  );
}

interface DropdownProps {
  trigger?: React.ReactNode;
  children?: React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
}

export function Dropdown({ trigger, children, items, align = 'left' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const displayTrigger = children || trigger;

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>{displayTrigger}</div>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className={cn(
              "absolute top-full mt-1 z-50 w-56 bg-surface-1 border border-border shadow-2xl rounded-xl py-1.5",
              align === 'right' ? 'right-0' : 'left-0'
            )}
          >
            {items.map((item, i) => (
              item.divider ? (
                <div key={`div-${i}`} className="h-px bg-border my-1" />
              ) : (
                <ContextMenuItem key={item.id} item={item} onClose={() => setIsOpen(false)} />
              )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

