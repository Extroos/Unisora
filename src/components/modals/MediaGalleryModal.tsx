import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Image as ImageIcon, File as FileIcon, ExternalLink, Search, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface MediaGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
}

export function MediaGalleryModal({ isOpen, onClose, channelId }: MediaGalleryModalProps) {
  const { messages, users } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'media' | 'files'>('all');
  const [search, setSearch] = useState('');

  const allAttachments = messages
    .filter(m => m.channelId === channelId && m.attachments && m.attachments.length > 0)
    .flatMap(m => m.attachments!.map(a => ({ ...a, timestamp: m.timestamp, userId: m.userId, messageId: m.id })));

  const filtered = allAttachments.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(search.toLowerCase());
    const isMedia = a.type?.startsWith('image') || a.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
    
    if (filter === 'media') return matchesSearch && isMedia;
    if (filter === 'files') return matchesSearch && !isMedia;
    return matchesSearch;
  });

  if (!isOpen) return null;

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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.15 }}
            className="relative w-full max-w-4xl bg-surface-1 rounded-lg border border-border shadow-2xl overflow-hidden flex flex-col h-[80vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 bg-surface-2 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded bg-surface-1 flex items-center justify-center border border-border shadow-sm text-accent">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-text-primary tracking-tight">Media Gallery</h2>
                  <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">{allAttachments.length} total items found</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative group/search">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within/search:text-accent transition-colors" />
                  <input 
                    type="text" 
                    placeholder="Search gallery..." 
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-surface-3 border border-border rounded py-2 pl-9 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent w-64 transition-all"
                  />
                </div>
                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all">
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Sub-header / Filters */}
            <div className="px-6 py-2.5 bg-surface-0 border-b border-border flex items-center gap-2 shrink-0 overflow-x-auto scrollbar-none">
              {[
                { id: 'all', label: 'All Files', icon: <Filter size={12} /> },
                { id: 'media', label: 'Images & Video', icon: <ImageIcon size={12} /> },
                { id: 'files', label: 'Documents', icon: <FileIcon size={12} /> },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setFilter(opt.id as any)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-1.5 rounded transition-all text-[10px] font-black uppercase tracking-widest",
                    filter === opt.id 
                      ? "bg-accent text-white shadow-lg shadow-accent/20" 
                      : "text-text-muted hover:bg-surface-2 hover:text-text-primary"
                  )}
                >
                  {opt.icon}
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-surface-1">
              {filtered.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
                  <div className="w-16 h-16 rounded-full bg-surface-3 border border-border flex items-center justify-center mb-4">
                    <ImageIcon size={32} className="text-text-muted" />
                  </div>
                  <h3 className="text-sm font-bold text-text-muted uppercase tracking-[0.2em]">No items found</h3>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {filtered.map((item, idx) => {
                    const isMedia = item.type?.startsWith('image') || item.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                    return (
                      <motion.div 
                        key={`${item.messageId}-${idx}`}
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: idx * 0.01 }}
                        className="group relative aspect-square bg-surface-2 border border-border rounded-lg overflow-hidden cursor-pointer hover:border-accent transition-all shadow-sm"
                      >
                        {isMedia ? (
                          <img src={item.url} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4">
                            <div className="w-12 h-12 rounded-lg bg-surface-3 flex items-center justify-center mb-2.5 border border-border transition-colors group-hover:bg-accent/5 group-hover:border-accent/30">
                              <FileIcon size={24} className="text-text-muted group-hover:text-accent" />
                            </div>
                            <span className="text-[10px] font-bold text-text-secondary text-center line-clamp-2 px-1 tracking-tight">{item.name}</span>
                          </div>
                        )}

                        {/* Overlay */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-all duration-200 flex flex-col justify-end p-3">
                           <div className="flex items-center justify-between">
                             <div className="flex flex-col min-w-0">
                               <span className="text-[10px] font-bold text-white truncate">{users[item.userId]?.username}</span>
                               <span className="text-[9px] text-white/60 font-medium">{new Date(item.timestamp).toLocaleDateString()}</span>
                             </div>
                             <div className="flex gap-1.5">
                               <button 
                                 onClick={(e) => { e.stopPropagation(); window.open(item.url, '_blank'); }}
                                 className="w-7 h-7 flex items-center justify-center rounded bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/10"
                                 title="Open Original"
                               >
                                 <ExternalLink size={12} />
                               </button>
                             </div>
                           </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-surface-2 border-t border-border flex justify-between items-center shrink-0">
               <div className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                 <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Storage Status: Synchronized</p>
               </div>
               <span className="text-[10px] font-black text-text-primary bg-surface-3 border border-border px-3 py-1 rounded-full uppercase tracking-widest">{filtered.length} Indexed Items</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
