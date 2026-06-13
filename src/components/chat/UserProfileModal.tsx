import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { X, MessageSquare, Phone, MapPin, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';

interface UserProfileModalProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfileModal({ userId, isOpen, onClose }: UserProfileModalProps) {
  const { 
    users, 
    servers, 
    setActiveDm, 
    startCall, 
    friends,
    pendingFriends,
    incomingRequests,
    blockedUsers,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    blockUser,
    unblockUser,
    currentUser
  } = useAppStore();
  const [activeTab, setActiveTab] = useState<'overview' | 'servers'>('overview');
  const user = users[userId];

  if (!user) return null;

  const userMutualServers = servers.filter(s => s.members.includes(userId));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" 
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md bg-surface-1 rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Banner */}
            <div 
              className="h-28 bg-surface-3 shrink-0 relative"
              style={{ backgroundColor: user.themeColor || undefined }}
            >
              {user.bannerUrl && (
                <img src={user.bannerUrl} alt="" className="w-full h-full object-cover" />
              )}
              <button 
                onClick={onClose} 
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/40 text-white/70 hover:text-white transition-all z-20"
              >
                <X size={16} />
              </button>
            </div>

            {/* Profile Header Section */}
            <div className="px-6 pb-4 relative border-b border-border/60">
              {/* Avatar overlapping banner */}
              <div className="absolute -top-10 left-6 p-1 bg-surface-1 rounded-2xl">
                <Avatar 
                  src={user.avatarUrl} 
                  alt={user.username} 
                  size="lg" 
                  showStatus={true}
                  status={user.status}
                  className="rounded-xl w-16 h-16 shadow-md" 
                />
              </div>
              
              {/* Actions at top right */}
              <div className="flex justify-end gap-2 pt-3 h-12 items-center">
                {userId !== currentUser?.id && (
                  <div className="flex gap-2">
                    {blockedUsers.includes(userId) ? (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="text-xs px-3 rounded-xl bg-danger/10 hover:bg-danger text-danger hover:text-white border-none transition-all font-semibold"
                        onClick={() => unblockUser(userId)}
                      >
                        Unblock
                      </Button>
                    ) : (incomingRequests.includes(userId) || incomingRequests.includes(user.username)) ? (
                      <>
                        <Button 
                          variant="primary" 
                          size="sm"
                          className="text-xs px-3 rounded-xl font-semibold"
                          onClick={() => acceptFriendRequest(incomingRequests.includes(userId) ? userId : user.username)}
                        >
                          Accept
                        </Button>
                        <Button 
                          variant="secondary" 
                          size="sm"
                          className="text-xs px-3 rounded-xl bg-surface-2 hover:bg-surface-3 text-text-secondary border border-border font-semibold"
                          onClick={() => rejectFriendRequest(incomingRequests.includes(userId) ? userId : user.username)}
                        >
                          Ignore
                        </Button>
                      </>
                    ) : (pendingFriends.includes(userId) || pendingFriends.includes(user.username)) ? (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="text-xs px-3 rounded-xl bg-surface-2 hover:bg-danger/10 hover:text-danger border border-border text-text-muted transition-all font-semibold"
                        onClick={() => cancelFriendRequest(pendingFriends.includes(userId) ? userId : user.username)}
                      >
                        Cancel Request
                      </Button>
                    ) : friends.includes(userId) ? (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        className="text-xs px-3 rounded-xl bg-surface-2 hover:bg-danger/10 hover:text-danger border border-border text-text-muted transition-all font-semibold"
                        onClick={() => removeFriend(userId)}
                      >
                        Unfriend
                      </Button>
                    ) : (
                      <Button 
                        variant="primary" 
                        size="sm"
                        className="text-xs px-3 rounded-xl font-semibold"
                        onClick={() => sendFriendRequest(user.username)}
                      >
                        Add Friend
                      </Button>
                    )}
                  </div>
                )}
                {userId !== currentUser?.id && (
                  <Button 
                    variant="secondary" 
                    size="sm"
                    className="text-xs px-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-border font-semibold flex items-center gap-1"
                    onClick={() => { setActiveDm(userId); onClose(); }}
                  >
                    <MessageSquare size={13} />
                    Message
                  </Button>
                )}
              </div>

              {/* Name and Tag */}
              <div className="mt-3">
                <div className="flex items-baseline gap-1">
                  <h2 className="text-xl font-bold text-text-primary tracking-tight leading-none">
                    {user.username}
                  </h2>
                  <span className="text-sm font-semibold text-text-muted">#{user.tag || userId.slice(-4)}</span>
                </div>
                {user.customStatus ? (
                  <p className="text-xs text-text-secondary mt-1.5 italic">“{user.customStatus}”</p>
                ) : (
                  <p className="text-xs text-text-muted mt-1 uppercase tracking-wider text-[10px] font-bold">{user.status || 'Offline'}</p>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-border/60 bg-surface-2/45 px-4 shrink-0">
              <button
                onClick={() => setActiveTab('overview')}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold border-b-2 transition-all",
                  activeTab === 'overview'
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('servers')}
                className={cn(
                  "px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5",
                  activeTab === 'servers'
                    ? "border-accent text-accent"
                    : "border-transparent text-text-muted hover:text-text-secondary"
                )}
              >
                Mutual Spaces
                {userMutualServers.length > 0 && (
                  <span className="bg-surface-3 text-text-secondary px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                    {userMutualServers.length}
                  </span>
                )}
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar min-h-0 max-h-[260px] bg-surface-1">
              {activeTab === 'overview' ? (
                <div className="space-y-4">
                  {/* Bio */}
                  <div>
                    <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">About Me</h3>
                    <p className="text-xs text-text-secondary leading-relaxed bg-surface-2/40 p-3 rounded-xl border border-border/40">
                      {user.bio || 'No bio provided.'}
                    </p>
                  </div>

                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="flex items-center gap-2 text-xs text-text-secondary">
                      <Calendar size={13} className="text-text-muted" />
                      <span>Joined {user.joinedAt || 'Oct 14, 2023'}</span>
                    </div>
                    {user.location && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary">
                        <MapPin size={13} className="text-text-muted" />
                        <span>{user.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {userMutualServers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-text-muted">
                      <Users size={20} className="mb-2 opacity-50" />
                      <p className="text-xs">No mutual spaces.</p>
                    </div>
                  ) : (
                    userMutualServers.map(s => (
                      <div 
                        key={s.id} 
                        onClick={() => { useAppStore.getState().setActiveServer(s.id); onClose(); }} 
                        className="flex items-center justify-between p-2.5 bg-surface-2/40 border border-border/60 rounded-xl hover:border-accent/40 transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-surface-3 overflow-hidden flex items-center justify-center font-bold text-xs text-text-secondary border border-border">
                            {s.iconUrl ? <img src={s.iconUrl} className="w-full h-full object-cover" /> : s.name[0]}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-text-primary">{s.name}</p>
                            <p className="text-[10px] text-text-muted">{s.members.length} members</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
