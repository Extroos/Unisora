import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Pencil, Hash, MessageSquare, Send, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

export function DraftsView() {
  const { 
    drafts, channels, users, servers, setDraft, setActiveChannel, setActiveDm, 
    pendingFriends, incomingRequests, cancelFriendRequest, acceptFriendRequest, rejectFriendRequest 
  } = useAppStore();
  const [activeView, setActiveView] = React.useState<'drafts' | 'pending'>('drafts');

  const draftItems = Object.entries(drafts)
    .filter(([_, content]) => content.trim().length > 0)
    .map(([id, content]) => {
      const channel = channels.find(c => c.id === id);
      const user = users[id.replace('dm-[u1]-', '')];
      const server = channel ? servers.find(s => s.id === channel.serverId) : null;
      
      return {
        id,
        content,
        name: channel ? channel.name : (user ? user.username : 'Unknown'),
        type: channel ? 'channel' : 'dm',
        serverName: server ? server.name : 'Direct Message',
        targetId: id
      };
    });

  const totalPending = pendingFriends.length + incomingRequests.length;
  const totalDrafts = draftItems.length;

  return (
    <div className="flex-1 flex flex-col bg-surface-0 overflow-hidden">
      {/* Professional Header */}
      <header className="h-14 border-b border-border flex items-center px-6 bg-surface-1 shrink-0 justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Pencil size={18} className="text-text-muted" />
            <h1 className="text-sm font-bold text-text-primary tracking-tight">Drafts & Pending</h1>
          </div>
          
          <div className="h-6 w-px bg-border mx-2" />
          
          <nav className="flex items-center gap-1">
            <button 
              onClick={() => setActiveView('drafts')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all relative",
                activeView === 'drafts' ? "text-text-primary bg-surface-3" : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
              )}
            >
              Drafts
              {totalDrafts > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-accent text-white text-[9px] font-black">{totalDrafts}</span>
              )}
            </button>
            <button 
              onClick={() => setActiveView('pending')}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-bold transition-all",
                activeView === 'pending' ? "text-text-primary bg-surface-3" : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
              )}
            >
              Pending Requests
              {totalPending > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-danger text-white text-[9px] font-black">{totalPending}</span>
              )}
            </button>
          </nav>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar bg-surface-0">
        <AnimatePresence mode="wait">
          {activeView === 'drafts' ? (
            <motion.div
              key="drafts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 max-w-4xl mx-auto w-full"
            >
              {draftItems.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-1 flex items-center justify-center mb-4 border border-border">
                    <Pencil size={24} className="text-text-muted opacity-30" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">No drafts found</h3>
                  <p className="text-xs text-text-muted max-w-xs">Your unsent messages across all channels and direct messages will appear here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {draftItems.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      className="group bg-surface-1 border border-border rounded-lg overflow-hidden hover:bg-surface-2/50 transition-all"
                    >
                      <div className="p-4 flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0">
                          {item.type === 'channel' ? <Hash size={18} className="text-text-muted" /> : <MessageSquare size={18} className="text-text-muted" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{item.serverName}</span>
                            <span className="text-text-muted opacity-30">•</span>
                            <span className="text-[11px] font-bold text-text-primary">{item.name}</span>
                          </div>
                          <div className="bg-surface-0/50 border border-border/40 rounded p-3 mb-3">
                            <p className="text-[13px] text-text-secondary leading-relaxed font-medium line-clamp-3 italic">
                              "{item.content}"
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <Button 
                              variant="primary" 
                              size="sm" 
                              className="h-8 px-4 text-[11px] font-bold rounded"
                              onClick={() => {
                                if (item.type === 'channel') setActiveChannel(item.id);
                                else setActiveDm(item.id.replace('dm-[u1]-', ''));
                              }}
                            >
                              Go to Channel
                            </Button>
                            <button 
                              onClick={() => setDraft(item.id, '')}
                              className="text-[11px] font-bold text-text-muted hover:text-danger px-2 py-1 rounded transition-colors"
                            >
                              Discard
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-6 max-w-4xl mx-auto w-full"
            >
              {incomingRequests.length === 0 && pendingFriends.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-full bg-surface-1 flex items-center justify-center mb-4 border border-border">
                    <Send size={24} className="text-text-muted opacity-30" />
                  </div>
                  <h3 className="text-sm font-bold text-text-primary mb-1">No pending requests</h3>
                  <p className="text-xs text-text-muted max-w-xs">Incoming and outgoing friend requests will be displayed here for management.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Incoming Requests */}
                  {incomingRequests.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-3">Incoming ({incomingRequests.length})</h4>
                      <div className="space-y-2">
                        {incomingRequests.map((userId, idx) => {
                          const user = Object.values(users).find(u => u.id === userId || u.username === userId);
                          const displayName = user ? `${user.username}#${user.tag || user.id.slice(-4)}` : (userId.startsWith('u_') ? `Unknown User#${userId.slice(-4)}` : userId);
                          return (
                            <div key={`inc-${idx}`} className="flex items-center justify-between p-3 bg-surface-1 border border-border rounded-lg hover:bg-surface-2 transition-all group">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-success/15 flex items-center justify-center border border-success/30 font-bold text-success text-sm">
                                  {displayName[0].toUpperCase()}
                                </div>
                                <div>
                                  <p className="text-sm font-bold text-text-primary">{displayName}</p>
                                  <p className="text-[10px] text-success font-bold uppercase tracking-widest">Incoming Request</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => acceptFriendRequest(userId)}
                                  className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center text-success hover:bg-success hover:text-white transition-all"
                                  title="Accept"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={() => rejectFriendRequest(userId)}
                                  className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                                  title="Decline"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Outgoing Requests */}
                  {pendingFriends.length > 0 && (
                    <div>
                      <h4 className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-3">Outgoing ({pendingFriends.length})</h4>
                      <div className="space-y-2">
                        {pendingFriends.map((username, idx) => (
                          <div key={`out-${idx}`} className="flex items-center justify-between p-3 bg-surface-1 border border-border rounded-lg hover:bg-surface-2 transition-all group">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-surface-2 flex items-center justify-center border border-border font-bold text-text-secondary text-sm">
                                {username[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-text-primary">{username}</p>
                                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">Outgoing Request</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => cancelFriendRequest(username)}
                                className="w-8 h-8 rounded flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                                title="Cancel Request"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
