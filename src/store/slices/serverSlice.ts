import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { MOCK_SERVERS, MOCK_CATEGORIES, MOCK_CHANNELS, MOCK_THREADS } from '../../lib/mockData';
import { Server, Category, Channel, Folder, Role, ChannelType, AuditLogAction, AuditLog, ServerInvite, Thread, Webhook, UserPresence } from '../../types';

export interface ServerSlice {
  servers: Server[];
  categories: Category[];
  channels: Channel[];
  threads: Thread[];
  webhooks: Webhook[];
  folders: Folder[];
  invites: Record<string, ServerInvite>;
  systemConfig: {
    allowRegistrations: boolean;
    allowGoogleLogin: boolean;
    maintenanceMode: boolean;
    globalAnnouncementBanner: string | null;
    activeBroadcast?: {
      content: string;
      durationHours: number;
      createdAt: string;
      expiresAt: string;
    } | null;
  } | null;

  createInvite: (serverId: string, config: Partial<ServerInvite>) => string;
  deleteInvite: (code: string) => void;
  joinServerWithInvite: (code: string) => { status: 'success' | 'already_member' | 'error'; serverId?: string };

  setFolders: (folders: Folder[]) => void;
  addFolder: (name: string, color?: string) => void;
  deleteFolder: (folderId: string) => void;
  updateFolder: (folderId: string, updates: Partial<Folder>) => void;
  moveServerToFolder: (serverId: string, folderId: string | null) => void;
  addServer: (name: string, template?: 'gaming' | 'school') => void;
  updateServer: (serverId: string, updates: Partial<Server>) => void;
  deleteServer: (serverId: string) => void;
  updateMemberRole: (serverId: string, userId: string, roleIds: string[]) => void;
  addServerRole: (serverId: string, role: Role) => void;
  updateServerRole: (serverId: string, roleId: string, role: Partial<Role>) => void;
  deleteServerRole: (serverId: string, roleId: string) => void;
  updateServerSettings: (serverId: string, settings: Partial<NonNullable<Server['settings']>>) => void;
  addChannel: (serverId: string, categoryId: string, name: string, type: ChannelType, isStage?: boolean) => void;
  updateChannel: (channelId: string, updates: Partial<Channel>) => void;
  deleteChannel: (channelId: string) => void;
  addCategory: (serverId: string, name: string) => void;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;
  reorderServers: (serverIds: string[]) => void;
  reorderCategories: (serverId: string, categoryIds: string[]) => void;
  reorderChannels: (categoryId: string, channelIds: string[]) => void;
  moveChannelToCategory: (channelId: string, newCategoryId: string) => void;
  addAuditLog: (serverId: string, action: AuditLogAction, targetId?: string, targetName?: string, changes?: AuditLog['changes']) => void;
  kickMember: (serverId: string, userId: string) => void;
  banMember: (serverId: string, userId: string) => void;
  transferOwnership: (serverId: string, newOwnerId: string) => void;
  joinServer: (serverId: string) => Promise<void>;
  leaveServer: (serverId: string) => Promise<void>;
  getPermissions: (serverId: string, userId: string) => string[];
  
  toggleArchiveThread: (threadId: string) => void;
  togglePrivateThread: (threadId: string) => void;

  createWebhook: (serverId: string, channelId: string, name: string) => void;
  deleteWebhook: (webhookId: string) => void;
  bootstrap: () => Promise<void>;

  // Presence: tracks which channel every user is currently viewing
  presences: Record<string, UserPresence>;
  updatePresence: (presence: UserPresence) => void;

  // Sidebar ordering: flat list of folder IDs and ungrouped server IDs
  sidebarOrder: string[];
  setSidebarOrder: (order: string[]) => void;
}

export const createServerSlice: StateCreator<AppState, [], [], ServerSlice> = (set, get) => ({
  servers: [],
  categories: [],
  channels: [],
  threads: [],
  webhooks: [],
  folders: [],
  invites: {},
  systemConfig: null,
  sidebarOrder: [],
  presences: {},

  bootstrap: async () => {
    try {
      const res = await fetch('/api/bootstrap', {
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        const data = await res.json();
        const state = get();
        const activeServerId = state.activeServerId;
        const activeChannelId = state.activeChannelId;
        
        let voiceConns = (data.voiceConnections || []).reduce((acc: any, conn: any) => ({
          ...acc,
          [conn.userId]: conn
        }), {});

        const myChannelId = state.voiceState?.channelId || null;
        let connectedUsers = myChannelId 
          ? (data.voiceConnections || []).filter((c: any) => c.channelId === myChannelId).map((c: any) => c.userId)
          : [];

        // Preserve current user mock connection if we are in the connecting state
        if (state.voiceState?.isConnecting && myChannelId) {
          const myId = state.currentUser?.id || 'u1';
          if (!connectedUsers.includes(myId)) {
            connectedUsers = [...connectedUsers, myId];
          }
          if (!voiceConns[myId]) {
            voiceConns = {
              ...voiceConns,
              [myId]: {
                userId: myId,
                channelId: myChannelId,
                isMuted: state.voiceState.isMuted || false,
                isDeafened: state.voiceState.isDeafened || false,
                isSpeaking: false
              }
            };
          }
        }

        const mergedUsers = data.users.reduce((acc: any, u: any) => ({ ...acc, [u.id]: u }), {});
        if (data.currentUser) {
          mergedUsers[data.currentUser.id] = data.currentUser;
        } else if (state.currentUser) {
          mergedUsers[state.currentUser.id] = state.currentUser;
        }

        set({
          servers: data.servers,
          categories: data.categories,
          channels: data.channels,
          threads: data.threads,
          messages: data.messages,
          users: mergedUsers,
          dmChannels: data.dmChannels,
          notifications: data.notifications,
          currentUser: data.currentUser,
          activeServerId,
          activeChannelId,
          voiceConnections: voiceConns,
          voiceState: {
            ...state.voiceState,
            connectedUsers
          },
          systemConfig: data.systemConfig || null,
          presences: (data.presences || []).reduce((acc: any, p: any) => ({ ...acc, [p.userId]: p }), {})
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  updatePresence: (presence) => set((state) => ({
    presences: { ...state.presences, [presence.userId]: presence }
  })),

  createInvite: (serverId, config) => {
    const code = Math.random().toString(36).substring(2, 10);
    const myId = get().currentUser?.id || 'u1';
    const invite: ServerInvite = {
      code,
      serverId,
      inviterId: myId,
      createdAt: new Date().toISOString(),
      uses: 0,
      maxUses: config.maxUses || 0,
      expiresAt: config.expiresAt
    };
    set((state) => ({ invites: { ...state.invites, [code]: invite } }));
    return code;
  },

  deleteInvite: (code) => set((state) => {
    const newInvites = { ...state.invites };
    delete newInvites[code];
    return { invites: newInvites };
  }),

  joinServerWithInvite: (code) => {
    const state = get();
    const invite = state.invites[code];
    if (!invite) return { status: 'error' };
    if (invite.maxUses && invite.uses >= invite.maxUses) return { status: 'error' };
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) return { status: 'error' };

    const updatedInvite = { ...invite, uses: invite.uses + 1 };
    const server = state.servers.find(s => s.id === invite.serverId);
    if (!server) return { status: 'error' };
    const myId = state.currentUser?.id || 'u1';
    if (server.members.includes(myId)) {
      set((s) => ({ invites: { ...s.invites, [code]: updatedInvite } }));
      return { status: 'already_member', serverId: invite.serverId };
    }

    set((s) => ({
      invites: { ...s.invites, [code]: updatedInvite },
    }));
    get().joinServer(invite.serverId);
    return { status: 'success', serverId: invite.serverId };
  },

  setFolders: (folders) => set({ folders }),
  setSidebarOrder: (order) => set({ sidebarOrder: order }),
  addFolder: (name, color) => set((state) => {
    const newFolder = { id: `f_${Date.now()}`, name, color: color || '#5865f2', serverIds: [] };
    return {
      folders: [...state.folders, newFolder],
      // Append new folder at end of sidebar order
      sidebarOrder: [...state.sidebarOrder.filter(id =>
        state.folders.some(f => f.id === id) || state.servers.some(s => s.id === id)
      ), newFolder.id]
    };
  }),
  deleteFolder: (folderId) => set((state) => ({
    folders: state.folders.filter(f => f.id !== folderId),
    sidebarOrder: state.sidebarOrder.filter(id => id !== folderId)
  })),
  updateFolder: (folderId, updates) => set((state) => ({
    folders: state.folders.map(f => f.id === folderId ? { ...f, ...updates } : f)
  })),
  moveServerToFolder: (serverId, folderId) => set((state) => {
    const cleanFolders = state.folders.map(f => ({
      ...f,
      serverIds: f.serverIds.filter(id => id !== serverId)
    }));
    // When removing from folder, add the server back to sidebarOrder as ungrouped
    let newOrder = state.sidebarOrder;
    if (!folderId) {
      // Add server to sidebarOrder if not already there
      if (!newOrder.includes(serverId)) {
        newOrder = [...newOrder, serverId];
      }
      return { folders: cleanFolders, sidebarOrder: newOrder };
    }
    // Moving into folder: remove server from sidebarOrder (it's now inside a folder)
    newOrder = newOrder.filter(id => id !== serverId);
    return {
      folders: cleanFolders.map(f =>
        f.id === folderId
          ? { ...f, serverIds: [...f.serverIds, serverId] }
          : f
      ),
      sidebarOrder: newOrder
    };
  }),

  addServer: async (name, template) => {
    try {
      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ name, template })
      });
      if (res.ok) {
        const { server, categories, channels } = await res.json();
        set((state) => ({
          servers: [...state.servers, server],
          categories: [...state.categories, ...categories],
          channels: [...state.channels, ...channels],
          activeServerId: server.id,
          activeChannelId: channels.find((c: any) => c.type === 'text' || c.type === 'announcement')?.id || channels[0]?.id || null,
          activeDmId: null
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateServer: async (serverId, updates) => {
    try {
      const res = await fetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => s.id === serverId ? { ...s, ...updates } : s)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteServer: async (serverId) => {
    try {
      const res = await fetch(`/api/servers/${serverId}`, { 
        method: 'DELETE',
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        set((state) => {
          const remainingServers = state.servers.filter(s => s.id !== serverId);
          const nextActiveId = remainingServers.length > 0 ? remainingServers[0].id : null;
          return {
            servers: remainingServers,
            activeServerId: state.activeServerId === serverId ? nextActiveId : state.activeServerId,
            channels: state.channels.filter(c => c.serverId !== serverId),
            categories: state.categories.filter(c => c.serverId !== serverId),
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateServerSettings: async (serverId, settings) => {
    try {
      const res = await fetch(`/api/servers/${serverId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ settings })
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => s.id === serverId ? { ...s, settings: { ...s.settings, ...settings } } : s)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateMemberRole: async (serverId, userId, roleIds) => {
    const state = get();
    const server = state.servers.find(s => s.id === serverId);
    const user = state.users[userId];
    const oldRoles = server?.memberRoles?.[userId] || [];

    try {
      const res = await fetch(`/api/servers/${serverId}/members/${userId}/roles`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ roleIds })
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => 
            s.id === serverId 
              ? { ...s, memberRoles: { ...s.memberRoles, [userId]: roleIds } } 
              : s
          )
        }));
        get().addAuditLog(serverId, 'MEMBER_ROLE_UPDATE', userId, user?.username, [
          { field: 'roles', old: oldRoles, new: roleIds }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  },

  addServerRole: async (serverId, role) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/roles`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => 
            s.id === serverId 
              ? { ...s, roles: [...(s.roles || []), role] } 
              : s
          )
        }));
        get().addAuditLog(serverId, 'ROLE_CREATE', role.id, role.name);
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateServerRole: async (serverId, roleId, role) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/roles/${roleId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ role })
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => 
            s.id === serverId 
              ? { ...s, roles: (s.roles || []).map(r => r.id === roleId ? { ...r, ...role } : r) } 
              : s
          )
        }));
        get().addAuditLog(serverId, 'ROLE_UPDATE', roleId, role.name);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteServerRole: async (serverId, roleId) => {
    const roleName = get().servers.find(s => s.id === serverId)?.roles.find(r => r.id === roleId)?.name;
    try {
      const res = await fetch(`/api/servers/${serverId}/roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => 
            s.id === serverId 
              ? { ...s, roles: (s.roles || []).filter(r => r.id !== roleId) } 
              : s
          )
        }));
        get().addAuditLog(serverId, 'ROLE_DELETE', roleId, roleName);
      }
    } catch (e) {
      console.error(e);
    }
  },

  addChannel: async (serverId, categoryId, name, type, isStage) => {
    try {
      const res = await fetch('/api/channels', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ serverId, categoryId, name, type, isStage })
      });
      if (res.ok) {
        const newChannel = await res.json();
        set((state) => ({
          channels: [...state.channels, newChannel]
        }));
        get().addAuditLog(serverId, 'CHANNEL_CREATE', newChannel.id, name);
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateChannel: async (channelId, updates) => {
    const channel = get().channels.find(c => c.id === channelId);
    try {
      const res = await fetch(`/api/channels/${channelId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set((state) => ({
          channels: state.channels.map(c => c.id === channelId ? { ...c, ...updates } : c)
        }));
        if (channel) get().addAuditLog(channel.serverId, 'CHANNEL_UPDATE', channelId, updates.name || channel.name);
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteChannel: async (channelId) => {
    const channel = get().channels.find(c => c.id === channelId);
    try {
      const res = await fetch(`/api/channels/${channelId}`, { 
        method: 'DELETE',
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        set((state) => ({
          channels: state.channels.filter(c => c.id !== channelId)
        }));
        if (channel) get().addAuditLog(channel.serverId, 'CHANNEL_DELETE', channelId, channel.name);
      }
    } catch (e) {
      console.error(e);
    }
  },

  addCategory: async (serverId, name) => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ serverId, name })
      });
      if (res.ok) {
        const newCat = await res.json();
        set((state) => ({
          categories: [...state.categories, newCat]
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  updateCategory: async (categoryId, updates) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        set((state) => ({
          categories: state.categories.map(c => c.id === categoryId ? { ...c, ...updates } : c)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  deleteCategory: async (categoryId) => {
    try {
      const res = await fetch(`/api/categories/${categoryId}`, { 
        method: 'DELETE',
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        set((state) => ({
          categories: state.categories.filter(c => c.id !== categoryId),
          channels: state.channels.filter(c => c.categoryId !== categoryId)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  reorderServers: (serverIds) => set((state) => {
    const serversMap = new Map(state.servers.map(s => [s.id, s]));
    const newServers = serverIds.map(id => serversMap.get(id)).filter(Boolean) as Server[];
    // Append any servers not in the list (e.g., missed during drag)
    const existingSet = new Set(serverIds);
    const remaining = state.servers.filter(s => !existingSet.has(s.id));
    // Update sidebarOrder: replace ungrouped server positions with new order
    const folderIds = new Set(state.folders.map(f => f.id));
    const ungroupedInOrder = serverIds.filter(id => !state.folders.some(f => f.serverIds.includes(id)));
    // Rebuild sidebarOrder: keep non-server slots (folders), replace ungrouped server slots in new order
    let ungroupedIdx = 0;
    const newSidebarOrder = state.sidebarOrder.map(id => {
      if (folderIds.has(id)) return id; // keep folder position
      if (ungroupedIdx < ungroupedInOrder.length) return ungroupedInOrder[ungroupedIdx++];
      return id;
    });
    // Append any ungrouped servers not yet in sidebarOrder
    const inOrder = new Set(newSidebarOrder);
    ungroupedInOrder.forEach(id => { if (!inOrder.has(id)) newSidebarOrder.push(id); });
    return { servers: [...newServers, ...remaining], sidebarOrder: newSidebarOrder };
  }),

  reorderCategories: (serverId, categoryIds) => set((state) => {
    return {
      categories: state.categories.map(c => {
        if (c.serverId !== serverId) return c;
        const newOrder = categoryIds.indexOf(c.id);
        return newOrder !== -1 ? { ...c, order: newOrder } : c;
      })
    };
  }),

  reorderChannels: (categoryId, channelIds) => set((state) => {
    return {
      channels: state.channels.map(c => {
        if (c.categoryId !== categoryId) return c;
        const newOrder = channelIds.indexOf(c.id);
        return newOrder !== -1 ? { ...c, order: newOrder } : c;
      })
    };
  }),

  moveChannelToCategory: (channelId, newCategoryId) => set((state) => ({
    channels: state.channels.map(c => c.id === channelId ? { ...c, categoryId: newCategoryId } : c)
  })),

  addAuditLog: (serverId, action, targetId, targetName, changes) => set((state) => ({
    servers: state.servers.map(s => 
      s.id === serverId 
        ? { 
            ...s, 
            auditLogs: [
              { id: `log_${Date.now()}`, action, executorId: state.currentUser?.id || 'u1', targetId, targetName, changes, timestamp: new Date().toISOString() },
              ...(s.auditLogs || [])
            ].slice(0, 50) 
          } 
        : s
    )
  })),

  kickMember: async (serverId, userId) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/kick`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => 
            s.id === serverId 
              ? { ...s, members: s.members.filter(id => id !== userId) } 
              : s
          )
        }));
        const user = get().users[userId];
        get().addAuditLog(serverId, 'MEMBER_KICK', userId, user?.username);
      }
    } catch (e) {
      console.error(e);
    }
  },

  banMember: async (serverId, userId) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/ban`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ userId })
      });
      if (res.ok) {
        set((state) => ({
          servers: state.servers.map(s => 
            s.id === serverId 
              ? { ...s, members: s.members.filter(id => id !== userId) } 
              : s
          )
        }));
        const user = get().users[userId];
        get().addAuditLog(serverId, 'MEMBER_BAN', userId, user?.username);
      }
    } catch (e) {
      console.error(e);
    }
  },

  transferOwnership: (serverId, newOwnerId) => set((state) => ({
    servers: state.servers.map(s => 
      s.id === serverId ? { ...s, ownerId: newOwnerId } : s
    )
  })),

  joinServer: async (serverId) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/join`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        const { server } = await res.json();
        set((state) => ({
          servers: state.servers.map(s => s.id === serverId ? server : s)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  leaveServer: async (serverId) => {
    try {
      const res = await fetch(`/api/servers/${serverId}/leave`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        set((state) => {
          const remainingServers = state.servers.filter(s => s.id !== serverId);
          const nextActiveId = remainingServers.length > 0 ? remainingServers[0].id : null;
          return {
            servers: remainingServers,
            activeServerId: state.activeServerId === serverId ? nextActiveId : state.activeServerId,
            channels: state.channels.filter(c => c.serverId !== serverId),
            categories: state.categories.filter(c => c.serverId !== serverId),
          };
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  getPermissions: (serverId, userId) => {
    const server = get().servers.find(s => s.id === serverId);
    if (!server) return [];
    if (server.ownerId === userId) return ['ADMIN', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MENTION_EVERYONE', 'MANAGE_MESSAGES'];
    
    const userRolesIds = server.memberRoles[userId] || [];
    const userRoles = server.roles.filter(r => userRolesIds.includes(r.id));
    
    const perms = new Set<string>();
    userRoles.forEach(r => {
      if (r.permissions.includes('ADMIN')) {
        ['ADMIN', 'MANAGE_SERVER', 'MANAGE_CHANNELS', 'MANAGE_ROLES', 'KICK_MEMBERS', 'BAN_MEMBERS', 'MENTION_EVERYONE', 'MANAGE_MESSAGES'].forEach(p => perms.add(p));
      } else {
        r.permissions.forEach(p => perms.add(p));
      }
    });
    
    return Array.from(perms);
  },

  toggleArchiveThread: (threadId) => set((state) => ({
    threads: state.threads.map(t => t.id === threadId ? { ...t, isArchived: !t.isArchived } : t)
  })),

  togglePrivateThread: (threadId) => set((state) => ({
    threads: state.threads.map(t => t.id === threadId ? { ...t, isPrivate: !t.isPrivate } : t)
  })),

  createWebhook: (serverId, channelId, name) => set((state) => ({
    webhooks: [...state.webhooks, {
      id: `wh_${Date.now()}`,
      name,
      serverId,
      channelId,
      token: Math.random().toString(36).substr(2, 16),
      createdBy: state.currentUser?.id || 'u1'
    }]
  })),

  deleteWebhook: (webhookId) => set((state) => ({
    webhooks: state.webhooks.filter(w => w.id !== webhookId)
  })),
});
