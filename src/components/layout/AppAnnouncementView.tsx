import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Megaphone, Clock, Info } from 'lucide-react';

export function AppAnnouncementView() {
  const { systemConfig } = useAppStore();
  const broadcast = systemConfig?.activeBroadcast;

  if (!broadcast) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-surface-0 text-text-muted p-8 text-center h-full">
        <Megaphone size={24} className="opacity-30 mb-2" />
        <p className="text-xs">No active announcements at this time.</p>
      </div>
    );
  }

  // Calculate remaining time
  const msLeft = new Date(broadcast.expiresAt).getTime() - Date.now();
  const hoursLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60)));

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-0 overflow-y-auto hidden-scrollbar">
      {/* Channel Header */}
      <div className="h-12 border-b border-border px-6 flex items-center justify-between shrink-0 select-none bg-surface-0/80 backdrop-blur-md sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Megaphone size={14} className="text-text-muted" />
          <span className="font-bold text-xs text-text-primary uppercase tracking-wider">app-announcements</span>
        </div>
      </div>

      {/* Main Container */}
      <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-10 flex flex-col justify-start">
        {/* Simple Info Banner */}
        <div className="mb-8 p-3 bg-surface-1 border border-border rounded-lg text-[11px] text-text-muted flex gap-2.5 items-start">
          <Info size={14} className="text-text-muted shrink-0 mt-0.5" />
          <span>
            This is a read-only channel for official system updates. Standard users cannot post messages here.
          </span>
        </div>

        {/* Message Container */}
        <div className="flex gap-4 items-start">
          <img 
            src="https://api.dicebear.com/7.x/bottts/svg?seed=UnisoraBOT" 
            alt="UnisoraBOT" 
            className="w-10 h-10 rounded-xl bg-surface-2 border border-border shrink-0 object-cover"
          />
          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-text-primary flex items-center gap-1.5 font-sans">
                UnisoraBOT
                <span className="bg-accent/15 text-accent text-[9px] font-bold px-1 rounded uppercase tracking-wider">
                  BOT
                </span>
              </span>
              <span className="text-[10px] text-text-muted">
                {new Date(broadcast.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>

            {/* Clean Message Body with left accent border */}
            <div className="border-l-2 border-accent pl-4 py-1">
              <div className="text-[13px] text-text-secondary leading-relaxed whitespace-pre-wrap font-sans select-text">
                {broadcast.content}
              </div>
            </div>

            {/* Expiration status */}
            <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-medium pt-1 select-none">
              <Clock size={11} className="text-text-muted" />
              <span>Expires in {hoursLeft} hours ({new Date(broadcast.expiresAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
