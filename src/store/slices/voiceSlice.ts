import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { VoiceState } from '../../types';
import { voiceAudioService } from '../../services/voice/VoiceAudioService';

export interface VoiceConnection {
  userId: string;
  channelId: string;
  isMuted: boolean;
  isDeafened: boolean;
  isSpeaking: boolean;
}

export interface VoiceSlice {
  voiceState: VoiceState;
  voiceConnections: Record<string, VoiceConnection>;
  joinVoiceChannel: (channelId: string) => Promise<void>;
  leaveVoiceChannel: () => Promise<void>;
  toggleMute: () => Promise<void>;
  toggleDeafen: () => Promise<void>;
  setTransmitting: (isTransmitting: boolean) => void;
  requestToSpeak: () => void;
  inviteToStage: (userId: string) => void;
  moveToAudience: (userId: string) => void;
  updateVoiceSettings: (settings: Partial<VoiceState['settings']>) => void;
  updateSpeakingState: (isSpeaking: boolean) => Promise<void>;
}

export const createVoiceSlice: StateCreator<AppState, [], [], VoiceSlice> = (set, get) => ({
  voiceState: {
    channelId: null,
    isMuted: false,
    isDeafened: false,
    isTransmitting: false,
    connectedUsers: [],
    settings: {
      noiseSuppression: true,
      echoCancellation: true,
      inputMode: 'voice-activity',
      inputSensitivity: 50,
      noiseThreshold: -50,
    }
  },
  voiceConnections: {},

  joinVoiceChannel: async (channelId) => {
    // Set connecting status immediately and register user inside the room
    const myId = get().currentUser?.id || 'u1';
    set((state) => {
      const activeId = state.currentUser?.id || 'u1';
      return {
        voiceState: {
          ...state.voiceState,
          channelId,
          isConnecting: true,
          connectedUsers: [...state.voiceState.connectedUsers.filter(id => id !== activeId), activeId],
          isMuted: false,
          isDeafened: false,
        },
        callState: {
          ...state.callState,
          isVideoOff: true,
        },
        voiceConnections: {
          ...state.voiceConnections,
          [activeId]: {
            userId: activeId,
            channelId,
            isMuted: false,
            isDeafened: false,
            isSpeaking: false
          }
        }
      };
    });
    
    // Save to localStorage for browser refresh recovery
    localStorage.setItem('activeVoiceChannelId', channelId);

    try {
      const res = await fetch('/api/voice/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, channelId })
      });
      if (res.ok) {
        const myConn = await res.json();
        
        // Play connect chime
        voiceAudioService.playChime('connect');

        // Start monitoring mic to detect speaking
        voiceAudioService.startMicMonitoring((isSpeaking) => {
          // If deafened or muted, we don't speak
          const state = get();
          const shouldSpeak = isSpeaking && !state.voiceState.isMuted && !state.voiceState.isDeafened;
          state.updateSpeakingState(shouldSpeak);
        });

        set((state) => {
          const activeId = state.currentUser?.id || 'u1';
          return {
            voiceState: {
              ...state.voiceState,
              isConnecting: false,
              connectedUsers: [...state.voiceState.connectedUsers.filter(id => id !== activeId), activeId]
            },
            voiceConnections: {
              ...state.voiceConnections,
              [activeId]: myConn
            }
          };
        });
      }
    } catch (e) {
      console.error('Error joining voice channel:', e);
      // Clean state on failure
      set((state) => ({
        voiceState: {
          ...state.voiceState,
          channelId: null,
          isConnecting: false,
        }
      }));
    }
  },

  leaveVoiceChannel: async () => {
    // Clear recovery item from localStorage
    localStorage.removeItem('activeVoiceChannelId');
    const myId = get().currentUser?.id || 'u1';

    try {
      // Stop mic monitor first
      voiceAudioService.stopMicMonitoring();
      
      // Play disconnect chime
      voiceAudioService.playChime('disconnect');

      await fetch('/api/voice/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId })
      });

      set((state) => {
        const activeId = state.currentUser?.id || 'u1';
        const newConns = { ...state.voiceConnections };
        delete newConns[activeId];
        return {
          voiceState: { 
            ...state.voiceState, 
            channelId: null, 
            isConnecting: false,
            isMuted: false, 
            isDeafened: false, 
            connectedUsers: [] 
          },
          voiceConnections: newConns
        };
      });
    } catch (e) {
      console.error('Error leaving voice channel:', e);
    }
  },

  toggleMute: async () => {
    const state = get();
    const myId = state.currentUser?.id || 'u1';
    const newMuted = !state.voiceState.isMuted;
    
    // Play mute chime
    voiceAudioService.playChime(newMuted ? 'mute' : 'unmute');

    // Synchronously update local state for instant feedback
    set((state) => {
      const activeId = state.currentUser?.id || 'u1';
      const newConns = { ...state.voiceConnections };
      if (newConns[activeId]) {
        newConns[activeId] = { ...newConns[activeId], isMuted: newMuted };
      }
      return {
        voiceState: { ...state.voiceState, isMuted: newMuted },
        voiceConnections: newConns
      };
    });

    try {
      await fetch('/api/voice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, isMuted: newMuted })
      });
    } catch (e) {
      console.error('Error toggling mute:', e);
    }
  },

  toggleDeafen: async () => {
    const state = get();
    const myId = state.currentUser?.id || 'u1';
    const newDeafened = !state.voiceState.isDeafened;
    const newMuted = newDeafened ? true : state.voiceState.isMuted;
    
    // Play mute chime
    voiceAudioService.playChime(newDeafened ? 'mute' : 'unmute');

    // Synchronously update local state for instant feedback
    set((state) => {
      const activeId = state.currentUser?.id || 'u1';
      const newConns = { ...state.voiceConnections };
      if (newConns[activeId]) {
        newConns[activeId] = { 
          ...newConns[activeId], 
          isDeafened: newDeafened,
          isMuted: newMuted
        };
      }
      return {
        voiceState: { 
          ...state.voiceState, 
          isDeafened: newDeafened,
          isMuted: newMuted
        },
        voiceConnections: newConns
      };
    });

    try {
      await fetch('/api/voice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, isDeafened: newDeafened, isMuted: newMuted })
      });
    } catch (e) {
      console.error('Error toggling deafen:', e);
    }
  },

  updateSpeakingState: async (isSpeaking) => {
    const myId = get().currentUser?.id || 'u1';
    try {
      await fetch('/api/voice/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: myId, isSpeaking })
      });
      // We don't manually set state here; we let the bootstrap poll sync it,
      // or we can set it locally for faster feedback:
      set((state) => {
        const activeId = state.currentUser?.id || 'u1';
        if (!state.voiceConnections[activeId]) return {};
        return {
          voiceConnections: {
            ...state.voiceConnections,
            [activeId]: {
              ...state.voiceConnections[activeId],
              isSpeaking
            }
          }
        };
      });
    } catch (e) {
      console.error('Error updating speaking state:', e);
    }
  },

  setTransmitting: (isTransmitting) => set((state) => ({
    voiceState: { ...state.voiceState, isTransmitting }
  })),

  requestToSpeak: () => set((state) => {
    const activeId = state.currentUser?.id || 'u1';
    return {
      voiceState: { 
        ...state.voiceState, 
        stageRequests: state.voiceState.stageRequests?.includes(activeId)
          ? state.voiceState.stageRequests.filter(id => id !== activeId)
          : [...(state.voiceState.stageRequests || []), activeId]
      }
    };
  }),

  inviteToStage: (userId) => set((state) => ({
    voiceState: {
      ...state.voiceState,
      stageSpeakers: [...(state.voiceState.stageSpeakers || []), userId],
      stageRequests: state.voiceState.stageRequests?.filter(id => id !== userId) || []
    }
  })),

  moveToAudience: (userId) => set((state) => ({
    voiceState: {
      ...state.voiceState,
      stageSpeakers: state.voiceState.stageSpeakers?.filter(id => id !== userId) || []
    }
  })),

  updateVoiceSettings: (settings) => set((state) => ({
    voiceState: {
      ...state.voiceState,
      settings: {
        ...state.voiceState.settings!,
        ...settings
      }
    }
  })),
});
