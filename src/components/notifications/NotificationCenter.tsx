import React, { useState } from 'react';
import { X, Bell, AtSign, Reply, MessageSquare, Check, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';

interface Notification {
  id: string;
  type: 'mention' | 'reply' | 'message';
  username: string;
  avatarUrl: string;
  content: string;
  channel: string;
  time: string;
  read: boolean;
}

import { useAppStore } from '../../store/useAppStore';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NotificationCenter({ isOpen, onClose }: NotificationCenterProps) {
  const { notifications, markNotificationRead, markAllNotificationsRead, removeNotification, activeChannelId, activeServerId } = useAppStore();
  const [filter, setFilter] = useState<'all' | 'unread' | 'mentions'>('all');

  const filtered = filter === 'unread' 
    ? notifications.filter(n => !n.read) 
    : filter === 'mentions' 
      ? notifications.filter(n => n.type === 'mention')
      : notifications;
  // Badge count excludes current channel and current server (those are shown as white dots)
  const unreadCount = notifications.filter(n => {
    if (n.read) return false;
    if (n.channelId && n.channelId === activeChannelId) return false;
    if (activeServerId && n.serverId === activeServerId) return false;
    return true;
  }).length;

  const getIcon = (type: string) => {
    switch (type) {
      case 'mention': return <AtSign size={12} className="text-text-secondary" />;
      case 'reply': return <Reply size={12} className="text-text-secondary" />;
      default: return <MessageSquare size={12} className="text-text-tertiary" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-90" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 16 }}
            transition={{ duration: 0.2 }}
            className="fixed right-4 top-4 bottom-4 w-[360px] z-95 glass-heavy rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-text-secondary" />
                <h2 className="text-base font-bold text-text-primary">Notifications</h2>
                {unreadCount > 0 && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center rounded-full bg-danger text-white text-[10px] font-bold px-1.5">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={markAllNotificationsRead}
                  className="text-xs font-semibold text-text-tertiary hover:text-text-primary transition-colors"
                >
                  Mark all as read
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-3 text-text-muted hover:text-text-secondary transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-border">
              <button onClick={() => setFilter('all')} className={cn("px-3 py-1 rounded-lg text-xs font-semibold transition-colors", filter === 'all' ? "bg-surface-3 text-text-primary" : "text-text-tertiary hover:bg-surface-3")}>All</button>
              <button onClick={() => setFilter('unread')} className={cn("px-3 py-1 rounded-lg text-xs font-semibold transition-colors", filter === 'unread' ? "bg-surface-3 text-text-primary" : "text-text-tertiary hover:bg-surface-3")}>Unread</button>
              <button onClick={() => setFilter('mentions')} className={cn("px-3 py-1 rounded-lg text-xs font-semibold transition-colors", filter === 'mentions' ? "bg-surface-3 text-text-primary" : "text-text-tertiary hover:bg-surface-3")}>@Mentions</button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bell size={32} className="text-text-muted mb-3" />
                  <p className="text-sm font-medium text-text-tertiary">All caught up!</p>
                  <p className="text-xs text-text-muted mt-1">No notifications to show.</p>
                </div>
              ) : (
                <div className="p-2 space-y-0.5">
                  {filtered.map(n => (
                    <div
                      key={n.id}
                      onClick={() => {
                        if (n.serverId) useAppStore.getState().setActiveServer(n.serverId);
                        if (n.channelId) useAppStore.getState().setActiveChannel(n.channelId);
                        markNotificationRead(n.id);
                        onClose();
                      }}
                      className={cn(
                        "flex gap-3 p-3 rounded-xl transition-colors cursor-pointer group relative",
                        n.read ? "hover:bg-surface-2" : "bg-surface-3/50 hover:bg-surface-3"
                      )}
                    >
                      <div className="relative shrink-0">
                        <Avatar src={n.avatarUrl} alt={n.username} size="sm" showStatus={false} />
                        <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-surface-1 flex items-center justify-center">
                          {getIcon(n.type)}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs font-semibold text-text-primary group-hover:text-accent transition-colors">{n.username}</span>
                          <span className="text-[10px] text-text-muted">in #{n.channel}</span>
                        </div>
                        <p className="text-xs text-text-tertiary line-clamp-2 leading-relaxed">{n.content}</p>
                        <span className="text-[10px] text-text-muted mt-1 block">{n.time}</span>
                      </div>
                      <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                        {!n.read && (
                          <button
                            onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                            className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface-3 flex items-center justify-center text-text-muted hover:text-success transition-colors shadow-sm"
                            title="Mark as read"
                          >
                            <Check size={14} />
                          </button>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeNotification(n.id); }}
                          className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-danger hover:text-white flex items-center justify-center text-text-muted transition-all shadow-sm"
                          title="Remove notification"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
