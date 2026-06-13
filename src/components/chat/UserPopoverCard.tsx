import React, { useState, useRef, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { cn } from '../../lib/utils';
import { MessageSquare, Phone, MapPin, Calendar, Plus, X, MoreHorizontal, Hash, Play, Volume2, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { UserProfileModal } from './UserProfileModal';

interface UserPopoverCardProps {
  userId: string;
  children: React.ReactNode;
  className?: string;
  key?: any;
}

export function UserPopoverCard({ userId, children, className }: UserPopoverCardProps) {
  const instanceId = useId();
  const [position, setPosition] = useState<{ x: number; y?: number; bottom?: number }>({ x: 0, y: 0 });
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [msgInput, setMsgInput] = useState('');
  const [addRoleMenuOpen, setAddRoleMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const { 
    users, 
    servers, 
    activeServerId, 
    setActiveDm, 
    activePopoverId, 
    setActivePopoverId, 
    addMessage,
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
    currentUser,
    getPermissions,
    updateMemberRole,
    presences,
    channels,
    voiceConnections,
    setSettingsOpen
  } = useAppStore();
  
  const user = users[userId];
  const activeServer = servers.find(s => s.id === activeServerId);
  const isOpen = activePopoverId === instanceId;

  const userPerms = getPermissions(activeServerId || '', currentUser?.id || '');
  const isAdmin = userPerms.includes('ADMIN');
  const canManageRoles = userPerms.includes('MANAGE_ROLES') || isAdmin;

  const canEditMemberRoles = 
    activeServer && currentUser && 
    (currentUser.id === activeServer.ownerId || 
     (canManageRoles && userId !== activeServer.ownerId));
  
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setActivePopoverId(null);
      return;
    }
    
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const cardWidth = 300; 
    const cardHeight = 440; 
    const margin = 16;
    
    let x = rect.right + 8; // Default: Right side of trigger
    let y: number | undefined = rect.top - 20;
    let bottom: number | undefined = undefined;

    // 1. App Sidebar (Left Menu): If the trigger is in the Left Sidebar (rect.left < 272)
    if (rect.left < 272) {
      x = rect.left;
      y = undefined;
      bottom = window.innerHeight - rect.top + 8;
    }
    // 2. Right Sidebar: If the trigger is in the Right Sidebar (rect.right > window.innerWidth - 280)
    else if (rect.right > window.innerWidth - 280) {
      x = rect.left - cardWidth - 8;
      y = rect.top - 20;
    }
    // 3. General Chat / Middle: Right of trigger (already default)

    // Viewport safety clamping
    if (x + cardWidth > window.innerWidth - margin) {
      x = window.innerWidth - cardWidth - margin;
    }
    if (x < margin) {
      x = margin;
    }

    if (y !== undefined) {
      if (y + cardHeight > window.innerHeight - margin) {
        y = window.innerHeight - cardHeight - margin;
      }
      if (y < margin) {
        y = margin;
      }
    }
    
    setPosition({ x, y, bottom });
    setActivePopoverId(instanceId);
  };

  useEffect(() => {
    const handleOutsideClick = () => setActivePopoverId(null);
    if (isOpen) document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isOpen, setActivePopoverId]);

  if (!user) return <>{children}</>;

  const userRoles = activeServer?.memberRoles?.[userId] || [];
  const serverRoles = activeServer?.roles || [];

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!msgInput.trim()) return;
    const myId = currentUser?.id || 'u1';
    addMessage(msgInput, `dm-[${myId}]-${userId}`);
    setMsgInput('');
    setActivePopoverId(null);
    setActiveDm(userId);
  };

  return (
    <div ref={triggerRef} className={cn("relative inline-block", className)} onClick={handleClick}>
      {children}
      
      <UserProfileModal 
        userId={userId} 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />

      {isOpen && createPortal(
        <div key={instanceId} className="contents">
          <div key={`${instanceId}-overlay`} className="fixed inset-0 z-9998" onClick={() => setActivePopoverId(null)} />
          <div
            key={`${instanceId}-popover`}
            className="fixed z-9999 w-[300px] bg-surface-1 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] border border-border transition-all"
            style={{ 
              left: position.x, 
              top: position.y !== undefined ? position.y : undefined,
              bottom: position.bottom !== undefined ? position.bottom : undefined,
              background: user.themeColor 
                ? `linear-gradient(to bottom, ${user.themeColor}18 0%, var(--color-surface-1) 120px, var(--color-surface-1) 100%)` 
                : undefined
            }}
            onClick={(e) => e.stopPropagation()}
          >
              {/* Banner */}
              <div 
                className={cn(
                  "h-24 bg-surface-3 relative rounded-t-xl overflow-hidden group",
                  currentUser && user.id === currentUser.id && "cursor-pointer"
                )}
                style={{ backgroundColor: user.themeColor || undefined }}
                onClick={(e) => {
                  if (currentUser && user.id === currentUser.id) {
                    e.stopPropagation();
                    setActivePopoverId(null);
                    setSettingsOpen(true);
                  }
                }}
              >
                {user.bannerUrl ? (
                  <img src={user.bannerUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  !user.themeColor && <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/10" />
                )}
                {currentUser && user.id === currentUser.id && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase tracking-wider">
                    Change Banner
                  </div>
                )}
              </div>

              {/* Body */}
              <div className="px-4 pb-4 bg-surface-1/0">
                <div className="flex items-end justify-between -mt-10 mb-3 relative z-10">
                  <div className="p-1 bg-surface-1 rounded-xl shrink-0 relative overflow-hidden group">
                    <Avatar 
                      src={user.avatarUrl} 
                      alt={user.username} 
                      size="lg" 
                      showStatus={false}
                      className="rounded-xl w-20 h-20 cursor-pointer shadow-md"
                      onClick={() => {
                        if (currentUser && user.id === currentUser.id) {
                          setActivePopoverId(null);
                          setSettingsOpen(true);
                        } else {
                          setIsProfileModalOpen(true);
                          setActivePopoverId(null);
                        }
                      }}
                    />
                    {currentUser && user.id === currentUser.id && (
                      <div 
                        className="absolute inset-1 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-bold uppercase tracking-wider text-center leading-tight cursor-pointer rounded-xl pointer-events-none"
                      >
                        Change<br/>PFP
                      </div>
                    )}
                  </div>
                  {currentUser && userId === currentUser.id ? (
                    <div className="flex gap-1.5 self-end pb-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopoverId(null);
                          setSettingsOpen(true);
                        }}
                        className="px-3 py-1.5 rounded bg-accent hover:bg-accent/80 text-white text-[11px] font-black uppercase tracking-wider transition-all"
                      >
                        Edit Profile
                      </button>
                    </div>
                  ) : currentUser && userId !== currentUser.id && (
                    <div className="flex gap-1.5 self-end pb-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePopoverId(null);
                          setActiveDm(userId);
                        }}
                        className="p-2 rounded bg-surface-3 hover:bg-surface-4 text-text-secondary hover:text-white transition-all flex items-center justify-center shrink-0"
                        title="Send Direct Message"
                      >
                        <MessageSquare size={14} />
                      </button>

                      {blockedUsers.includes(userId) ? (
                        <button
                          onClick={() => unblockUser(userId)}
                          className="px-3 py-1.5 rounded bg-danger hover:bg-danger/80 text-white text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                          Unblock
                        </button>
                      ) : (incomingRequests.includes(userId) || incomingRequests.includes(user.username)) ? (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => acceptFriendRequest(incomingRequests.includes(userId) ? userId : user.username)}
                            className="px-2.5 py-1.5 rounded bg-success hover:bg-success/80 text-white text-[11px] font-black uppercase tracking-wider transition-all"
                            title="Accept Request"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => rejectFriendRequest(incomingRequests.includes(userId) ? userId : user.username)}
                            className="px-2.5 py-1.5 rounded bg-surface-3 hover:bg-surface-4 text-text-secondary text-[11px] font-black uppercase tracking-wider transition-all"
                            title="Ignore Request"
                          >
                            Ignore
                          </button>
                        </div>
                      ) : (pendingFriends.includes(userId) || pendingFriends.includes(user.username)) ? (
                        <button
                          onClick={() => cancelFriendRequest(pendingFriends.includes(userId) ? userId : user.username)}
                          className="px-3 py-1.5 rounded bg-surface-3 hover:bg-danger hover:text-white text-text-muted text-[11px] font-black uppercase tracking-wider transition-all group/btn"
                        >
                          <span className="group-hover/btn:hidden">Sent</span>
                          <span className="hidden group-hover/btn:inline">Cancel</span>
                        </button>
                      ) : friends.includes(userId) ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => removeFriend(userId)}
                            className="px-2.5 py-1.5 rounded bg-surface-3 hover:bg-danger hover:text-white text-text-muted text-[11px] font-black uppercase tracking-wider transition-all"
                          >
                            Unfriend
                          </button>
                          <button
                            onClick={() => blockUser(userId)}
                            className="px-2 py-1.5 rounded bg-surface-3 hover:bg-danger hover:text-white text-text-muted text-[11px] font-black uppercase tracking-wider transition-all"
                            title="Block User"
                          >
                            Block
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => sendFriendRequest(user.username)}
                          className="px-3 py-1.5 rounded bg-accent hover:bg-accent/80 text-white text-[11px] font-black uppercase tracking-wider transition-all"
                        >
                          Add Friend
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-3.5">
                  {/* Identity */}
                  <div className="cursor-pointer group" onClick={() => { setIsProfileModalOpen(true); setActivePopoverId(null); }}>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-[18px] font-black text-text-primary tracking-tight leading-tight">{user.username}</h3>
                      <span className="text-[14px] font-bold text-text-muted opacity-50">#{user.tag || userId.slice(-4)}</span>
                    </div>
                    {user.customStatus && <p className="text-[13px] text-text-secondary mt-1 font-medium">{user.customStatus}</p>}
                  </div>

                  <div className="h-px bg-border/50" />

                  {/* Live Presence Block */}
                  {(() => {
                    const p = presences[userId];
                    const voiceConn = voiceConnections[userId];
                    if (!p && !voiceConn) return null;

                    // Voice
                    if (voiceConn) {
                      const vCh = channels.find(c => c.id === voiceConn.channelId);
                      return (
                        <>
                          <div className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg border border-success/20">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-[10px] font-black text-success uppercase tracking-widest">In Voice</p>
                              <p className="text-[12px] font-bold text-text-primary truncate">#{vCh?.name || 'Unknown'}</p>
                            </div>
                          </div>
                          <div className="h-px bg-border/50" />
                        </>
                      );
                    }

                    // Last seen (only if offline)
                    if (p && !p.isOnline && p.lastSeen) {
                      const diff = Math.floor((Date.now() - new Date(p.lastSeen).getTime()) / 60000);
                      const label = diff < 1 ? 'Just now' : diff < 60 ? `${diff}m ago` : diff < 1440 ? `${Math.floor(diff/60)}h ago` : `${Math.floor(diff/1440)}d ago`;
                      return (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-text-muted inline-block" />
                            <p className="text-[11px] text-text-muted font-medium">Last seen {label}</p>
                          </div>
                          <div className="h-px bg-border/50" />
                        </>
                      );
                    }
                    return null;
                  })()}

                  {/* Activity */}
                  {user.activity && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-text-muted uppercase tracking-widest">Active Status</p>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-surface-2 border border-border flex items-center justify-center shrink-0">
                          {user.activity.type === 'coding' && <Hash size={24} className="text-accent" />}
                          {user.activity.type === 'playing' && <Play size={24} className="text-success" />}
                          {user.activity.type === 'listening' && <Volume2 size={24} className="text-warning" />}
                          {user.activity.type === 'watching' && <Play size={24} className="text-danger" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold text-text-primary leading-tight truncate">{user.activity.name}</p>
                          <p className="text-[12px] text-text-secondary truncate mt-0.5 capitalize">{user.activity.type}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* About Me */}
                  {user.bio && (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-black text-text-muted uppercase tracking-widest">About Me</p>
                      <p className="text-[13px] text-text-secondary leading-normal whitespace-pre-wrap">{user.bio}</p>
                    </div>
                  )}

                  {/* Roles */}
                  {activeServer && (
                    <div className="space-y-2">
                      <p className="text-[11px] font-black text-text-muted uppercase tracking-widest">Roles</p>
                      <div className="flex flex-wrap gap-1.5 items-center">
                        {userRoles.map((rId, idx) => {
                          const role = serverRoles.find(r => r.id === rId);
                          if (!role) return null;
                          return (
                            <div key={idx} className="flex items-center gap-1.5 px-2 py-1 bg-surface-2 rounded-md border border-border/40 max-w-full">
                              <div className="w-3 h-3 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: role.color }} />
                              <span className="text-[11px] font-bold text-text-secondary truncate">{role.name}</span>
                              {canEditMemberRoles && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateMemberRole(activeServer.id, userId, userRoles.filter(id => id !== rId));
                                  }}
                                  className="hover:bg-white/10 rounded p-0.5 ml-0.5 transition-colors text-text-muted hover:text-white"
                                >
                                  <X size={10} />
                                </button>
                              )}
                            </div>
                          );
                        })}

                        {/* Add Role Button */}
                        {canEditMemberRoles && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAddRoleMenuOpen(!addRoleMenuOpen);
                              }}
                              className="flex items-center justify-center w-5 h-5 rounded bg-surface-2 hover:bg-surface-3 text-text-muted hover:text-white transition-colors border border-border"
                              title="Add Role"
                            >
                              <Plus size={12} />
                            </button>

                            {addRoleMenuOpen && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setAddRoleMenuOpen(false); }} />
                                <div className="absolute left-0 top-6 z-50 w-44 bg-surface-3 border border-border rounded-lg shadow-xl py-1">
                                  <div className="px-2 py-1 text-[9px] font-bold text-text-muted uppercase tracking-wider border-b border-border/50 mb-1">
                                    Assign Role
                                  </div>
                                  <div className="max-h-36 overflow-y-auto custom-scrollbar">
                                    {serverRoles
                                      .filter(r => !userRoles.includes(r.id))
                                      .map(role => (
                                        <button
                                          key={role.id}
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            updateMemberRole(activeServer.id, userId, [...userRoles, role.id]);
                                            setAddRoleMenuOpen(false);
                                          }}
                                          className="w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-text-secondary hover:bg-surface-4 hover:text-white transition-colors text-left"
                                        >
                                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: role.color }} />
                                          <span className="font-semibold truncate">{role.name}</span>
                                        </button>
                                      ))}
                                    {serverRoles.filter(r => !userRoles.includes(r.id)).length === 0 && (
                                      <div className="px-2.5 py-1.5 text-[11px] text-text-muted italic text-center">
                                        No roles to add
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="pt-2">
                    <input 
                      type="text" 
                      placeholder={`Message @${user.username}`}
                      value={msgInput}
                      onChange={(e) => setMsgInput(e.target.value)}
                      className="w-full bg-surface-2 border border-border rounded-lg py-2 px-3 text-[13px] font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-all"
                    />
                  </form>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
