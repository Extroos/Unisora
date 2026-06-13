import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, Hash, MessageSquare, User, Settings, Compass, Volume2, Command, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';

interface SpotlightProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SpotlightItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

export function Spotlight({ isOpen, onClose }: SpotlightProps) {
  const { servers, channels, users, messages, setActiveChannel, setActiveDm, setActiveServer, setSettingsOpen, setExploreOpen } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const allItems: SpotlightItem[] = useMemo(() => {
    const items: SpotlightItem[] = [];

    // Quick actions
    items.push(
      { id: 'settings', label: 'System Settings', description: 'Access global configuration', icon: <Settings size={14} />, category: 'System', action: () => { setSettingsOpen(true); onClose(); } },
      { id: 'explore', label: 'Network Directory', description: 'Search public environments', icon: <Compass size={14} />, category: 'System', action: () => { setExploreOpen(true); onClose(); } },
    );

    // Messages
    if (query.length > 2) {
      messages.filter(m => m.content.toLowerCase().includes(query.toLowerCase())).slice(0, 5).forEach(m => {
        const user = users[m.userId];
        const ch = channels.find(c => c.id === m.channelId);
        items.push({
          id: `msg-${m.id}`,
          label: m.content,
          description: `${user?.username || 'Unknown'} in #${ch?.name || 'internal'}`,
          icon: <MessageSquare size={14} />,
          category: 'Telemetry',
          action: () => { 
            if (ch) {
              setActiveServer(ch.serverId);
              setActiveChannel(ch.id);
            }
            onClose(); 
          }
        });
      });
    }

    // Channels
    channels.forEach(ch => {
      const server = servers.find(s => s.id === ch.serverId);
      items.push({
        id: `ch-${ch.id}`,
        label: `#${ch.name}`,
        description: server?.name,
        icon: ch.type === 'voice' ? <Volume2 size={14} /> : <Hash size={14} />,
        category: 'Environments',
        action: () => { setActiveServer(ch.serverId); setActiveChannel(ch.id); onClose(); }
      });
    });

    // Users
    Object.values(users).filter(u => u.id !== 'u1').forEach(u => {
      items.push({
        id: `dm-${u.id}`,
        label: u.username,
        description: u.customStatus || u.status.toUpperCase(),
        icon: <User size={14} />,
        category: 'Personnel',
        action: () => { setActiveServer(null); setActiveDm(u.id); onClose(); }
      });
    });

    return items;
  }, [servers, channels, users, messages, query]);

  const filtered = query.trim()
    ? allItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase()) || item.description?.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  const grouped = filtered.reduce<Record<string, SpotlightItem[]>>((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  useEffect(() => { setSelectedIndex(0); }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatFiltered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatFiltered[selectedIndex]) {
      flatFiltered[selectedIndex].action();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selectedIndex]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 z-200 bg-black/60" />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[540px] max-h-[60vh] z-210 flex flex-col bg-surface-1 border border-border shadow-2xl rounded overflow-hidden"
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border bg-surface-2">
              <Search size={16} className="text-text-muted" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="EXECUTE COMMAND OR ACCESS RESOURCE..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none font-bold uppercase tracking-wider"
              />
              <kbd className="text-[10px] font-bold text-text-muted bg-surface-3 px-1.5 py-0.5 rounded border border-border">ESC</kbd>
            </div>

            {/* Result Set */}
            <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar p-1.5 max-h-[45vh] bg-surface-1">
              {flatFiltered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-30">
                  <Command size={24} className="mb-2" />
                  <p className="text-[11px] font-bold uppercase tracking-widest text-text-muted">No matching resources</p>
                </div>
              ) : (
                Object.entries(grouped).map(([category, items]) => (
                  <div key={category} className="mb-2 last:mb-0">
                    <div className="px-3 py-1.5 text-[9px] font-black text-text-muted uppercase tracking-[0.2em]">{category}</div>
                    {items.map(item => {
                      const globalIdx = flatFiltered.indexOf(item);
                      const isActive = globalIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-index={globalIdx}
                          onClick={item.action}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded text-left transition-all group",
                            isActive ? "bg-accent text-white" : "hover:bg-surface-2 text-text-secondary"
                          )}
                        >
                          <div className={cn("w-6 h-6 rounded flex items-center justify-center shrink-0 border", isActive ? "bg-white/20 border-white/20" : "bg-surface-3 border-border")}>
                            {item.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className={cn("text-[13px] font-bold block truncate", isActive ? "text-white" : "text-text-primary")}>{item.label}</span>
                            {item.description && <span className={cn("text-[10px] truncate block font-medium", isActive ? "text-white/70" : "text-text-muted")}>{item.description}</span>}
                          </div>
                          {isActive && <ArrowRight size={14} className="text-white/60 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Keybind Guide */}
            <div className="px-4 py-2 border-t border-border flex items-center gap-6 text-[9px] font-bold text-text-muted bg-surface-2 uppercase tracking-widest">
              <span className="flex items-center gap-1.5">NAVIGATE <span className="text-text-tertiary">↑↓</span></span>
              <span className="flex items-center gap-1.5">SELECT <span className="text-text-tertiary">ENTER</span></span>
              <span className="flex items-center gap-1.5">CLOSE <span className="text-text-tertiary">ESC</span></span>
              <div className="ml-auto flex items-center gap-1.5 opacity-50">
                <Command size={10} />
                Nexus_OS v2.4
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
