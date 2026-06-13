import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Pin, MessageSquare, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatTime, formatDate } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

interface PinnedMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelId: string;
}

export function PinnedMessagesModal({ isOpen, onClose, channelId }: PinnedMessagesModalProps) {
  const { messages, users, togglePinMessage, setActiveChannel } = useAppStore();
  
  const pinnedMessages = messages.filter(m => m.channelId === channelId && m.pinned);

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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md bg-surface-1 rounded border border-border shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border bg-surface-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Pin size={16} className="text-accent" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-text-primary tracking-tight">Pinned Messages</h2>
                  <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{pinnedMessages.length} Pinned</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-surface-3 rounded text-text-muted hover:text-text-primary transition-all">
                <X size={20} />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {pinnedMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-2 flex items-center justify-center mb-4 border border-border/50 opacity-50">
                    <Pin size={32} className="text-text-muted" />
                  </div>
                  <h3 className="text-sm font-bold text-text-secondary mb-1">No Pinned Messages</h3>
                  <p className="text-xs text-text-tertiary max-w-[200px]">Pin messages in this channel to keep them easy to find.</p>
                </div>
              ) : (
                pinnedMessages.map(msg => {
                  const user = users[msg.userId];
                  return (
                    <div key={msg.id} className="group relative bg-surface-2 border border-border rounded p-3 hover:border-accent/30 transition-all">
                      <div className="flex gap-3">
                        <Avatar src={user?.avatarUrl} alt={user?.username} size="sm" showStatus={false} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[13px] font-bold text-text-primary truncate">{user?.username}</span>
                            <span className="text-[10px] text-text-muted">{formatTime(msg.timestamp)}</span>
                          </div>
                          <p className="text-[13px] text-text-secondary line-clamp-3 leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                          
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mt-2 flex items-center gap-2 text-[10px] text-accent font-bold uppercase tracking-widest bg-accent/5 px-2 py-1 rounded border border-accent/10 w-fit">
                              <MessageSquare size={10} />
                              {msg.attachments.length} {msg.attachments.length === 1 ? 'Attachment' : 'Attachments'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Overlay */}
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => togglePinMessage(msg.id)}
                          className="p-1.5 rounded bg-surface-3 border border-border text-text-muted hover:text-danger hover:border-danger/30 transition-all shadow-sm"
                          title="Unpin"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            // Close modal and focus message (simulation)
                            onClose();
                          }}
                          className="p-1.5 rounded bg-surface-3 border border-border text-text-muted hover:text-accent hover:border-accent/30 transition-all shadow-sm"
                          title="Jump to Message"
                        >
                          <ExternalLink size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-surface-2/50 border-t border-border">
              <p className="text-[10px] text-text-muted text-center font-medium opacity-60">All members can see pinned messages in this channel.</p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
