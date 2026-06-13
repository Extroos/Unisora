import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { Notification } from '../../types';

export interface MutedUser {
  userId: string;
  /** ISO string of when the mute expires. null = indefinite */
  expiresAt: string | null;
}

export interface NotificationSlice {
  notifications: Notification[];
  pendingFriends: string[];
  incomingRequests: string[];
  friends: string[];
  blockedUsers: string[];
  /** IDs of DM users that are pinned to the top */
  pinnedDms: string[];
  /** IDs of users being ignored (no notifications, messages filtered) */
  ignoredUsers: string[];
  /** Muted users with optional expiry */
  mutedUsers: MutedUser[];
  /** Per-user notes keyed by userId */
  userNotes: Record<string, string>;
  /** Per-user friend nicknames keyed by userId */
  userNicknames: Record<string, string>;
  /** IDs of DM users/channels that are closed/hidden */
  closedDms: string[];

  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (id: string) => void;
  /** Fetches friends/pending/incoming from the server and updates local state */
  fetchFriends: () => Promise<void>;
  /** Sends a real friend request via the API. Returns error string on failure. */
  sendFriendRequest: (username: string) => Promise<{ success: boolean; error?: string }>;
  cancelFriendRequest: (userId: string) => Promise<void>;
  acceptFriendRequest: (userId: string) => Promise<void>;
  rejectFriendRequest: (userId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;
  blockUser: (userId: string) => void;
  unblockUser: (userId: string) => void;

  pinDm: (userId: string) => void;
  unpinDm: (userId: string) => void;
  ignoreUser: (userId: string) => void;
  unignoreUser: (userId: string) => void;
  muteUser: (userId: string, durationMs: number | null) => void;
  unmuteUser: (userId: string) => void;
  isUserMuted: (userId: string) => boolean;
  setUserNote: (userId: string, note: string) => void;
  setUserNickname: (userId: string, nickname: string) => void;
  closeDm: (id: string) => void;
  openDm: (id: string) => void;
}

export const createNotificationSlice: StateCreator<AppState, [], [], NotificationSlice> = (set, get) => ({
  notifications: [],
  pendingFriends: [],
  incomingRequests: [],
  friends: [],
  blockedUsers: [],
  pinnedDms: [],
  ignoredUsers: [],
  mutedUsers: [],
  userNotes: {},
  userNicknames: {},
  closedDms: [],

  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
  })),
  markAllNotificationsRead: async () => {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true }))
    }));
  },
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  fetchFriends: async () => {
    try {
      const res = await fetch('/api/friends', {
        headers: {
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || '',
        }
      });
      if (!res.ok) return;
      const data = await res.json();
      set((state) => ({
        friends: data.friends || [],
        pendingFriends: data.pendingOutgoing || [],
        incomingRequests: data.pendingIncoming || [],
        users: { ...state.users, ...(data.users || {}) }
      }));
    } catch (e) {
      console.error('fetchFriends error:', e);
    }
  },

  sendFriendRequest: async (username) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || '',
        },
        body: JSON.stringify({ username }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to send request' };
      }
      if (data.autoAccepted) {
        // Mutual request — we're now friends
        set((state) => ({
          users: { ...state.users, [data.user.id]: data.user },
          friends: state.friends.includes(data.user.id) ? state.friends : [...state.friends, data.user.id],
          incomingRequests: state.incomingRequests.filter(id => id !== data.user.id),
        }));
      } else {
        // Request sent — add to pending outgoing (store userId)
        set((state) => ({
          users: { ...state.users, [data.user.id]: data.user },
          pendingFriends: state.pendingFriends.includes(data.user.id)
            ? state.pendingFriends
            : [...state.pendingFriends, data.user.id],
        }));
      }
      return { success: true };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  cancelFriendRequest: async (userId) => {
    // Optimistic update
    set((state) => ({
      pendingFriends: state.pendingFriends.filter(id => id !== userId)
    }));
    try {
      await fetch('/api/friends/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || '',
        },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  acceptFriendRequest: async (userId) => {
    // Optimistic update
    set((state) => ({
      incomingRequests: state.incomingRequests.filter(id => id !== userId),
      friends: state.friends.includes(userId) ? state.friends : [...state.friends, userId],
    }));
    try {
      await fetch('/api/friends/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || '',
        },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  rejectFriendRequest: async (userId) => {
    // Optimistic update
    set((state) => ({
      incomingRequests: state.incomingRequests.filter(id => id !== userId),
    }));
    try {
      await fetch('/api/friends/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || '',
        },
        body: JSON.stringify({ userId }),
      });
    } catch (e) {
      console.error(e);
    }
  },

  removeFriend: async (userId) => {
    // Optimistic update
    set((state) => ({
      friends: state.friends.filter(id => id !== userId)
    }));
    try {
      await fetch(`/api/friends/${userId}`, {
        method: 'DELETE',
        headers: {
          'Session-Token': localStorage.getItem('session_token') || '',
          'Session-User-Id': localStorage.getItem('session_user_id') || '',
        },
      });
    } catch (e) {
      console.error(e);
    }
  },

  blockUser: (userId) => set((state) => ({
    blockedUsers: [...state.blockedUsers, userId],
    friends: state.friends.filter(id => id !== userId)
  })),
  unblockUser: (userId) => set((state) => ({
    blockedUsers: state.blockedUsers.filter(id => id !== userId),
  })),

  // ── Pin ──────────────────────────────────────────────────────────────────
  pinDm: (userId) => set((state) => ({
    pinnedDms: state.pinnedDms.includes(userId)
      ? state.pinnedDms
      : [userId, ...state.pinnedDms]
  })),
  unpinDm: (userId) => set((state) => ({
    pinnedDms: state.pinnedDms.filter(id => id !== userId)
  })),

  // ── Ignore ───────────────────────────────────────────────────────────────
  ignoreUser: (userId) => set((state) => ({
    ignoredUsers: state.ignoredUsers.includes(userId)
      ? state.ignoredUsers
      : [...state.ignoredUsers, userId]
  })),
  unignoreUser: (userId) => set((state) => ({
    ignoredUsers: state.ignoredUsers.filter(id => id !== userId)
  })),

  // ── Mute ─────────────────────────────────────────────────────────────────
  muteUser: (userId, durationMs) => {
    const expiresAt = durationMs !== null
      ? new Date(Date.now() + durationMs).toISOString()
      : null;
    set((state) => ({
      mutedUsers: [
        ...state.mutedUsers.filter(m => m.userId !== userId),
        { userId, expiresAt }
      ]
    }));
  },
  unmuteUser: (userId) => set((state) => ({
    mutedUsers: state.mutedUsers.filter(m => m.userId !== userId)
  })),
  isUserMuted: (userId) => {
    const state = get();
    const mute = state.mutedUsers.find(m => m.userId === userId);
    if (!mute) return false;
    if (mute.expiresAt === null) return true; // indefinite
    return new Date(mute.expiresAt).getTime() > Date.now();
  },

  // ── Notes & Nicknames ────────────────────────────────────────────────────
  setUserNote: (userId, note) => set((state) => ({
    userNotes: { ...state.userNotes, [userId]: note }
  })),
  setUserNickname: (userId, nickname) => set((state) => ({
    userNicknames: { ...state.userNicknames, [userId]: nickname }
  })),
  closeDm: (id) => set((state) => ({
    closedDms: state.closedDms.includes(id) ? state.closedDms : [...state.closedDms, id]
  })),
  openDm: (id) => set((state) => ({
    closedDms: state.closedDms.filter(x => x !== id)
  })),
});
