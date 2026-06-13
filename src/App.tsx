/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect } from 'react';
import { AppSidebar } from './components/layout/AppSidebar';
import { ChatArea } from './components/layout/ChatArea';
import { SettingsModal } from './components/SettingsModal';
import { ExplorePage } from './components/layout/ExplorePage';
import { AppAnnouncementView } from './components/layout/AppAnnouncementView';
import { LoginScreen } from './components/Login.tsx';
import { OnboardingScreen } from './components/Onboarding.tsx';
import { NotificationCenter } from './components/notifications/NotificationCenter';
import { VoiceChannelView } from './components/voice/VoiceChannelView';
import { Spotlight } from './components/ui/Spotlight';
import { ComingSoonModal } from './components/modals/ComingSoonModal';
import { DraftsView } from './components/layout/DraftsView';
import { DialogManager } from './components/modals/DialogManager';
import { AdminDashboard } from './components/layout/AdminDashboard';
import { useAppStore } from './store/useAppStore';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AlertTriangle, Sparkles, Users } from 'lucide-react';
import { voiceAudioService } from './services/voice/VoiceAudioService';
import { Avatar } from './components/ui/Avatar';
import { TitleBar } from './components/layout/TitleBar';

export default function App() {
  const { 
    isExploreOpen, isAdminOpen, isDraftsOpen, isLoggedIn, currentUser, 
    isNotificationsOpen, setNotificationsOpen, voiceState, channels, 
    activeChannelId, activeServerId, activeDmId, isRightSidebarOpen, 
    bootstrap, systemConfig, servers, updatePresence, fetchFriends,
    callState, acceptCall, declineCall, users, dmChannels
  } = useAppStore();
  const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);

  const sseRef = React.useRef<EventSource | null>(null);
  const wsRef = React.useRef<WebSocket | null>(null);

  // Persist notification read-state to the DB for specific channel IDs.
  // This is the "cleanup" layer: even if a notification slipped through the
  // presence check (timing gap), calling this immediately after receiving a
  // message marks it read in db.json so it won't reappear on refresh.
  const markChannelReadInDB = React.useCallback((channelIds: string[]) => {
    const sessionId = localStorage.getItem('session_user_id');
    if (!sessionId) return;
    fetch('/api/notifications/read-channel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Session-User-Id': sessionId
      },
      body: JSON.stringify({ channelIds })
    }).catch(() => {});
  }, []);

  useEffect(() => {
    bootstrap(); // Initial load
    if (isLoggedIn) fetchFriends(); // Load friend relationships from server

    // ── SSE: real-time delivery ─────────────────────────────────────────────
    const connectSSE = () => {
      if (sseRef.current) sseRef.current.close();
      const userId = localStorage.getItem('session_user_id') || '';
      const es = new EventSource(`/api/events?userId=${encodeURIComponent(userId)}`);
      sseRef.current = es;

      // New message — instant delivery
      es.addEventListener('new_message', (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data);
          const state = useAppStore.getState();
          const currentUserId = localStorage.getItem('session_user_id') || '';

          // ── Dedup: if this message is from ME, check for a pending optimistic
          // temp message in the same channel. If found, replace it and return.
          // This prevents the double-message flicker where temp + real both appear.
          if (msg.userId === currentUserId) {
            const tempMsg = state.messages.find(
              m => m.id.startsWith('temp-') && m.channelId === msg.channelId && m.userId === currentUserId
            );
            if (tempMsg) {
              // Replace the temp message with the confirmed server message
              useAppStore.setState({
                messages: state.messages.map(m => m.id === tempMsg.id ? msg : m)
              });
              return; // chatSlice will also try to map temp→real; it becomes a safe no-op
            }
            // No temp found (e.g. different tab) — fall through to normal add
          }

          // ── Auto-read: if viewing this channel, stamp timestamp + mark DB read
          const isInThisChannel = msg.channelId === state.activeChannelId ||
            msg.channelId === state.activeDmId;

          if (isInThisChannel) {
            const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
            timestamps[msg.channelId] = new Date().toISOString();
            localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
            useAppStore.setState(s => ({
              notifications: s.notifications.map(n =>
                n.channelId === msg.channelId ? { ...n, read: true } : n
              )
            }));
            markChannelReadInDB([msg.channelId]);
          }

          // Add or update message in state
          if (!state.messages.find(m => m.id === msg.id)) {
            useAppStore.setState({ messages: [...state.messages, msg] });
            if (msg.channelId && msg.channelId.startsWith('dm-')) {
              if (state.dmChannels[msg.channelId]) {
                state.openDm(msg.channelId);
              } else {
                const myId = state.currentUser?.id || '';
                const parts = msg.channelId.split('-');
                // Try to find the participant ID that is not myId
                const otherId = parts.find(p => p && p !== 'dm' && p !== `[${myId}]` && p !== myId)?.replace('[', '').replace(']', '');
                if (otherId) {
                  state.openDm(otherId);
                }
              }
            }
          } else {
            useAppStore.setState({
              messages: state.messages.map(m => m.id === msg.id ? msg : m)
            });
          }

          // ── Notification Alerts & Sound Chimes ──
          if (msg.userId !== currentUserId && !isInThisChannel) {
            if (state.ignoredUsers?.includes(msg.userId)) return;
            const userMute = state.mutedUsers?.find(m => m.userId === msg.userId);
            const isMuted = userMute && (userMute.expiresAt === null || new Date(userMute.expiresAt).getTime() > Date.now());
            if (isMuted) return;

            const userPrefs = {
              desktop: true,
              messageSounds: true,
              mentionAlerts: true,
              dmNotifications: false,
              ...state.currentUser?.notificationPrefs
            };

            const isDM = msg.channelId.startsWith('dm-');
            let shouldAlert = false;
            let isMention = false;

            if (isDM) {
              if (userPrefs.dmNotifications) {
                shouldAlert = true;
              }
            } else {
              const channel = state.channels.find(c => c.id === msg.channelId);
              if (channel) {
                const server = state.servers.find(s => s.id === channel.serverId);
                if (server) {
                  const serverMuted = server.settings?.isMuted || false;
                  const serverPref = server.settings?.notifications || 'all';

                  const myUsername = state.currentUser?.username || '';
                  isMention = (msg.content || '').includes(`@${myUsername}`) || (msg.content || '').includes('@everyone');

                  if (!serverMuted) {
                    if (serverPref === 'all') {
                      shouldAlert = true;
                    } else if (serverPref === 'mentions' && isMention) {
                      shouldAlert = true;
                    }
                  } else {
                    // Muted server: only notify on mention
                    if (isMention) {
                      shouldAlert = true;
                    }
                  }
                }
              }
            }

            if (shouldAlert) {
              if (userPrefs.messageSounds) {
                voiceAudioService.playChime('message');
              }
              if (userPrefs.desktop && typeof Notification !== 'undefined') {
                if (Notification.permission === 'granted') {
                  const senderName = state.users[msg.userId]?.username || 'User';
                  new Notification(isDM ? `Direct Message` : `New Message`, {
                    body: `${senderName}: ${msg.content || 'Sent an attachment'}`,
                    icon: state.users[msg.userId]?.avatarUrl
                  });
                }
              }
            }
          }
        } catch (_) {}
      });


      // Edit / delete — instant
      es.addEventListener('edit_message', (e: MessageEvent) => {
        try {
          const updated = JSON.parse(e.data);
          useAppStore.setState(state => ({
            messages: state.messages.map(m => m.id === updated.id ? updated : m)
          }));
        } catch (_) {}
      });

      es.addEventListener('delete_message', (e: MessageEvent) => {
        try {
          const { id } = JSON.parse(e.data);
          useAppStore.setState(state => ({
            messages: state.messages.filter(m => m.id !== id)
          }));
        } catch (_) {}
      });

      // Presence — live "who is viewing what" updates
      es.addEventListener('presence_update', (e: MessageEvent) => {
        try {
          const presence = JSON.parse(e.data);
          useAppStore.getState().updatePresence(presence);
        } catch (_) {}
      });

      // User Profile Updates — live username, bio, avatar, banner updates
      es.addEventListener('user_update', (e: MessageEvent) => {
        try {
          const user = JSON.parse(e.data);
          const state = useAppStore.getState();
          const isMe = state.currentUser && state.currentUser.id === user.id;
          useAppStore.setState(s => ({
            users: { ...s.users, [user.id]: user },
            currentUser: isMe ? user : s.currentUser
          }));
        } catch (_) {}
      });

      // Notification — pushed directly to the specific recipient by the server
      es.addEventListener('notification', (e: MessageEvent) => {
        try {
          const notif = JSON.parse(e.data);
          const state = useAppStore.getState();
          // Only add if not already present
          if (!state.notifications.find(n => n.id === notif.id)) {
            useAppStore.setState({ notifications: [...state.notifications, notif] });
          }
        } catch (_) {}
      });

      // Friend request received — add to incoming requests
      es.addEventListener('friend_request_received', (e: MessageEvent) => {
        try {
          const { fromUser } = JSON.parse(e.data);
          useAppStore.setState(state => ({
            users: { ...state.users, [fromUser.id]: fromUser },
            incomingRequests: state.incomingRequests.includes(fromUser.id)
              ? state.incomingRequests
              : [...state.incomingRequests, fromUser.id]
          }));
          voiceAudioService.playChime('message');
        } catch (_) {}
      });

      // Friend request accepted (mutual or they accepted ours)
      es.addEventListener('friend_accepted', (e: MessageEvent) => {
        try {
          const { user } = JSON.parse(e.data);
          useAppStore.setState(state => ({
            users: { ...state.users, [user.id]: user },
            friends: state.friends.includes(user.id) ? state.friends : [...state.friends, user.id],
            pendingFriends: state.pendingFriends.filter(id => id !== user.id),
            incomingRequests: state.incomingRequests.filter(id => id !== user.id),
          }));
        } catch (_) {}
      });

      // Friend removed by the other side
      es.addEventListener('friend_removed', (e: MessageEvent) => {
        try {
          const { userId } = JSON.parse(e.data);
          useAppStore.setState(state => ({
            friends: state.friends.filter(id => id !== userId)
          }));
        } catch (_) {}
      });

      es.onerror = () => {
        es.close();
        setTimeout(connectSSE, 3000);
      };
    };

    const connectWS = () => {
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.onerror = null;
        wsRef.current.close();
      }
      const token = localStorage.getItem('session_token') || localStorage.getItem('session_user_id') || '';
      if (!token) return;

      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname + ':3001';
      let ws: WebSocket;
      try {
        ws = new WebSocket(`${wsProtocol}//${host}`);
      } catch (_) {
        return;
      }
      wsRef.current = ws;
      useAppStore.getState().setSocket(ws);

      ws.onopen = () => {
        ws.send(JSON.stringify({ type: 'auth', token }));
        const state = useAppStore.getState();
        ws.send(JSON.stringify({
          type: 'presence',
          serverId: state.activeServerId || null,
          channelId: state.activeChannelId || null
        }));
      };

      ws.onmessage = (e) => {
        try {
          const msgObj = JSON.parse(e.data);
          if (msgObj.event === 'typing_update') {
            const { userId, channelId, isTyping } = msgObj.data;
            const state = useAppStore.getState();
            const currentTyping = state.typingUsers[channelId] || [];
            if (isTyping) {
              if (!currentTyping.includes(userId)) {
                useAppStore.setState({
                  typingUsers: {
                    ...state.typingUsers,
                    [channelId]: [...currentTyping, userId]
                  }
                });
              }
            } else {
              useAppStore.setState({
                typingUsers: {
                  ...state.typingUsers,
                  [channelId]: currentTyping.filter((id: string) => id !== userId)
                }
              });
            }
          } else if (msgObj.event === 'incoming_call') {
            const { senderUserId, callType, channelId } = msgObj.data;
            useAppStore.getState().receiveCall(senderUserId, callType, channelId);
          } else if (msgObj.event === 'call_accepted') {
            const { targetUserId } = msgObj.data;
            useAppStore.setState(s => {
              const joined = s.callState.joinedUserIds || [];
              if (targetUserId && !joined.includes(targetUserId)) {
                return {
                  callState: {
                    ...s.callState,
                    joinedUserIds: [...joined, targetUserId],
                    status: 'connected'
                  }
                };
              }
              return {};
            });
            useAppStore.getState().initiateHandshake();
          } else if (msgObj.event === 'call_declined') {
            useAppStore.getState().hangupCall();
          } else if (msgObj.event === 'call_ended') {
            const { targetUserId } = msgObj.data;
            useAppStore.setState(s => {
              const joined = s.callState.joinedUserIds || [];
              return {
                callState: {
                  ...s.callState,
                  joinedUserIds: joined.filter(id => id !== targetUserId)
                }
              };
            });
            const updatedState = useAppStore.getState().callState;
            if (!updatedState.userId?.startsWith('dm-') || (updatedState.joinedUserIds && updatedState.joinedUserIds.length <= 1)) {
              useAppStore.getState().hangupCall();
            }
          } else if (msgObj.event === 'webrtc_signal') {
            const { senderUserId, signal } = msgObj.data;
            useAppStore.getState().handleWebrtcSignal(senderUserId, signal);
          } else if (msgObj.event === 'dm_channel_update') {
            const updatedDm = msgObj.data;
            const myId = useAppStore.getState().currentUser?.id;
            useAppStore.setState(state => {
              if (myId && updatedDm.participants.includes(myId)) {
                return {
                  dmChannels: {
                    ...state.dmChannels,
                    [updatedDm.id]: updatedDm
                  }
                };
              } else {
                if (state.dmChannels[updatedDm.id]) {
                  const newDms = { ...state.dmChannels };
                  delete newDms[updatedDm.id];
                  const newActiveDmId = state.activeDmId === updatedDm.id ? null : state.activeDmId;
                  return { dmChannels: newDms, activeDmId: newActiveDmId };
                }
                return {};
              }
            });
          } else if (msgObj.event === 'dm_channel_leave') {
            const { dmId, userId, newOwnerId } = msgObj.data;
            useAppStore.setState(state => {
              const dm = state.dmChannels[dmId];
              if (!dm) return {};
              if (userId === state.currentUser?.id) {
                const newDms = { ...state.dmChannels };
                delete newDms[dmId];
                const newActiveDmId = state.activeDmId === dmId ? null : state.activeDmId;
                return { dmChannels: newDms, activeDmId: newActiveDmId };
              }
              return {
                dmChannels: {
                  ...state.dmChannels,
                  [dmId]: {
                    ...dm,
                    ownerId: newOwnerId !== undefined ? newOwnerId : dm.ownerId,
                    participants: dm.participants.filter((pid: string) => pid !== userId)
                  }
                }
              };
            });
          }
        } catch (_) {}
      };

      ws.onclose = () => {
        useAppStore.getState().setSocket(null);
        // Only auto-reconnect if this socket is still the active one (prevents StrictMode ghost reconnects)
        if (wsRef.current === ws) {
          wsRef.current = null;
          setTimeout(connectWS, 3000);
        }
      };
    };

    if (isLoggedIn) {
      connectSSE();
      connectWS();
    }

    // ── Slower poll for voice connections and server state ──────────────────
    const interval = setInterval(() => {
      bootstrap();
    }, 8000);

    return () => {
      clearInterval(interval);
      if (sseRef.current) { sseRef.current.close(); sseRef.current = null; }
      if (wsRef.current) {
        const ws = wsRef.current;
        wsRef.current = null; // Nullify first so onclose guard skips reconnect
        ws.onclose = null;
        ws.onerror = null;
        ws.close();
      }
    };
  }, [bootstrap, isLoggedIn]);

  useKeyboardShortcuts();

  // Auto-reconnect voice on page refresh
  useEffect(() => {
    if (isLoggedIn) {
      const savedChannelId = localStorage.getItem('activeVoiceChannelId');
      if (savedChannelId && !voiceState.channelId) {
        const channelExists = channels.some(c => c.id === savedChannelId);
        if (channelExists) {
          useAppStore.getState().joinVoiceChannel(savedChannelId);
        }
      }
    }
  }, [isLoggedIn, channels, voiceState.channelId]);

  // Request browser notification permission if enabled in preferences
  useEffect(() => {
    if (isLoggedIn && currentUser?.notificationPrefs?.desktop && typeof Notification !== 'undefined') {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, [isLoggedIn, currentUser?.notificationPrefs?.desktop]);

  // ── Auto-stamp last_read when switching into a server channel ──────────────
  useEffect(() => {
    if (!activeChannelId) return;
    const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
    timestamps[activeChannelId] = new Date().toISOString();
    localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
    // Clear in local state
    useAppStore.setState(state => ({
      notifications: state.notifications.map(n =>
        n.channelId === activeChannelId ? { ...n, read: true } : n
      )
    }));
    // Persist to DB — this is the critical part that survives refresh
    markChannelReadInDB([activeChannelId]);
  }, [activeChannelId, markChannelReadInDB]);

  // ── Auto-stamp last_read when switching into a DM ─────────────────────────
  useEffect(() => {
    if (!activeDmId) return;
    const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
    const myId = currentUser?.id || '';
    const channelVariants: string[] = [];
    if (myId) {
      const [a, b] = [myId, activeDmId].sort();
      const canonicalId = `dm-${a}-${b}`;
      channelVariants.push(
        canonicalId,
        `dm-[${myId}]-${activeDmId}`,
        `dm-[${activeDmId}]-${myId}`,
        `dm-${myId}-${activeDmId}`,
        `dm-${activeDmId}-${myId}`
      );
      channelVariants.forEach(cid => { timestamps[cid] = new Date().toISOString(); });
    }
    localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
    useAppStore.setState(state => ({
      notifications: state.notifications.map(n =>
        n.channelId === activeDmId || n.channelId?.includes(activeDmId) ? { ...n, read: true } : n
      )
    }));
    // Persist to DB — mark all DM channel ID variants as read
    if (channelVariants.length > 0) markChannelReadInDB(channelVariants);
    useAppStore.getState().openDm(activeDmId);
  }, [activeDmId, currentUser?.id, markChannelReadInDB]);

  // ── Report presence to backend whenever context changes ────────────────────
  // This is the KEY fix: the server uses this to skip creating notifications
  // for the channel you are actively viewing, so they never appear on refresh.
  useEffect(() => {
    const sessionId = localStorage.getItem('session_user_id');
    if (!sessionId || !isLoggedIn) return;
    
    // HTTP fallback presence
    fetch('/api/presence', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Session-User-Id': sessionId
      },
      body: JSON.stringify({
        activeChannelId: activeChannelId || null,
        activeServerId: activeServerId || null,
        activeDmId: activeDmId || null
      })
    }).catch(() => {});

    // WebSocket presence update
    const state = useAppStore.getState();
    const socket = state.socket;
    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'presence',
        serverId: activeServerId || null,
        channelId: activeChannelId || null
      }));
    }
  }, [activeChannelId, activeServerId, activeDmId, isLoggedIn]);


  // Listen for Ctrl+K → open Spotlight instead of basic search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSpotlightOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Disable browser default context menu globally to match native app feel
  useEffect(() => {
    const handleGlobalContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    window.addEventListener('contextmenu', handleGlobalContextMenu);
    return () => window.removeEventListener('contextmenu', handleGlobalContextMenu);
  }, []);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-1 text-text-primary antialiased font-sans">
      <TitleBar />
      
      {!isLoggedIn ? (
        <div className="flex-1 overflow-hidden relative">
          <LoginScreen />
        </div>
      ) : currentUser?.needsOnboarding ? (
        <div className="flex-1 overflow-hidden relative">
          <OnboardingScreen />
        </div>
      ) : systemConfig?.maintenanceMode && currentUser?.email !== 'abderrahmanchakkouri@gmail.com' ? (
        <div className="flex flex-col items-center justify-center flex-1 bg-surface-0 p-8 text-center select-none">
          <div className="w-16 h-16 bg-yellow-500/10 text-yellow-500 rounded-2xl flex items-center justify-center mb-5 border border-yellow-500/25 animate-pulse">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-bold text-text-primary mb-1">Undergoing Maintenance</h2>
          <p className="text-text-muted max-w-sm text-xs leading-normal">
            Unisora is currently offline for scheduled system updates. We will be back online shortly. Thank you for your patience!
          </p>
        </div>
      ) : (
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {systemConfig?.globalAnnouncementBanner && (
            <div className="bg-accent text-white px-4 py-1.5 text-center text-xs font-bold flex items-center justify-center gap-2 select-none z-50 shrink-0 border-b border-white/10 font-sans">
              <Sparkles size={13} className="animate-pulse" />
              <span>{systemConfig.globalAnnouncementBanner}</span>
            </div>
          )}
          <div className="flex flex-1 overflow-hidden relative">
            <AppSidebar />
            <div className="flex flex-1 overflow-hidden relative bg-surface-0">
              {isAdminOpen ? (
                <AdminDashboard />
              ) : isExploreOpen ? (
                <ExplorePage />
              ) : isDraftsOpen ? (
                <DraftsView />
              ) : activeChannelId === 'chan_app_announcement' ? (
                <AppAnnouncementView />
              ) : (() => {
                const activeChannel = channels.find(c => c.id === activeChannelId);
                const isVoice = activeChannel?.type === 'voice';
                return isVoice && activeChannel ? (
                  <VoiceChannelView channelId={activeChannel.id} />
                ) : (
                  <ChatArea />
                );
              })()}
            </div>
          </div>
          <SettingsModal />
          <NotificationCenter isOpen={isNotificationsOpen} onClose={() => setNotificationsOpen(false)} />
          <Spotlight isOpen={isSpotlightOpen} onClose={() => setIsSpotlightOpen(false)} />
          <ComingSoonModal />
          <DialogManager />
        </div>
      )}

      {/* Global Incoming Call Banner (Discord Style) */}
      {callState.status === 'ringing' && (() => {
        const caller = callState.userId ? users[callState.userId] || Object.values(users).find(u => u.id === callState.userId) : null;
        const dmChannel = callState.userId ? dmChannels[callState.userId] : null;
        let callerName = caller?.username || 'Someone';
        let callerAvatar = caller?.avatarUrl;

        if (dmChannel) {
          if (dmChannel.name) {
            callerName = dmChannel.name;
          } else {
            const otherParticipants = dmChannel.participants.filter(id => id !== currentUser?.id);
            callerName = otherParticipants.map(id => users[id]?.username).join(', ') || 'Group Call';
          }
          callerAvatar = undefined;
        }

        return (
          <div className="fixed top-6 right-6 z-[9999] bg-[#1e1f22] border border-[#2b2d31] rounded-xl p-4 shadow-[0_8px_24px_rgba(0,0,0,0.5)] flex flex-col gap-3 max-w-sm w-80 font-sans">
            <div className="flex items-center gap-3">
              {callerAvatar ? (
                <Avatar src={callerAvatar} alt={callerName} size="md" showStatus={false} />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center shrink-0">
                  <Users size={20} />
                </div>
              )}
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Incoming Call</span>
                <span className="text-sm font-bold text-white truncate">{callerName}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  acceptCall();
                  if (callState.userId) {
                    useAppStore.getState().openDm(callState.userId);
                    useAppStore.getState().setActiveDm(callState.userId);
                  }
                }}
                className="flex-1 bg-[#23a55a] hover:bg-[#1a7f43] text-white font-bold py-2 rounded-lg text-xs transition-colors duration-150 cursor-pointer"
              >
                Join Call
              </button>
              <button 
                onClick={() => declineCall()}
                className="flex-1 bg-[#f23f43] hover:bg-[#c93135] text-white font-bold py-2 rounded-lg text-xs transition-colors duration-150 cursor-pointer"
              >
                Decline
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
