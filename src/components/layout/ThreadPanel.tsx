import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Reply, Send, Hash, MessageSquare, Smile, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatTime } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Message } from '../../types';
import { renderRichText } from '../../lib/commands';

export function ThreadPanel() {
  const { messages, users, activeThreadId, setActiveThread, addMessage } = useAppStore();
  const [reply, setReply] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const parentMessage = messages.find(m => m.id === activeThreadId) || null;
  const isVisible = !!activeThreadId;

  const parentUser = parentMessage ? users[parentMessage.userId] : null;
  const threadReplies = parentMessage ? messages.filter(m => m.replyToId === parentMessage.id) : [];

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!reply.trim() || !parentMessage) return;
    addMessage(reply.trim(), parentMessage.channelId, undefined, parentMessage.id);
    setReply('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  return (
    <AnimatePresence>
      {isVisible && parentMessage && (
        <motion.div
          initial={{ x: 450, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 450, opacity: 0 }}
          transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          className="w-[450px] h-full border-l border-border bg-surface-1 flex flex-col shrink-0 z-50 shadow-[-10px_0_30px_rgba(0,0,0,0.3)]"
        >
          {/* Header - High Density */}
          <div className="h-12 flex items-center justify-between px-4 border-b border-border bg-surface-2/50 shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-accent" />
              <h3 className="text-sm font-bold text-white tracking-tight">Thread</h3>
              <div className="w-1 h-1 rounded-full bg-text-muted mx-1" />
              <span className="text-xs text-text-muted truncate max-w-[150px]">#{parentMessage.content.slice(0, 20)}...</span>
            </div>
            <button onClick={() => setActiveThread(null)} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all">
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Parent Message Anchor */}
            <div className="p-4 bg-surface-2/30 border-b border-border/50">
              <div className="flex gap-4">
                <Avatar src={parentUser?.avatarUrl} alt={parentUser?.username} size="md" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-sm font-bold text-white">{parentUser?.username}</span>
                    <span className="text-[10px] text-text-muted uppercase tracking-widest">{formatTime(parentMessage.timestamp)}</span>
                  </div>
                  <p className="text-[14px] text-text-secondary leading-relaxed wrap-break-word">{renderRichText(parentMessage.content)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 mt-6 select-none">
                <div className="flex-1 h-px bg-border/60" />
                <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">{threadReplies.length} {threadReplies.length === 1 ? 'Reply' : 'Replies'}</span>
                <div className="flex-1 h-px bg-border/60" />
              </div>
            </div>

            {/* Thread Conversations */}
            <div className="p-4 space-y-6">
              {threadReplies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                  <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4 border border-border">
                    <Reply size={32} className="text-text-muted" />
                  </div>
                  <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No replies yet</p>
                  <p className="text-xs text-text-muted mt-2">Be the first to reply to this thread.</p>
                </div>
              ) : (
                threadReplies.map(msg => {
                  const u = users[msg.userId];
                  return (
                    <div key={msg.id} className="flex gap-3 group/reply animate-in fade-in slide-in-from-bottom-2 duration-200">
                      <Avatar src={u?.avatarUrl} alt={u?.username} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-[13px] font-bold text-text-primary">{u?.username}</span>
                          <span className="text-[10px] text-text-muted">{formatTime(msg.timestamp)}</span>
                        </div>
                        <p className="text-[13.5px] text-text-secondary leading-normal wrap-break-word">{renderRichText(msg.content)}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={endRef} />
            </div>
          </div>

          {/* High Fidelity Input */}
          <div className="p-4 bg-surface-0 border-t border-border shrink-0">
            <div className="bg-surface-2 border border-border rounded-xl focus-within:border-accent/40 transition-all p-2 flex flex-col gap-2">
              <textarea 
                rows={2}
                value={reply}
                onChange={e => setReply(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={`Reply to ${parentUser?.username}...`}
                className="w-full bg-transparent border-none text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none px-2 py-1"
              />
              <div className="flex items-center justify-between border-t border-border/40 pt-2 px-1">
                <div className="flex items-center gap-1 text-text-muted">
                  <button type="button" className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors"><Smile size={16} /></button>
                  <button type="button" className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors text-[10px] font-bold">GIF</button>
                  <button type="button" className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors"><Plus size={16} /></button>
                </div>
                <button 
                  onClick={handleSend}
                  disabled={!reply.trim()}
                  className="px-4 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold uppercase tracking-widest hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-accent/20"
                >
                  Reply
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
