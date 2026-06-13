import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { 
  MessageSquare, MoreVertical, X, Check, Phone, Video, User, Send, 
  UserMinus, ShieldOff, PhoneOff, Pin, StickyNote, Pencil, LogOut, 
  Link, ChevronRight, EyeOff, UserX, Volume2, VolumeX, Hash 
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { AddFriendModal } from '../modals/AddFriendModal';
import { ContextMenu, Dropdown } from '../ui/ContextMenu';


export function FriendsList() {
  const { 
    users, friendTab, setActiveDm, setFriendTab, pendingFriends, 
    incomingRequests, friends, blockedUsers,
    acceptFriendRequest, rejectFriendRequest, cancelFriendRequest,
    removeFriend, blockUser, unblockUser, startCall, fetchFriends
  } = useAppStore();
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = React.useState(false);

  // Refresh friend list from server when component mounts
  React.useEffect(() => {
    fetchFriends();
  }, []);
  
  // Derive lists
  const friendUsers = Object.values(users).filter(u => u.id !== 'u1' && friends.includes(u.id));
  const onlineFriends = friendUsers.filter(u => u.status !== 'offline');
  const allFriends = friendUsers;
  const blockedUserList = Object.values(users).filter(u => blockedUsers.includes(u.id));
  // incomingRequests are now stored as userId strings
  const incomingUserList = incomingRequests.map(uid => ({
    userId: uid,
    user: Object.values(users).find(u => u.id === uid || u.username === uid) || null
  }));

  // pendingFriends are now stored as userId strings
  const pendingOutgoingList = pendingFriends.map(uid => ({
    userId: uid,
    user: Object.values(users).find(u => u.id === uid || u.username === uid) || null
  }));

  const displayList = friendTab === 'online' ? onlineFriends : friendTab === 'all' ? allFriends : [];
  const totalPending = pendingFriends.length + incomingRequests.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-0">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-4 shrink-0">
        <div className="flex items-center gap-2 pr-4 border-r border-border">
          <MessageSquare size={18} className="text-text-muted" />
          <span className="font-bold text-sm text-text-primary">Friends</span>
        </div>
        
        <div className="flex items-center gap-2 overflow-x-auto hidden-scrollbar">
          {(['online', 'all', 'pending', 'blocked'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFriendTab(tab)}
              className={cn(
                "px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all",
                friendTab === tab 
                  ? "bg-surface-3 text-text-primary" 
                  : "text-text-muted hover:text-text-secondary hover:bg-surface-2"
              )}
            >
              {tab}
              {tab === 'pending' && totalPending > 0 && (
                <span className="ml-1.5 bg-danger text-white px-1.5 py-0.5 rounded-full text-[10px]">
                  {totalPending}
                </span>
              )}
              {tab === 'blocked' && blockedUsers.length > 0 && (
                <span className="ml-1.5 bg-surface-4 text-text-muted px-1.5 py-0.5 rounded-full text-[10px]">
                  {blockedUsers.length}
                </span>
              )}
            </button>
          ))}
          <button 
            onClick={() => setIsAddFriendModalOpen(true)}
            className="bg-success text-white hover:bg-success/90 px-3 py-1 rounded-md text-[11px] font-bold transition-all ml-2 uppercase tracking-widest"
          >
            Add Friend
          </button>
        </div>
      </div>

      <AddFriendModal isOpen={isAddFriendModalOpen} onClose={() => setIsAddFriendModalOpen(false)} />

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <AnimatePresence mode="wait">
          {/* ── Online / All Friends ── */}
          {(friendTab === 'online' || friendTab === 'all') && (
            <motion.div
              key={friendTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-2 mb-3">
                {friendTab === 'online' ? 'Online' : 'All Friends'} — {displayList.length}
              </h3>
              {displayList.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center">
                  <User size={40} className="text-text-muted mb-4 opacity-20" />
                  <p className="text-sm font-bold text-text-muted">
                    {friendTab === 'online' ? 'No friends online right now.' : 'No friends yet. Add one!'}
                  </p>
                </div>
              ) : (
                displayList.map(user => (
                  <FriendRow
                    key={user.id}
                    user={user}
                    onMessage={() => setActiveDm(user.id)}
                    onCall={() => startCall(user.id, 'audio')}
                    onVideoCall={() => startCall(user.id, 'video')}
                    onRemove={() => removeFriend(user.id)}
                    onBlock={() => blockUser(user.id)}
                  />
                ))
              )}
            </motion.div>
          )}

          {/* ── Pending Requests ── */}
          {friendTab === 'pending' && (
            <motion.div
              key="pending"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Incoming */}
              {incomingUserList.length > 0 && (
                <div>
                  <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-success inline-block" />
                    Incoming — {incomingUserList.length}
                  </h3>
                  <div className="space-y-2">
                    {incomingUserList.map(({ userId, user }) => {
                      const displayName = user
                        ? `${user.username}#${user.tag || user.id.slice(-4)}`
                        : `Unknown User#${userId.slice(-4)}`;
                      const avatarUrl = user?.avatarUrl;
                      return (
                        <motion.div
                          key={userId}
                          layout
                          className="flex items-center justify-between group p-3 rounded-xl hover:bg-surface-1 border border-transparent hover:border-border transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {avatarUrl ? (
                              <Avatar src={avatarUrl} alt={displayName} size="sm" showStatus={false} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-text-secondary font-bold">
                                {displayName[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-text-primary">{displayName}</span>
                              <span className="text-[10px] text-success font-bold uppercase tracking-widest">Incoming Request</span>
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
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Outgoing */}
              <div>
                <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-muted mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-warning inline-block" />
                  Outgoing — {pendingOutgoingList.length}
                </h3>
                {pendingOutgoingList.length === 0 ? (
                  <div className="py-10 flex flex-col items-center justify-center text-center opacity-50">
                    <Send size={28} className="text-text-muted mb-3" />
                    <p className="text-sm font-medium text-text-tertiary">No outgoing requests.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingOutgoingList.map(({ userId, user }) => {
                      const displayName = user ? user.username : userId;
                      return (
                        <motion.div
                          key={userId}
                          layout
                          className="flex items-center justify-between group p-3 rounded-xl hover:bg-surface-1 border border-transparent hover:border-border transition-all"
                        >
                          <div className="flex items-center gap-3">
                            {user?.avatarUrl ? (
                              <Avatar src={user.avatarUrl} alt={displayName} size="sm" showStatus={false} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-surface-3 flex items-center justify-center text-text-secondary font-bold text-sm">
                                {displayName[0].toUpperCase()}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-text-primary">{displayName}</span>
                              <span className="text-[10px] text-warning font-bold uppercase tracking-widest">Outgoing Request</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => cancelFriendRequest(userId)}
                            className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-text-muted hover:text-danger hover:bg-danger/10 transition-all"
                            title="Cancel Request"
                          >
                            <X size={16} />
                          </button>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>

              {incomingRequests.length === 0 && pendingFriends.length === 0 && (
                <div className="py-16 flex flex-col items-center justify-center text-center opacity-50">
                  <Send size={32} className="text-text-muted mb-4" />
                  <p className="text-sm font-medium text-text-tertiary">No pending friend requests.</p>
                </div>
              )}
            </motion.div>
          )}

          {/* ── Blocked ── */}
          {friendTab === 'blocked' && (
            <motion.div
              key="blocked"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-1"
            >
              <h3 className="text-[10px] uppercase font-bold tracking-widest text-text-muted px-2 mb-3">
                Blocked — {blockedUsers.length}
              </h3>
              {blockedUsers.length === 0 ? (
                <div className="py-16 flex flex-col items-center justify-center text-center opacity-50">
                  <ShieldOff size={32} className="text-text-muted mb-4" />
                  <p className="text-sm font-medium text-text-tertiary">No blocked users.</p>
                  <p className="text-xs text-text-muted mt-1">Users you block will appear here.</p>
                </div>
              ) : (
                blockedUsers.map(userId => {
                  const user = users[userId];
                  if (!user) return null;
                  return (
                    <motion.div
                      key={userId}
                      layout
                      className="flex items-center justify-between group p-3 rounded-xl hover:bg-surface-1 border border-transparent hover:border-border transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar src={user.avatarUrl} alt={user.username} size="sm" showStatus={false} className="opacity-50 grayscale" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-text-muted">{user.username}</span>
                          <span className="text-[10px] text-danger font-bold uppercase tracking-widest">Blocked</span>
                        </div>
                      </div>
                      <button
                        onClick={() => unblockUser(userId)}
                        className="h-8 px-3 rounded-lg bg-surface-2 border border-border flex items-center gap-2 text-xs font-bold text-text-muted hover:text-white hover:bg-accent hover:border-accent transition-all"
                        title="Unblock"
                      >
                        <ShieldOff size={13} />
                        Unblock
                      </button>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ── Friend Row Component ──
interface FriendRowProps {
  user: any;
  onMessage: () => void;
  onCall: () => void;
  onVideoCall: () => void;
  onRemove: () => void;
  onBlock: () => void;
  key?: any;
}

function FriendRow({ user, onMessage, onCall, onVideoCall, onRemove, onBlock }: FriendRowProps) {
  const { 
    callState, 
    hangupCall,
    currentUser, 
    servers, 
    pinnedDms, pinDm, unpinDm, 
    ignoredUsers, ignoreUser, unignoreUser,
    mutedUsers, muteUser, unmuteUser,
    userNotes, setUserNote,
    userNicknames, setUserNickname,
    closedDms, closeDm, openDm,
    blockedUsers, blockUser,
    removeFriend,
    openDialog,
    setActiveDm
  } = useAppStore();

  const isCurrentlyInCall = callState.isActive && callState.userId === user.id;

  const isUserMuted = (uid: string) => {
    const mute = mutedUsers?.find(m => m.userId === uid);
    if (!mute) return false;
    if (mute.expiresAt === null) return true;
    return new Date(mute.expiresAt).getTime() > Date.now();
  };

  const contextMenuItems = [
    // ── Section 1: Chat / Pin ──
    {
      id: 'open-chat',
      label: 'Send Message',
      icon: <MessageSquare size={14} />,
      onClick: onMessage
    },
    {
      id: 'pin-dm',
      label: pinnedDms?.includes(user.id) ? 'Unpin' : 'Pin',
      icon: <Pin size={14} />,
      onClick: () => {
        if (pinnedDms?.includes(user.id)) {
          unpinDm(user.id);
        } else {
          pinDm(user.id);
        }
      }
    },

    // ── Section 2: Profile & Call ──
    { divider: true, id: 'd-profile', label: '' },
    {
      id: 'view-profile',
      label: 'Profile',
      onClick: () => {
        window.dispatchEvent(new CustomEvent('nexus:open-user-profile', { detail: user.id }));
      }
    },
    isCurrentlyInCall ? {
      id: 'disconnect-call',
      label: 'Disconnect Call',
      icon: <PhoneOff size={14} />,
      danger: true,
      onClick: () => hangupCall()
    } : {
      id: 'voice-call',
      label: 'Start Voice Call',
      icon: <Phone size={14} />,
      onClick: onCall
    },
    !isCurrentlyInCall ? {
      id: 'video-call',
      label: 'Start Video Call',
      icon: <Video size={14} />,
      onClick: onVideoCall
    } : null,

    // ── Section 3: Note & Nickname ──
    {
      id: 'add-note',
      label: (
        <div>
          <div>{userNotes[user.id] ? 'Edit Note' : 'Add Note'}</div>
          <div className="text-[10px] text-text-muted font-normal">Only visible to you</div>
        </div>
      ),
      icon: <StickyNote size={14} />,
      onClick: () => {
        openDialog({
          type: 'input',
          title: `Note for ${user.username}`,
          description: 'Notes are only visible to you.',
          placeholder: 'Add a note...',
          defaultValue: userNotes[user.id] || '',
          onConfirm: (note) => {
            setUserNote(user.id, note);
          }
        });
      }
    },
    {
      id: 'nickname',
      label: userNicknames[user.id] ? 'Change Nickname' : 'Add Friend Nickname',
      icon: <Pencil size={14} />,
      onClick: () => {
        openDialog({
          type: 'input',
          title: `Nickname for ${user.username}`,
          description: 'Set a custom nickname visible only to you.',
          placeholder: 'Enter a nickname...',
          defaultValue: userNicknames[user.id] || '',
          onConfirm: (nick) => {
            setUserNickname(user.id, nick);
          }
        });
      }
    },
    {
      id: 'close-dm',
      label: 'Close DM',
      icon: <LogOut size={14} />,
      onClick: () => {
        closeDm(user.id);
      }
    },

    // ── Section 4: Server / Social ──
    { divider: true, id: 'd-social', label: '' },
    {
      id: 'invite-server',
      label: 'Invite to Server',
      icon: <Link size={14} />,
      rightIcon: <ChevronRight size={12} />,
      submenu: servers.length > 0
        ? servers.map(s => ({
            id: `invite-${s.id}`,
            label: s.name,
            icon: s.iconUrl
              ? <img src={s.iconUrl} className="w-3.5 h-3.5 rounded-sm" alt="" />
              : <div className="w-3.5 h-3.5 bg-accent/20 rounded-sm flex items-center justify-center"><span className="text-[7px] font-bold text-accent">{s.name[0]}</span></div>,
            onClick: () => {
              openDialog({
                type: 'confirm',
                title: `Invite to ${s.name}`,
                description: `Send ${user.username} an invite link to join ${s.name}?`,
                confirmLabel: 'Send Invite',
                onConfirm: () => {
                  const myId = currentUser?.id || '';
                  const [sortedA, sortedB] = [myId, user.id].sort();
                  const dmChannelId = `dm-${sortedA}-${sortedB}`;
                  useAppStore.getState().addMessage(`Join my space! http://nexus.chat/invite/${s.id}`, dmChannelId);
                }
              });
            }
          }))
        : [{ id: 'no-servers', label: 'No servers yet', disabled: true }]
    },
    {
      id: 'remove-friend',
      label: 'Remove Friend',
      icon: <UserMinus size={14} />,
      danger: true,
      onClick: () => {
        openDialog({
          type: 'confirm',
          title: 'Remove Friend',
          description: `Are you sure you want to remove ${user.username} from your friends?`,
          confirmLabel: 'Remove',
          isDanger: true,
          onConfirm: () => onRemove()
        });
      }
    },
    {
      id: 'ignore',
      label: ignoredUsers?.includes(user.id) ? 'Unignore' : 'Ignore',
      icon: <EyeOff size={14} />,
      onClick: () => {
        openDialog({
          type: 'confirm',
          title: ignoredUsers?.includes(user.id) ? `Unignore ${user.username}?` : `Ignore ${user.username}?`,
          description: ignoredUsers?.includes(user.id) 
            ? `You will start receiving notifications and messages from ${user.username} again.` 
            : `You will no longer receive notifications or messages from ${user.username}.`,
          confirmLabel: ignoredUsers?.includes(user.id) ? 'Unignore' : 'Ignore',
          onConfirm: () => {
            if (ignoredUsers?.includes(user.id)) {
              unignoreUser(user.id);
            } else {
              ignoreUser(user.id);
            }
          }
        });
      }
    },
    {
      id: 'block',
      label: 'Block',
      icon: <UserX size={14} />,
      danger: true,
      onClick: () => {
        openDialog({
          type: 'confirm',
          title: `Block ${user.username}?`,
          description: `${user.username} won't be able to send you messages or friend requests.`,
          confirmLabel: 'Block',
          isDanger: true,
          onConfirm: () => onBlock()
        });
      }
    },

    // ── Section 5: Mute ──
    { divider: true, id: 'd-mute', label: '' },
    isUserMuted(user.id) ? {
      id: 'unmute-user',
      label: `Unmute @${user.username}`,
      icon: <Volume2 size={14} />,
      onClick: () => unmuteUser(user.id)
    } : {
      id: 'mute-user',
      label: `Mute @${user.username}`,
      icon: <VolumeX size={14} />,
      rightIcon: <ChevronRight size={12} />,
      submenu: [
        { id: 'mute-15m', label: 'For 15 Minutes', onClick: () => muteUser(user.id, 15 * 60 * 1000) },
        { id: 'mute-1h',  label: 'For 1 Hour',    onClick: () => muteUser(user.id, 60 * 60 * 1000) },
        { id: 'mute-3h',  label: 'For 3 Hours',   onClick: () => muteUser(user.id, 3 * 60 * 60 * 1000) },
        { id: 'mute-8h',  label: 'For 8 Hours',   onClick: () => muteUser(user.id, 8 * 60 * 60 * 1000) },
        { id: 'mute-24h', label: 'For 24 Hours',  onClick: () => muteUser(user.id, 24 * 60 * 60 * 1000) },
        { divider: true, id: 'mute-d', label: '' },
        { id: 'mute-until', label: 'Until I turn it back on', onClick: () => muteUser(user.id, null) },
      ]
    },

    // ── Section 6: Copy IDs ──
    { divider: true, id: 'd-copy', label: '' },
    {
      id: 'copy-user-id',
      label: 'Copy User ID',
      icon: <Hash size={14} />,
      rightIcon: <span className="text-[9px] font-black bg-surface-4 border border-border/50 px-1 py-0.5 rounded text-text-muted">ID</span>,
      onClick: () => navigator.clipboard.writeText(user.id)
    }
  ].filter(Boolean) as any;

  const moreItems = [
    { id: 'message', label: 'Send Message', onClick: onMessage },
    isCurrentlyInCall ? {
      id: 'disconnect',
      label: 'Disconnect Call',
      onClick: () => hangupCall(),
      danger: true
    } : {
      id: 'call',
      label: 'Start Voice Call',
      onClick: onCall
    },
    !isCurrentlyInCall ? {
      id: 'video',
      label: 'Start Video Call',
      onClick: onVideoCall
    } : null,
    { id: 'd1', divider: true, label: '' },
    { id: 'remove', label: 'Remove Friend', onClick: onRemove, danger: true },
    { id: 'block', label: 'Block', onClick: onBlock, danger: true },
  ].filter(Boolean) as any;

  const nickname = userNicknames?.[user.id];
  const displayName = nickname || user.username;

  return (
    <ContextMenu items={() => contextMenuItems}>
      <div 
        className="flex items-center justify-between group p-2.5 rounded-xl hover:bg-surface-1 border border-transparent hover:border-border transition-all cursor-pointer"
        onClick={onMessage}
      >
        <div className="flex items-center gap-3">
          <Avatar 
            src={user.avatarUrl} 
            alt={user.username} 
            status={user.status}
            showStatus={true}
            size="sm"
          />
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-text-primary group-hover:text-accent transition-colors truncate">{displayName}</span>
            </div>
            <div className="flex items-center gap-2 overflow-hidden">
              {user.activity ? (
                <div className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] text-accent font-bold uppercase tracking-tight shrink-0">{user.activity.type}</span>
                  <span className="text-[11px] text-text-tertiary truncate">{user.activity.name}</span>
                </div>
              ) : user.customStatus ? (
                <span className="text-[11px] text-text-tertiary truncate">{user.customStatus}</span>
              ) : (
                <span className="text-[11px] text-text-muted capitalize">{user.status}</span>
              )}
            </div>
          </div>
        </div>
        
        <div 
          className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onMessage}
            className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-3 text-text-tertiary hover:bg-surface-4 hover:text-white transition-all shadow-sm"
            title="Send Message"
          >
            <MessageSquare size={16} />
          </button>
          <button 
            onClick={isCurrentlyInCall ? () => hangupCall() : onCall}
            className={cn(
              "w-9 h-9 rounded-xl flex items-center justify-center transition-all shadow-sm",
              isCurrentlyInCall 
                ? "bg-danger text-white hover:bg-danger/80" 
                : "bg-surface-3 text-text-tertiary hover:bg-success hover:text-white"
            )}
            title={isCurrentlyInCall ? "Disconnect Call" : "Start Voice Call"}
          >
            {isCurrentlyInCall ? <PhoneOff size={16} /> : <Phone size={16} />}
          </button>
          <Dropdown items={moreItems} align="right">
            <button
              className="w-9 h-9 rounded-xl flex items-center justify-center bg-surface-3 text-text-tertiary hover:bg-surface-4 hover:text-white transition-all shadow-sm"
              title="More Actions"
            >
              <MoreVertical size={16} />
            </button>
          </Dropdown>
        </div>
      </div>
    </ContextMenu>
  );
}
