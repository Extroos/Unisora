import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { MOCK_MESSAGES } from '../../lib/mockData';
import { Message, DmChannel } from '../../types';
import { extractLinks, fetchLinkPreview, LinkPreview } from '../../lib/linkUtils';

export interface ChatSlice {
  messages: Message[];
  pinnedMessageIds: string[];
  editingMessageId: string | null;
  replyingToMessageId: string | null;
  drafts: Record<string, string>;
  dmChannels: Record<string, DmChannel>;

  socket: any | null;
  typingUsers: Record<string, string[]>;
  setSocket: (socket: any | null) => void;
  sendTyping: (channelId: string, isTyping: boolean) => void;

  createGroupDm: (participantIds: string[]) => Promise<string | null>;
  leaveGroupDm: (dmId: string) => void;
  renameGroupDm: (dmId: string, name: string) => void;
  changeGroupDmAvatar: (dmId: string, avatarUrl: string) => void;
  addParticipantsToGroup: (dmId: string, participantIds: string[]) => void;
  removeParticipantFromGroup: (dmId: string, userId: string) => void;

  addMessage: (content: string, channelId: string, attachments?: Message['attachments'], replyToId?: string, poll?: Message['poll']) => Promise<Message | null>;
  deleteMessage: (messageId: string) => void;
  editMessage: (messageId: string, newContent: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
  togglePinMessage: (messageId: string) => void;
  voteInPoll: (messageId: string, optionId: string) => void;
  setDraft: (id: string, content: string) => void;
  setEditingMessageId: (id: string | null) => void;
  setReplyingToMessageId: (id: string | null) => void;
}

export const createChatSlice: StateCreator<AppState, [], [], ChatSlice> = (set, get) => ({
  messages: [],
  pinnedMessageIds: [],
  editingMessageId: null,
  replyingToMessageId: null,
  drafts: {},
  dmChannels: {},
  socket: null,
  typingUsers: {},

  setSocket: (socket) => set({ socket }),

  sendTyping: (channelId, isTyping) => {
    const socket = get().socket;
    if (socket && socket.readyState === 1) { // WebSocket.OPEN is 1
      socket.send(JSON.stringify({
        type: 'typing',
        channelId,
        isTyping
      }));
    }
  },

  createGroupDm: async (participantIds) => {
    try {
      const res = await fetch('/api/dm-channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds })
      });
      if (res.ok) {
        const newDm = await res.json();
        set((state) => ({ dmChannels: { ...state.dmChannels, [newDm.id]: newDm } }));
        return newDm.id;
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  },

  leaveGroupDm: async (dmId) => {
    try {
      await fetch(`/api/dm-channels/${dmId}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
    set((state) => {
      const newDms = { ...state.dmChannels };
      delete newDms[dmId];
      const newActiveDmId = state.activeDmId === dmId ? null : state.activeDmId;
      return { 
        dmChannels: newDms,
        activeDmId: newActiveDmId
      };
    });
  },

  renameGroupDm: async (dmId, name) => {
    try {
      await fetch(`/api/dm-channels/${dmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      });
    } catch (e) {
      console.error(e);
    }
    set((state) => ({
      dmChannels: {
        ...state.dmChannels,
        [dmId]: state.dmChannels[dmId] ? { ...state.dmChannels[dmId], name } : state.dmChannels[dmId]
      }
    }));
  },

  addParticipantsToGroup: async (dmId, participantIds) => {
    const dm = get().dmChannels[dmId];
    if (!dm) return;
    const allParticipants = Array.from(new Set([...dm.participants, ...participantIds]));
    if (allParticipants.length > 10) return;
    
    try {
      await fetch(`/api/dm-channels/${dmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: allParticipants })
      });
    } catch (e) {
      console.error(e);
    }
    set((state) => ({
      dmChannels: {
        ...state.dmChannels,
        [dmId]: { ...dm, participants: allParticipants }
      }
    }));
  },

  removeParticipantFromGroup: async (dmId, userId) => {
    const dm = get().dmChannels[dmId];
    if (!dm) return;
    const newParticipants = dm.participants.filter(id => id !== userId);
    
    try {
      await fetch(`/api/dm-channels/${dmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participants: newParticipants })
      });
    } catch (e) {
      console.error(e);
    }
    set((state) => ({
      dmChannels: {
        ...state.dmChannels,
        [dmId]: { ...dm, participants: newParticipants }
      }
    }));
  },

  changeGroupDmAvatar: async (dmId, avatarUrl) => {
    const dm = get().dmChannels[dmId];
    if (!dm) return;
    try {
      const res = await fetch(`/api/dm-channels/${dmId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatarUrl })
      });
      if (res.ok) {
        const updatedDm = await res.json();
        set((state) => ({
          dmChannels: {
            ...state.dmChannels,
            [dmId]: updatedDm
          }
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  addMessage: async (content, channelId, attachments, replyToId, poll) => {
    const tempId = `temp-${Date.now()}`;
    const myId = get().currentUser?.id || 'u1';
    const tempMessage: Message = {
      id: tempId,
      channelId,
      userId: myId,
      content,
      timestamp: new Date().toISOString(),
      attachments,
      replyToId,
      poll,
      isSending: true
    };

    set((state) => ({
      messages: [...state.messages, tempMessage]
    }));

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        },
        body: JSON.stringify({ content, channelId, attachments, replyToId, poll })
      });
      if (res.ok) {
        const newMessage = await res.json();
        const links = extractLinks(content);
        
        set((state) => ({
          messages: state.messages.map(m => m.id === tempId ? newMessage : m)
        }));

        if (links.length > 0) {
          const previews = await Promise.all(links.map(l => fetchLinkPreview(l)));
          const filteredPreviews = previews.filter((p): p is LinkPreview => p !== null);
          
          if (filteredPreviews.length > 0) {
            set((state) => ({
              messages: state.messages.map(m =>
                m.id === newMessage.id ? { ...m, linkPreviews: filteredPreviews } : m
              )
            }));
          }
        }
        return newMessage;
      } else {
        set((state) => ({
          messages: state.messages.filter(m => m.id !== tempId)
        }));
        return null;
      }
    } catch (e) {
      console.error(e);
      set((state) => ({
        messages: state.messages.filter(m => m.id !== tempId)
      }));
      return null;
    }
  },

  deleteMessage: async (messageId) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, { 
        method: 'DELETE',
        headers: {
          'Session-User-Id': localStorage.getItem('session_user_id') || ''
        }
      });
      if (res.ok) {
        set((state) => ({
          messages: state.messages.filter(m => m.id !== messageId)
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  editMessage: async (messageId, newContent) => {
    try {
      const res = await fetch(`/api/messages/${messageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newContent })
      });
      if (res.ok) {
        set((state) => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, content: newContent, editedAt: new Date().toISOString() } : m
          ),
          editingMessageId: null
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  toggleReaction: async (messageId, emoji) => {
    const myId = get().currentUser?.id || 'u1';
    try {
      const res = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji })
      });
      if (res.ok) {
        set((state) => ({
          messages: state.messages.map(m => {
            if (m.id !== messageId) return m;
            const reactions = m.reactions ? [...m.reactions] : [];
            const existing = reactions.find(r => r.emoji === emoji);
            if (existing) {
              if (existing.userIds.includes(myId)) {
                existing.userIds = existing.userIds.filter(id => id !== myId);
                existing.count--;
                if (existing.count <= 0) return { ...m, reactions: reactions.filter(r => r.emoji !== emoji) };
                return { ...m, reactions };
              } else {
                existing.userIds.push(myId);
                existing.count++;
                return { ...m, reactions };
              }
            } else {
              reactions.push({ emoji, count: 1, userIds: [myId] });
              return { ...m, reactions };
            }
          })
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  togglePinMessage: async (messageId) => {
    try {
      const res = await fetch(`/api/messages/${messageId}/pin`, {
        method: 'POST'
      });
      if (res.ok) {
        set((state) => ({
          messages: state.messages.map(m =>
            m.id === messageId ? { ...m, pinned: !m.pinned } : m
          )
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  voteInPoll: async (messageId, optionId) => {
    const myId = get().currentUser?.id || 'u1';
    try {
      const res = await fetch(`/api/messages/${messageId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId })
      });
      if (res.ok) {
        set((state) => ({
          messages: state.messages.map(msg => {
            if (msg.id !== messageId || !msg.poll) return msg;
            
            const newOptions = msg.poll.options.map(opt => {
              const isSelected = opt.id === optionId;
              const wasAlreadyVoted = opt.voterIds.includes(myId);
              
              if (isSelected) {
                if (wasAlreadyVoted) {
                  return {
                    ...opt,
                    voteCount: opt.voteCount - 1,
                    voterIds: opt.voterIds.filter(id => id !== myId)
                  };
                } else {
                  return {
                    ...opt,
                    voteCount: opt.voteCount + 1,
                    voterIds: [...opt.voterIds, myId]
                  };
                }
              } else if (!msg.poll?.allowMultiple) {
                if (opt.voterIds.includes(myId)) {
                  return {
                    ...opt,
                    voteCount: opt.voteCount - 1,
                    voterIds: opt.voterIds.filter(id => id !== myId)
                  };
                }
              }
              return opt;
            });

            return { ...msg, poll: { ...msg.poll, options: newOptions } };
          })
        }));
      }
    } catch (e) {
      console.error(e);
    }
  },

  setDraft: (id, content) => set((state) => ({
    drafts: { ...state.drafts, [id]: content }
  })),

  setEditingMessageId: (id) => set({ editingMessageId: id }),
  setReplyingToMessageId: (id) => set({ replyingToMessageId: id }),
});
