import React, { useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, Hash, Reply, Pin, Smile, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { renderRichText } from '../../lib/commands';

interface ThreadViewProps {
  parentMessageId: string;
  onClose: () => void;
}

export function ThreadView({ parentMessageId, onClose }: ThreadViewProps) {
  const { messages, users, addMessage, activeChannelId } = useAppStore();
  const parentMessage = messages.find(m => m.id === parentMessageId);
  const replies = messages.filter(m => m.replyToId === parentMessageId);
  const [inputValue, setInputValue] = React.useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [replies.length]);

  if (!parentMessage) return null;
  const parentUser = users[parentMessage.userId];

  const handleSendReply = () => {
    if (!inputValue.trim()) return;
    addMessage(inputValue, activeChannelId!, undefined, parentMessageId);
    setInputValue('');
  };

  return (
    <div className="w-[450px] border-l border-border bg-surface-1 flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-12 px-4 border-b border-border flex items-center justify-between bg-surface-2/50">
        <div className="flex items-center gap-2">
          <MessageSquare size={16} className="text-text-tertiary" />
          <h3 className="text-sm font-bold text-white tracking-tight">Thread</h3>
          <div className="w-1 h-1 rounded-full bg-text-muted mx-1" />
          <span className="text-xs text-text-muted truncate max-w-[150px]">#{parentMessage.content.slice(0, 20)}...</span>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-text-primary transition-all">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar" ref={scrollRef}>
        {/* Parent Message Section */}
        <div className="p-4 bg-surface-2/30 border-b border-border/50">
          <div className="flex gap-4">
            <Avatar src={parentUser?.avatarUrl} alt={parentUser?.username} size="md" />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-bold text-white">{parentUser?.username}</span>
                <span className="text-[10px] text-text-muted uppercase tracking-widest">{new Date(parentMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-[14px] text-text-secondary leading-relaxed wrap-break-word">{renderRichText(parentMessage.content)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4 mt-4 select-none">
            <div className="flex-1 h-px bg-border/60" />
            <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.25em]">{replies.length} {replies.length === 1 ? 'Reply' : 'Replies'}</span>
            <div className="flex-1 h-px bg-border/60" />
          </div>
        </div>

        {/* Replies List */}
        <div className="p-4 space-y-6">
          {replies.map((reply) => {
            const replyUser = users[reply.userId];
            return (
              <div key={reply.id} className="flex gap-3 group/reply">
                <Avatar src={replyUser?.avatarUrl} alt={replyUser?.username} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className="text-[13px] font-bold text-text-primary">{replyUser?.username}</span>
                    <span className="text-[10px] text-text-muted">{new Date(reply.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-[13.5px] text-text-secondary leading-normal wrap-break-word">{renderRichText(reply.content)}</p>
                </div>
              </div>
            );
          })}
          {replies.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
              <div className="w-16 h-16 rounded-full bg-surface-3 flex items-center justify-center mb-4">
                <MessageSquare size={32} className="text-text-muted" />
              </div>
              <p className="text-sm font-bold text-text-muted uppercase tracking-widest">No replies yet</p>
              <p className="text-xs text-text-muted mt-2">Be the first to reply to this thread.</p>
            </div>
          )}
        </div>
      </div>

      {/* Input Section */}
      <div className="p-4 bg-surface-0 border-t border-border">
        <div className="bg-surface-2 border border-border rounded-xl focus-within:border-accent/40 transition-all p-2 flex flex-col gap-2">
          <textarea 
            rows={2}
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendReply();
              }
            }}
            placeholder={`Reply to ${parentUser?.username}...`}
            className="w-full bg-transparent border-none text-sm text-text-primary placeholder:text-text-muted focus:outline-none resize-none px-2 py-1"
          />
          <div className="flex items-center justify-between border-t border-border/40 pt-2 px-1">
            <div className="flex items-center gap-1 text-text-muted">
              <button className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors"><Smile size={16} /></button>
              <button className="p-1.5 hover:bg-surface-3 rounded-lg transition-colors text-[10px] font-bold">GIF</button>
            </div>
            <button 
              onClick={handleSendReply}
              disabled={!inputValue.trim()}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-[11px] font-bold uppercase tracking-widest hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Reply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
