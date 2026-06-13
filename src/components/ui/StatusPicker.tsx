import React, { useState, useRef, useEffect } from 'react';
import { X, Circle, Moon, MinusCircle, EyeOff, Smile, Pencil, ChevronRight, UserCircle, Copy, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Avatar } from './Avatar';
import { useAppStore } from '../../store/useAppStore';

type UserStatus = 'online' | 'idle' | 'dnd' | 'offline';

interface StatusPickerProps {
  isOpen: boolean;
  onClose: () => void;
  currentStatus: UserStatus;
  currentCustom?: string;
  onStatusChange: (status: UserStatus) => void;
  onCustomStatusChange: (text: string) => void;
}

const STATUS_OPTIONS: { id: UserStatus; label: string; icon: any; color: string; fill: string }[] = [
  { id: 'online', label: 'Online', icon: Circle, color: 'text-success', fill: 'fill-success' },
  { id: 'idle', label: 'Idle', icon: Moon, color: 'text-warning', fill: 'fill-warning' },
  { id: 'dnd', label: 'Do Not Disturb', icon: MinusCircle, color: 'text-danger', fill: 'fill-danger' },
  { id: 'offline', label: 'Invisible', icon: EyeOff, color: 'text-text-secondary', fill: '' },
];

export function StatusPicker({ isOpen, onClose, currentStatus, currentCustom, onStatusChange, onCustomStatusChange }: StatusPickerProps) {
  const [isEditingCustom, setIsEditingCustom] = useState(false);
  const [customText, setCustomText] = useState(currentCustom || '');
  const [showCopiedTooltip, setShowCopiedTooltip] = useState(false);
  const { currentUser, updateCurrentUser, setSettingsOpen, setComingSoonFeature } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { 
    if (isOpen) setCustomText(currentCustom || ''); 
    if (!isOpen) setIsEditingCustom(false);
  }, [isOpen, currentCustom]);

  useEffect(() => {
    if (isEditingCustom) inputRef.current?.focus();
  }, [isEditingCustom]);

  const activeStatus = STATUS_OPTIONS.find(s => s.id === currentStatus) || STATUS_OPTIONS[0];

  if (!currentUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-90 cursor-default" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-3 w-[300px] bg-surface-0 border border-border rounded-lg shadow-xl z-95 select-none"
          >
            {/* Header / Banner */}
            <div 
              className="h-12 bg-surface-3 relative rounded-t-lg overflow-hidden shrink-0"
              style={{ backgroundColor: currentUser?.themeColor || undefined }}
            >
              {currentUser?.bannerUrl ? (
                <img src={currentUser.bannerUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                !currentUser?.themeColor && <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/10" />
              )}
            </div>

            <div className="px-4 pb-4">
              {/* Profile Header */}
              <div className="flex items-end justify-between -mt-8 mb-4 relative">
                <div 
                  className="relative group/avatar cursor-pointer"
                  onClick={() => {
                    const url = prompt('Enter new avatar URL:', currentUser.avatarUrl);
                    if (url) updateCurrentUser({ avatarUrl: url });
                  }}
                >
                  <Avatar 
                    src={currentUser.avatarUrl} 
                    alt={currentUser.username} 
                    size="lg" 
                    status={currentStatus} 
                    showStatus={true} 
                    className="ring-4 ring-surface-0 bg-surface-2"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/avatar:opacity-100 rounded-full transition-opacity flex items-center justify-center">
                    <Pencil size={16} className="text-white" />
                  </div>
                </div>

                <div 
                  onClick={() => setIsEditingCustom(true)}
                  className="bg-surface-2 border border-border rounded px-2.5 py-1.5 cursor-pointer hover:bg-surface-3 transition-colors flex-1 ml-3 mb-1"
                >
                  {isEditingCustom ? (
                    <input
                      ref={inputRef}
                      value={customText}
                      onChange={e => setCustomText(e.target.value)}
                      onBlur={() => {
                        onCustomStatusChange(customText);
                        setIsEditingCustom(false);
                      }}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          onCustomStatusChange(customText);
                          setIsEditingCustom(false);
                        }
                        if (e.key === 'Escape') {
                          setCustomText(currentCustom || '');
                          setIsEditingCustom(false);
                        }
                      }}
                      className="w-full bg-transparent text-[11px] text-white focus:outline-none"
                      placeholder="Update status..."
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center gap-2 overflow-hidden">
                      <Smile size={12} className="text-text-muted shrink-0" />
                      <span className={cn(
                        "text-[11px] truncate",
                        currentCustom ? "text-text-primary font-medium" : "text-text-muted"
                      )}>
                        {currentCustom || "Update status..."}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* User Identity */}
              <div className="px-1 mb-4 relative">
                <div 
                  className="inline-flex items-baseline gap-1 cursor-pointer group/name relative"
                  title="Click to copy username"
                  onClick={() => {
                    navigator.clipboard.writeText(currentUser.username + '#' + (currentUser.tag || currentUser.id.slice(-4)));
                    setShowCopiedTooltip(true);
                    setTimeout(() => setShowCopiedTooltip(false), 1500);
                  }}
                >
                  <span className="text-base font-bold text-white tracking-tight group-hover/name:underline">{currentUser.username}</span>
                  <span className="text-xs text-text-muted font-medium opacity-60">#{currentUser.tag || currentUser.id.slice(-4)}</span>
                  
                  {/* Tooltip */}
                  <AnimatePresence>
                    {showCopiedTooltip && (
                      <motion.div 
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        className="absolute bottom-full left-1/2 -translate-y-1 -translate-x-1/2 px-2 py-0.5 bg-[#111214] text-white text-[10px] font-bold rounded shadow-xl whitespace-nowrap z-50 border border-border"
                      >
                        Copied!
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#111214]" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Action Rows */}
              <div className="space-y-4">
                <div className="bg-surface-2 border border-border rounded p-3">
                  <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mb-2">Technical Status</h4>
                  {currentUser.activity ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-surface-3 border border-border flex items-center justify-center text-[10px] font-bold text-accent">
                        {currentUser.activity.name[0]}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[12px] font-bold text-text-primary truncate">{currentUser.activity.name}</p>
                        <p className="text-[10px] text-text-muted truncate uppercase tracking-wider">{currentUser.activity.type}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-text-muted italic">System idle</p>
                  )}
                </div>

                <div className="bg-surface-2 border border-border rounded">
                  <button 
                    onClick={() => {
                      setSettingsOpen(true);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-3 transition-colors text-left group border-b border-border/50 rounded-t"
                  >
                    <Pencil size={14} className="text-text-muted group-hover:text-text-primary" />
                    <span className="text-[12px] font-bold text-text-secondary group-hover:text-text-primary flex-1">Configure Profile</span>
                  </button>

                  <div className="relative group/status">
                    <button className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-3 transition-colors text-left group rounded-b">
                      <activeStatus.icon size={14} className={cn(activeStatus.color, activeStatus.fill)} />
                      <span className="text-[12px] font-bold text-text-secondary group-hover:text-text-primary flex-1">{activeStatus.label}</span>
                      <ChevronRight size={14} className="text-text-muted" />
                    </button>
                    
                    {/* Submenu */}
                    <div className="invisible group-hover/status:visible opacity-0 group-hover/status:opacity-100 absolute left-[calc(100%+4px)] top-0 w-48 bg-surface-1 border border-border rounded shadow-2xl p-1 z-100 transition-all">
                      {STATUS_OPTIONS.map(opt => (
                        <button
                          key={opt.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            onStatusChange(opt.id);
                            onClose();
                          }}
                          className="w-full flex items-center gap-3 px-2.5 py-1.5 rounded hover:bg-accent text-text-secondary hover:text-white transition-all text-left"
                        >
                          <opt.icon size={12} className={cn(opt.color, opt.fill, "group-hover:text-white group-hover:fill-white")} />
                          <span className="text-[11px] font-bold uppercase tracking-wider">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-surface-2 border border-border rounded overflow-hidden">
                  <button 
                    onClick={() => {
                      setComingSoonFeature('Account Manager');
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-3 transition-colors text-left group border-b border-border/50"
                  >
                    <UserCircle size={14} className="text-text-muted group-hover:text-text-primary" />
                    <span className="text-[12px] font-bold text-text-secondary group-hover:text-text-primary flex-1">Switch Account</span>
                  </button>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(currentUser.id);
                      onClose();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-surface-3 transition-colors text-left group"
                  >
                    <Copy size={14} className="text-text-muted group-hover:text-text-primary" />
                    <span className="text-[12px] font-bold text-text-secondary group-hover:text-text-primary flex-1">Copy ID</span>
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
