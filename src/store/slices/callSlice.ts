import { StateCreator } from 'zustand';
import { AppState } from '../useAppStore';
import { CallLog } from '../../types';

export interface CallSlice {
  callState: {
    isActive: boolean;
    status: 'idle' | 'calling' | 'ringing' | 'connected';
    type: 'audio' | 'video';
    isMicMuted: boolean;
    isVideoOff: boolean;
    userId: string | null;
    startTime?: number;
    joinedUserIds?: string[];
  };
  callLogs: CallLog[];
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isScreenSharing: boolean;
  isRemoteScreenSharing: boolean;

  startCall: (userId: string, type: 'audio' | 'video') => void;
  receiveCall: (userId: string, type: 'audio' | 'video', channelId?: string) => void;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  hangupCall: () => void;
  handleWebrtcSignal: (senderUserId: string, signal: any) => Promise<void>;
  toggleCallMic: () => void;
  toggleCallVideo: () => void;
  clearCallHistory: (userId: string) => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
  initiateHandshake: () => Promise<void>;
}

let localStream: MediaStream | null = null;
let peerConnection: RTCPeerConnection | null = null;
let queuedCandidates: any[] = [];



function createPeerConnection(targetUserId: string, socket: any, onTrack: (stream: MediaStream) => void) {
  const pc = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  });

  pc.onicecandidate = (event) => {
    if (event.candidate && socket && socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'webrtc_signal',
        targetUserId,
        signal: { candidate: event.candidate }
      }));
    }
  };

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onTrack(event.streams[0]);
    }
  };

  if (localStream) {
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream!);
    });
  }

  peerConnection = pc;
  return pc;
}

export const createCallSlice: StateCreator<AppState, [], [], CallSlice> = (set, get) => ({
  callState: {
    isActive: false,
    status: 'idle',
    type: 'audio',
    isMicMuted: false,
    isVideoOff: true,
    userId: null,
    joinedUserIds: [],
  },
  callLogs: [],
  localStream: null,
  remoteStream: null,
  isScreenSharing: false,
  isRemoteScreenSharing: false,

  startCall: async (userId, type) => {
    const socket = get().socket;
    let acquiredStream: MediaStream | null = null;
    
    try {
      const audioVideoConstraints = {
        audio: true,
        video: type === 'video'
      };
      acquiredStream = await navigator.mediaDevices.getUserMedia(audioVideoConstraints);
      localStream = acquiredStream;

      // Create PeerConnection immediately on startCall
      createPeerConnection(userId, socket, (stream) => {
        set({ remoteStream: stream });
      });
    } catch (err) {
      console.error('Failed to get media for starting call:', err);
      throw err;
    }

    if (socket && socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'call_user',
        targetUserId: userId,
        callType: type
      }));
    }

    const myId = get().currentUser?.id || 'u1';
    const isGroup = userId.startsWith('dm-');
    const initialJoined = [myId];

    set({
      localStream: acquiredStream,
      callState: {
        isActive: true,
        status: 'calling',
        type,
        isMicMuted: false,
        isVideoOff: type === 'audio',
        userId,
        startTime: Date.now(),
        joinedUserIds: initialJoined
      }
    });

    if (isGroup) {
      // In a real call, other users stay in ringing state until they accept or decline.
      // We no longer simulate auto-joins via timeouts.
    }

    // Add call log message to history
    const activeDmId = get().activeDmId;
    if (activeDmId) {
      const channelId = get().dmChannels[activeDmId] ? activeDmId : `dm-${[myId, activeDmId].sort().join('-')}`;
      get().addMessage('[CALL_START]', channelId);
    }
  },

  receiveCall: (userId, type, channelId) => {
    const targetId = channelId || userId;
    const callerJoinedList = [userId]; // Caller is already joined
    set({
      callState: {
        isActive: false,
        status: 'ringing',
        type,
        isMicMuted: false,
        isVideoOff: type === 'audio',
        userId: targetId,
        joinedUserIds: callerJoinedList
      }
    });
  },

  acceptCall: async () => {
    const state = get();
    const socket = state.socket;
    const targetUserId = state.callState.userId;
    if (!targetUserId) return;

    try {
      const audioVideoConstraints = {
        audio: true,
        video: state.callState.type === 'video'
      };
      localStream = await navigator.mediaDevices.getUserMedia(audioVideoConstraints);
      set({ localStream });

      // Create PeerConnection immediately on acceptCall
      createPeerConnection(targetUserId, socket, (stream) => {
        set({ remoteStream: stream });
      });

      // Send call_accept to tell the caller we are ready to receive their offer
      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'call_accept',
          targetUserId
        }));
      }

      const myId = state.currentUser?.id || 'u1';
      const isGroup = targetUserId.startsWith('dm-');
      let joined = [myId];
      if (isGroup) {
        const existingJoined = state.callState.joinedUserIds || [];
        joined = Array.from(new Set([...existingJoined, myId]));
      }

      set((s) => ({
        callState: {
          ...s.callState,
          isActive: true,
          status: 'connected',
          startTime: Date.now(),
          joinedUserIds: joined
        }
      }));
    } catch (err) {
      console.error('Failed to get media or start connection:', err);
      get().hangupCall();
      throw err;
    }
  },

  declineCall: () => {
    const state = get();
    const socket = state.socket;
    const targetUserId = state.callState.userId;
    if (targetUserId && socket && socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'call_decline',
        targetUserId
      }));
    }
    set({
      callState: { isActive: false, status: 'idle', type: 'audio', isMicMuted: false, isVideoOff: false, userId: null, joinedUserIds: [] },
      isRemoteScreenSharing: false,
    });
  },

  hangupCall: () => {
    const state = get();
    const socket = state.socket;
    const targetUserId = state.callState.userId;
    if (targetUserId && socket && socket.readyState === 1) {
      socket.send(JSON.stringify({
        type: 'call_hangup',
        targetUserId
      }));
    }

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }
    if (peerConnection) {
      peerConnection.close();
      peerConnection = null;
    }

    let duration = 0;
    if (state.callState.startTime) {
      duration = Math.floor((Date.now() - state.callState.startTime) / 1000);
    }
    const newLog: CallLog = {
      id: `call_${Date.now()}`,
      userId: targetUserId || 'unknown',
      type: state.callState.type,
      timestamp: new Date().toISOString(),
      duration,
      missed: state.callState.status === 'calling' || state.callState.status === 'ringing'
    };

    // Add call log message to history by editing the existing CALL_START message
    if (targetUserId) {
      const myId = state.currentUser?.id || 'u1';
      const channelId = state.dmChannels[targetUserId] ? targetUserId : `dm-${[myId, targetUserId].sort().join('-')}`;
      
      const channelMessages = state.messages
        .filter(m => m.channelId === channelId)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
      const lastStartMsg = [...channelMessages].reverse().find(m => m.content === '[CALL_START]');
      if (lastStartMsg) {
        state.editMessage(lastStartMsg.id, `[CALL_END:${duration}]`);
      } else {
        state.addMessage(`[CALL_END:${duration}]`, channelId);
      }
    }

    set((s) => ({
      callState: { isActive: false, status: 'idle', type: 'audio', isMicMuted: false, isVideoOff: false, userId: null, joinedUserIds: [] },
      localStream: null,
      remoteStream: null,
      isScreenSharing: false,
      isRemoteScreenSharing: false,
      callLogs: [newLog, ...(s.callLogs || [])].slice(0, 50)
    }));
  },

  handleWebrtcSignal: async (senderUserId, signal) => {
    const socket = get().socket;
    if (signal.screenShare !== undefined) {
      set({ isRemoteScreenSharing: signal.screenShare });
      return;
    }
    if (!get().callState.isActive) {
      console.log('Ignoring WebRTC signal because call is not active.');
      return;
    }
    if (!peerConnection) {
      try {
        if (!localStream) {
          const audioVideoConstraints = {
            audio: true,
            video: get().callState.type === 'video'
          };
          localStream = await navigator.mediaDevices.getUserMedia(audioVideoConstraints);
          set({ localStream });
        }
        
        createPeerConnection(senderUserId, socket, (stream) => {
          set({ remoteStream: stream });
        });
      } catch (err) {
        console.error('Failed to get media stream on incoming signal:', err);
        return;
      }
    }

    const pc = peerConnection!;
    if (signal.sdp) {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      
      // Process queued candidates now that remote description is set
      if (queuedCandidates.length > 0) {
        for (const candidate of queuedCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Failed to add queued ICE candidate', e);
          }
        }
        queuedCandidates = [];
      }

      if (signal.sdp.type === 'offer') {
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        if (socket && socket.readyState === 1) {
          socket.send(JSON.stringify({
            type: 'webrtc_signal',
            targetUserId: senderUserId,
            signal: { sdp: pc.localDescription }
          }));
        }
        set((s) => ({
          callState: {
            ...s.callState,
            status: 'connected',
            startTime: Date.now()
          }
        }));
      }
    } else if (signal.candidate) {
      try {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } else {
          queuedCandidates.push(signal.candidate);
        }
      } catch (e) {
        console.error('Failed to add ICE candidate', e);
      }
    }
  },

  toggleCallMic: () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
    }
    set((state) => ({
      callState: { ...state.callState, isMicMuted: !state.callState.isMicMuted }
    }));
  },

  toggleCallVideo: async () => {
    const state = get();
    const isVideoOff = !state.callState.isVideoOff;
    
    // If turning video ON but localStream doesn't have a video track, request camera access
    if (!isVideoOff && localStream && localStream.getVideoTracks().length === 0) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        localStream.addTrack(videoTrack);
        
        if (peerConnection) {
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(videoTrack);
          } else {
            peerConnection.addTrack(videoTrack, localStream);
            await get().initiateHandshake();
          }
        }
      } catch (err) {
        console.error('Failed to dynamically acquire video track:', err);
        throw err;
      }
    } else if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOff;
      });
    }

    set((state) => ({
      callState: { 
        ...state.callState, 
        isVideoOff,
        type: 'video'
      }
    }));
  },

  clearCallHistory: (userId) => set((state) => ({
    callLogs: state.callLogs.filter(log => log.userId !== userId)
  })),

  startScreenShare: async () => {
    const state = get();
    const socket = state.socket;
    const targetUserId = state.callState.userId;
    if (!targetUserId) return;

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = screenStream.getVideoTracks()[0];

      if (peerConnection) {
        const senders = peerConnection.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          await videoSender.replaceTrack(screenTrack);
        } else {
          peerConnection.addTrack(screenTrack, screenStream);
          await get().initiateHandshake();
        }
      }

      screenTrack.onended = () => {
        get().stopScreenShare();
      };

      // Keep existing audio tracks from microphone alive!
      const audioTracks = localStream ? localStream.getAudioTracks() : [];
      const newLocalStream = new MediaStream([screenTrack, ...audioTracks]);
      localStream = newLocalStream;

      set({ 
        localStream: newLocalStream,
        isScreenSharing: true 
      });

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'webrtc_signal',
          targetUserId,
          signal: { screenShare: true }
        }));
      }
    } catch (err) {
      console.error('Failed to share screen:', err);
      throw err;
    }
  },

  stopScreenShare: async () => {
    const state = get();
    const socket = state.socket;
    const targetUserId = state.callState.userId;

    if (state.localStream) {
      // Stop screen sharing video tracks ONLY, do NOT stop mic audio tracks
      state.localStream.getVideoTracks().forEach(t => t.stop());
    }

    const revertToAudioOnly = async () => {
      const audioTracks = localStream ? localStream.getAudioTracks() : [];
      const newLocalStream = new MediaStream([...audioTracks]);
      localStream = newLocalStream;
      
      if (peerConnection) {
        const senders = peerConnection.getSenders();
        const videoSender = senders.find(s => s.track?.kind === 'video');
        if (videoSender) {
          try {
            await videoSender.replaceTrack(null);
          } catch (e) {
            console.error('Failed to replace track with null:', e);
          }
        }
      }

      set({ 
        localStream: newLocalStream,
        isScreenSharing: false 
      });

      if (targetUserId && socket && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'webrtc_signal',
          targetUserId,
          signal: { screenShare: false }
        }));
      }
    };

    if (state.callState.type === 'video') {
      try {
        const cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const cameraTrack = cameraStream.getVideoTracks()[0];
        
        const audioTracks = localStream ? localStream.getAudioTracks() : [];
        const newLocalStream = new MediaStream([cameraTrack, ...audioTracks]);
        localStream = newLocalStream;
        
        if (peerConnection) {
          const senders = peerConnection.getSenders();
          const videoSender = senders.find(s => s.track?.kind === 'video');
          if (videoSender) {
            await videoSender.replaceTrack(cameraTrack);
          }
        }

        set({ 
          localStream: newLocalStream,
          isScreenSharing: false 
        });

        if (targetUserId && socket && socket.readyState === 1) {
          socket.send(JSON.stringify({
            type: 'webrtc_signal',
            targetUserId,
            signal: { screenShare: false }
          }));
        }
      } catch (err) {
        console.error('Failed to revert to camera stream, falling back to audio only:', err);
        await revertToAudioOnly();
      }
    } else {
      await revertToAudioOnly();
    }
  },

  initiateHandshake: async () => {
    const state = get();
    const socket = state.socket;
    const targetUserId = state.callState.userId;
    if (!targetUserId || !peerConnection) return;

    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      if (socket && socket.readyState === 1) {
        socket.send(JSON.stringify({
          type: 'webrtc_signal',
          targetUserId,
          signal: { sdp: peerConnection.localDescription }
        }));
      }

      set((s) => ({
        callState: {
          ...s.callState,
          status: 'connected',
          startTime: Date.now()
        }
      }));
    } catch (err) {
      console.error('Failed to initiate WebRTC handshake offer:', err);
    }
  }
});
