import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Search, Hash, MessageSquare, Send, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { Message } from '../../types';

interface ForwardMessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

export function ForwardMessageModal({ isOpen, onClose, message }: ForwardMessageModalProps) {
  const { channels, users, servers, addMessage } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sentIds, setSentIds] = useState<string[]>([]);

  if (!isOpen || !message) return null;

  const allDestinations = [
    ...channels.map(c => ({ id: c.id, name: c.name, type: 'channel' as const, serverName: servers.find(s => s.id === c.serverId)?.name })),
    ...Object.values(users).filter(u => u.id !== 'u1').map(u => ({ id: `dm-[u1]-${u.id}`, name: u.username, type: 'dm' as const, serverName: 'Direct Message' }))
  ];

  const filtered = allDestinations.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.serverName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleForward = async () => {
    setIsSending(true);
    for (const id of selectedIds) {
      const content = `[Propagated from ${users[message.userId]?.username}]:\n${message.content}`;
      addMessage(content, id, message.attachments);
      setSentIds(prev => [...prev, id]);
    }
    setTimeout(() => {
      setIsSending(false);
      onClose();
    }, 800);
  };

  const toggleSelect = (id: string) => {
    if (sentIds.includes(id)) return;
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="fixed inset-0 z-10002 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-grayscale"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-md bg-surface-1 border border-border rounded-xl shadow-[0_32px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col max-h-[80vh]"
      >
        <div className="px-6 py-5 border-b border-border flex items-center justify-between bg-surface-2">
          <div>
            <h2 className="text-sm font-black text-text-primary uppercase tracking-widest">Message Propagation</h2>
            <p className="text-[10px] font-bold text-text-muted uppercase tracking-[0.2em] mt-1">Select Transit Destination</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-3 rounded-lg text-text-muted hover:text-text-primary transition-all"><X size={18} /></button>
        </div>

        <div className="p-4 bg-surface-0 border-b border-border">
          <div className="relative group">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent transition-colors" />
            <input 
              type="text" 
              placeholder="SEARCH WORKSPACES OR DIRECT CHANNELS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-2 border border-border rounded-lg py-2.5 pl-10 pr-4 text-[11px] font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-all shadow-inner uppercase tracking-wider"
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-[300px]">
          {filtered.map((dest) => {
            const isSelected = selectedIds.includes(dest.id);
            const isSent = sentIds.includes(dest.id);
            return (
              <button
                key={dest.id}
                onClick={() => toggleSelect(dest.id)}
                disabled={isSent}
                className={cn(
                  "w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left group relative",
                  isSent ? "bg-success/5 border-success/20 opacity-60" :
                  isSelected ? "bg-accent/10 border-accent/40" : "bg-surface-1 border-transparent hover:bg-surface-2 hover:border-border/60"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded bg-surface-2 border border-border flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-accent/20 border-accent/40 text-accent" : "text-text-muted group-hover:text-text-secondary"
                )}>
                  {dest.type === 'channel' ? <Hash size={20} /> : <MessageSquare size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px] font-bold truncate", isSelected ? "text-text-primary" : "text-text-secondary")}>{dest.name}</p>
                  <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.15em]">{dest.serverName}</p>
                </div>
                <div className={cn(
                  "w-5 h-5 rounded border flex items-center justify-center transition-all",
                  isSent ? "bg-success border-success text-white" :
                  isSelected ? "bg-accent border-accent text-white" : "border-border group-hover:border-text-muted"
                )}>
                  {isSent ? <Check size={12} /> : isSelected && <Check size={12} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="p-4 bg-surface-2 border-t border-border flex items-center justify-between gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest">Selected Entities</span>
            <span className="text-sm font-bold text-text-primary">{selectedIds.length} Destinations</span>
          </div>
          <Button 
            variant="primary" 
            className="px-8 h-10 text-[11px] font-black uppercase tracking-[0.2em] rounded-lg shadow-xl"
            disabled={selectedIds.length === 0 || isSending}
            onClick={handleForward}
            icon={isSending ? null : <Send size={14} />}
          >
            {isSending ? 'PROPAGATING...' : 'INITIATE TRANSFER'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
