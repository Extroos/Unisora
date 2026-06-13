import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Hash, MessageSquare, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAppStore } from '../../store/useAppStore';
import { cn, formatTime } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

interface MessageSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MessageSearch({ isOpen, onClose }: MessageSearchProps) {
  const { users, channels, activeChannelId, activeDmId } = useAppStore();
  const [query, setQuery] = useState('');
  const [searchAll, setSearchAll] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => { if (isOpen) setTimeout(() => inputRef.current?.focus(), 100); }, [isOpen]);

  const currentChannelId = activeChannelId || (activeDmId ? `dm-[u1]-${activeDmId}` : null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&channelId=${encodeURIComponent(currentChannelId || '')}&all=${searchAll}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        }
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query, searchAll, currentChannelId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-80" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="fixed top-16 left-1/2 -translate-x-1/2 w-[520px] max-h-[60vh] glass-heavy rounded-2xl shadow-2xl z-85 overflow-hidden flex flex-col"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search size={16} className="text-text-muted shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search messages..."
                className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-muted focus:outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 rounded-md hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors"><X size={12} /></button>
              )}
              <kbd className="text-[9px] text-text-muted bg-surface-3 px-1.5 py-0.5 rounded border border-border font-mono">ESC</kbd>
            </div>

            {/* Filter Toggle */}
            <div className="px-4 py-2 border-b border-border flex items-center justify-between bg-surface-2/30">
               <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setSearchAll(false)}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5",
                      !searchAll ? "text-accent" : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    <Hash size={12} /> Current Channel
                  </button>
                  <button 
                    onClick={() => setSearchAll(true)}
                    className={cn(
                      "text-[10px] font-bold uppercase tracking-widest transition-colors flex items-center gap-1.5",
                      searchAll ? "text-accent" : "text-text-muted hover:text-text-secondary"
                    )}
                  >
                    <Globe size={12} /> Global Search
                  </button>
               </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {query.trim().length < 2 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Search size={28} className="text-text-muted mb-2 opacity-20" />
                  <p className="text-xs text-text-tertiary">Type at least 2 characters to search</p>
                </div>
              ) : isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-xs text-text-tertiary">Searching history...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <MessageSquare size={28} className="text-text-muted mb-2 opacity-20" />
                  <p className="text-xs text-text-tertiary">No messages found for "{query}"</p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest px-2 py-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
                  {results.map(msg => {
                    const user = users[msg.userId];
                    const channel = channels.find(c => c.id === msg.channelId);
                    // Highlight query match
                    const idx = msg.content.toLowerCase().indexOf(query.toLowerCase());
                    const before = msg.content.substring(Math.max(0, idx - 30), idx);
                    const match = msg.content.substring(idx, idx + query.length);
                    const after = msg.content.substring(idx + query.length, idx + query.length + 50);

                    return (
                      <div key={msg.id} className="flex gap-3 p-2.5 rounded-xl hover:bg-surface-2 cursor-pointer transition-colors">
                        <Avatar src={user?.avatarUrl} alt={user?.username} size="sm" showStatus={false} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-text-primary">{user?.username}</span>
                            {channel && <span className="text-[10px] text-text-muted">in #{channel.name}</span>}
                            <span className="text-[10px] text-text-muted ml-auto">{formatTime(msg.timestamp)}</span>
                          </div>
                          <p className="text-xs text-text-tertiary leading-relaxed">
                            {before && <span>...{before}</span>}
                            <span className="bg-accent/20 text-accent font-semibold rounded px-0.5">{match}</span>
                            <span>{after}{after.length >= 50 ? '...' : ''}</span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
