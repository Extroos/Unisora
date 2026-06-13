import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { FriendTab } from '../../types';

export interface UISlice {
  activeServerId: string | null;
  activeChannelId: string | null;
  activeDmId: string | null;
  isSettingsOpen: boolean;
  isExploreOpen: boolean;
  isAdminOpen: boolean;
  isNotificationsOpen: boolean;
  isDraftsOpen: boolean;
  friendTab: FriendTab;
  searchQuery: string;
  activePopoverId: string | null;
  activeThreadId: string | null;
  isRightSidebarOpen: boolean;
  accentColor: string;
  comingSoonFeature: string | null;
  compactMode: boolean;
  notificationPrefs: Record<string, boolean>;
  locale: string;
  dialog: {
    isOpen: boolean;
    type: 'confirm' | 'input';
    title: string;
    description: string;
    placeholder?: string;
    defaultValue?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    isDanger?: boolean;
    onConfirm: (value?: string) => void;
  } | null;

  setActiveServer: (id: string | null) => void;
  setActiveChannel: (id: string | null) => void;
  setActiveDm: (id: string | null) => void;
  setSettingsOpen: (isOpen: boolean) => void;
  setExploreOpen: (isOpen: boolean) => void;
  setAdminOpen: (isOpen: boolean) => void;
  setNotificationsOpen: (isOpen: boolean) => void;
  setDraftsOpen: (isOpen: boolean) => void;
  setFriendTab: (tab: FriendTab) => void;
  setSearchQuery: (q: string) => void;
  setActivePopoverId: (id: string | null) => void;
  setActiveThread: (id: string | null) => void;
  setRightSidebarOpen: (isOpen: boolean) => void;
  setAccentColor: (color: string) => void;
  setComingSoonFeature: (feature: string | null) => void;
  setCompactMode: (on: boolean) => void;
  setNotificationPref: (key: string, value: boolean) => void;
  setLocale: (locale: string) => void;
  openDialog: (config: Omit<NonNullable<UISlice['dialog']>, 'isOpen'>) => void;
  closeDialog: () => void;
}

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set, get) => ({
  activeServerId: null,
  activeChannelId: null,
  activeDmId: null,
  isSettingsOpen: false,
  isExploreOpen: false,
  isAdminOpen: false,
  isNotificationsOpen: false,
  isDraftsOpen: false,
  friendTab: 'online',
  searchQuery: '',
  activePopoverId: null,
  activeThreadId: null,
  isRightSidebarOpen: true,
  accentColor: '#5865f2',
  comingSoonFeature: null,
  compactMode: false,
  notificationPrefs: {
    desktop: true,
    messageSounds: true,
    mentionAlerts: true,
    dmNotifications: false,
  },
  locale: 'en',

  setActiveServer: (id) => set((state) => {
    const firstTextChannel = state.channels.find(c => c.serverId === id && (c.type === 'text' || c.type === 'announcement'))?.id || null;
    return { activeServerId: id, activeChannelId: firstTextChannel, activeDmId: null, isExploreOpen: false, isAdminOpen: false, isDraftsOpen: false };
  }),

  setActiveChannel: (id) => set(() => {
    if (id) {
      const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
      timestamps[id] = new Date().toISOString();
      localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
    }
    return {
      activeChannelId: id,
      isExploreOpen: false,
      isAdminOpen: false,
      isDraftsOpen: false
    };
  }),

  setActiveDm: (id) => set((state) => {
    if (id) {
      const myId = state.currentUser?.id || '';
      const dmChannelIds = [
        `dm-[${myId}]-${id}`,
        `dm-[${id}]-${myId}`,
        `dm-${myId}-${id}`,
        `dm-${id}-${myId}`,
        `dm-[u1]-${id}`,
        `dm-[${id}]-u1`,
        id
      ];
      const timestamps = JSON.parse(localStorage.getItem('last_read_timestamps') || '{}');
      dmChannelIds.forEach(cid => {
        timestamps[cid] = new Date().toISOString();
      });
      localStorage.setItem('last_read_timestamps', JSON.stringify(timestamps));
    }
    return { activeDmId: id, activeServerId: null, activeChannelId: null, isExploreOpen: false, isAdminOpen: false, isDraftsOpen: false };
  }),
  setSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),
  setExploreOpen: (isOpen) => set({ isExploreOpen: isOpen, activeServerId: null, activeChannelId: null, activeDmId: null, isAdminOpen: false }),
  setAdminOpen: (isOpen) => set({ isAdminOpen: isOpen, activeServerId: null, activeChannelId: null, activeDmId: null, isExploreOpen: false, isDraftsOpen: false }),
  setNotificationsOpen: (isOpen) => set({ isNotificationsOpen: isOpen }),
  setDraftsOpen: (isOpen) => set({ isDraftsOpen: isOpen, activeServerId: null, activeChannelId: null, activeDmId: null, isExploreOpen: false, isAdminOpen: false }),
  setFriendTab: (tab) => set({ friendTab: tab }),
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActivePopoverId: (id) => set({ activePopoverId: id }),
  setActiveThread: (id) => set({ activeThreadId: id, isRightSidebarOpen: id !== null }),
  setRightSidebarOpen: (isOpen) => set({ isRightSidebarOpen: isOpen }),
  setAccentColor: (color) => {
    set({ accentColor: color });
    document.documentElement.style.setProperty('--color-accent', color);
  },
  setComingSoonFeature: (feature) => set({ comingSoonFeature: feature }),
  setCompactMode: (on) => set({ compactMode: on }),
  setNotificationPref: async (key, value) => {
    const state = get();
    const currentPrefs = state.currentUser?.notificationPrefs || {
      desktop: true,
      messageSounds: true,
      mentionAlerts: true,
      dmNotifications: false,
    };
    const newPrefs = { ...currentPrefs, [key]: value };
    await state.updateCurrentUser({ notificationPrefs: newPrefs });
    set({ notificationPrefs: newPrefs });
  },
  setLocale: (locale) => set({ locale }),
  dialog: null,
  openDialog: (config) => set({ dialog: { ...config, isOpen: true } }),
  closeDialog: () => set((state) => ({ dialog: state.dialog ? { ...state.dialog, isOpen: false } : null })),
});
