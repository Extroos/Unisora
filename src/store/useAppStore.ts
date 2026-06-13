import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createAuthSlice, AuthSlice } from './slices/authSlice';
import { createServerSlice, ServerSlice } from './slices/serverSlice';
import { createChatSlice, ChatSlice } from './slices/chatSlice';
import { createVoiceSlice, VoiceSlice } from './slices/voiceSlice';
import { createCallSlice, CallSlice } from './slices/callSlice';
import { createUISlice, UISlice } from './slices/uiSlice';
import { createNotificationSlice, NotificationSlice } from './slices/notificationSlice';

export type AppState = AuthSlice & ServerSlice & ChatSlice & VoiceSlice & CallSlice & UISlice & NotificationSlice;

export const useAppStore = create<AppState>()(
  persist(
    (set, get, api) => ({
      ...createAuthSlice(set, get, api),
      ...createServerSlice(set, get, api),
      ...createChatSlice(set, get, api),
      ...createVoiceSlice(set, get, api),
      ...createCallSlice(set, get, api),
      ...createUISlice(set, get, api),
      ...createNotificationSlice(set, get, api),
    }),
    {
      name: 'nexus-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        drafts: state.drafts,
        accentColor: state.accentColor,
        isLoggedIn: state.isLoggedIn,
        folders: state.folders,
        sidebarOrder: state.sidebarOrder,
        pendingFriends: state.pendingFriends,
        incomingRequests: state.incomingRequests,
        friends: state.friends,
        blockedUsers: state.blockedUsers,
        pinnedMessageIds: state.pinnedMessageIds,
        activeServerId: state.activeServerId,
        activeChannelId: state.activeChannelId,
        activeDmId: state.activeDmId,
        pinnedDms: state.pinnedDms,
        ignoredUsers: state.ignoredUsers,
        mutedUsers: state.mutedUsers,
        userNotes: state.userNotes,
        userNicknames: state.userNicknames,
        closedDms: state.closedDms,
      }),
    }
  )
);
