import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, Maximize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export function CallOverlay() {
  const { 
    callState, 
    users, 
    acceptCall, 
    declineCall, 
    hangupCall, 
    toggleCallMic, 
    toggleCallVideo, 
    remoteStream,
    localStream,
    isScreenSharing,
    startScreenShare,
    stopScreenShare
  } = useAppStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const ringtoneIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [duration, setDuration] = useState(0);

  const callee = callState.userId ? users[callState.userId] : null;

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (callState.status === 'connected') {
      setDuration(0);
      timer = setInterval(() => {
        setDuration(d => d + 1);
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(timer);
  }, [callState.status]);

  useEffect(() => {
    if (callState.status === 'ringing' || callState.status === 'calling') {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const playRingtone = () => {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const now = audioCtx.currentTime;
        
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc1.frequency.setValueAtTime(440, now);
        osc2.frequency.setValueAtTime(480, now);
        
        gainNode.gain.setValueAtTime(0.08, now);
        gainNode.gain.setValueAtTime(0.08, now + 0.4);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        
        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.8);
        osc2.stop(now + 0.8);
      };

      playRingtone();
      ringtoneIntervalRef.current = setInterval(playRingtone, 2000);
    } else {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    }

    return () => {
      if (ringtoneIntervalRef.current) {
        clearInterval(ringtoneIntervalRef.current);
        ringtoneIntervalRef.current = null;
      }
    };
  }, [callState.status]);

  useEffect(() => {
    if (remoteStream) {
      if (callState.type === 'video' && videoRef.current) {
        videoRef.current.srcObject = remoteStream;
      } else if (audioRef.current) {
        audioRef.current.srcObject = remoteStream;
      }
    }
  }, [remoteStream, callState.type]);

  if (callState.status === 'idle') return null;

  const formatDuration = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#111214] font-sans text-text-primary animate-scale-in select-none">
      
      {/* Sleek radial gradient background decoration */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(88,101,242,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Main Calling Stage */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 relative min-h-0">
        
        {/* Ringing/Calling state */}
        {(callState.status === 'calling' || callState.status === 'ringing') && (
          <div className="flex flex-col items-center justify-center space-y-6 text-center z-10">
            <div className="relative">
              {/* Discord-like expanding pulse rings */}
              <div className="absolute -inset-8 bg-accent/10 rounded-full animate-ping opacity-60" />
              <div className="absolute -inset-4 bg-accent/20 rounded-full animate-pulse" />
              <div className="relative p-1.5 bg-surface-2 rounded-[32px] border border-white/10 shadow-2xl">
                <img src={callee?.avatarUrl} alt="" className="w-32 h-32 rounded-[26px] object-cover" />
              </div>
            </div>
            
            <div className="space-y-1">
              <h2 className="text-3xl font-black tracking-tight text-white">{callee?.username || 'Private Space'}</h2>
              <p className="text-xs font-bold text-accent tracking-widest uppercase animate-pulse">
                {callState.status === 'calling' && 'Calling...'}
                {callState.status === 'ringing' && 'Incoming Call...'}
              </p>
            </div>
          </div>
        )}

        {/* Connected Voice-Only Call (Audio) */}
        {callState.status === 'connected' && callState.type === 'audio' && !isScreenSharing && (
          <div className="flex flex-col items-center justify-center space-y-6 text-center z-10">
            <div className="relative">
              <div className="absolute -inset-4 bg-success/10 rounded-full animate-pulse" />
              <div className="relative p-1.5 bg-surface-2 rounded-[32px] border border-success/20 shadow-2xl">
                <img src={callee?.avatarUrl} alt="" className="w-32 h-32 rounded-[26px] object-cover" />
              </div>
              {/* Mic state badge on avatar */}
              {callState.isMicMuted && (
                <div className="absolute -bottom-2 -right-2 bg-danger border border-white/10 p-1.5 rounded-xl shadow-lg text-white">
                  <MicOff size={14} />
                </div>
              )}
            </div>
            
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white">{callee?.username || 'Private Space'}</h2>
              <div className="flex items-center justify-center gap-2 text-xs text-text-tertiary">
                <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                <span>Voice Connected — {formatDuration(duration)}</span>
              </div>
            </div>

            {/* Soundwave Bouncing Bar Visualizer */}
            <div className="flex items-center gap-1 h-8 mt-4">
              <div className="w-1.5 bg-accent/40 rounded-full animate-bounce" style={{ height: '50%', animationDelay: '0.1s' }} />
              <div className="w-1.5 bg-accent rounded-full animate-bounce" style={{ height: '80%', animationDelay: '0.2s' }} />
              <div className="w-1.5 bg-accent/80 rounded-full animate-bounce" style={{ height: '40%', animationDelay: '0.3s' }} />
              <div className="w-1.5 bg-accent rounded-full animate-bounce" style={{ height: '90%', animationDelay: '0.4s' }} />
              <div className="w-1.5 bg-accent/60 rounded-full animate-bounce" style={{ height: '60%', animationDelay: '0.5s' }} />
            </div>

            <audio ref={audioRef} autoPlay playsInline />
          </div>
        )}

        {/* Connected Video / Screen Share Call */}
        {callState.status === 'connected' && (callState.type === 'video' || isScreenSharing) && (
          <div className="w-full h-full max-w-6xl max-h-[75vh] bg-surface-0 border border-white/5 rounded-3xl overflow-hidden shadow-2xl relative flex items-center justify-center group/video">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
            
            {/* Local Preview Picture-in-Picture Box */}
            {localStream && (
              <div className="absolute bottom-4 right-4 w-44 aspect-video bg-surface-2 rounded-2xl overflow-hidden border border-white/10 shadow-2xl z-20 group-hover/video:-translate-y-2 transition-transform duration-300">
                <video 
                  ref={(el) => {
                    if (el) el.srcObject = localStream;
                  }}
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 text-[9px] text-white px-2 py-0.5 rounded backdrop-blur-sm">You</div>
              </div>
            )}
            
            {/* Top Indicator */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 text-xs text-white px-3 py-1 rounded-full backdrop-blur-md border border-white/5 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
              <span>{isScreenSharing ? 'Screen Sharing' : `Call with ${callee?.username}`}</span>
            </div>
          </div>
        )}
      </div>

      {/* Floating Call Action Control HUD Bar */}
      <div className="p-8 flex items-center justify-center shrink-0 relative z-30">
        <div className="flex items-center gap-4 bg-[#111214]/80 px-6 py-4 rounded-3xl border border-white/5 shadow-2xl backdrop-blur-xl animate-fade-in-up">
          
          {callState.status === 'ringing' ? (
            <>
              <button 
                onClick={acceptCall}
                className="w-14 h-14 rounded-2xl bg-success text-white flex items-center justify-center hover:scale-105 hover:bg-success/90 transition-all shadow-lg shadow-success/10 cursor-pointer"
                title="Accept Call"
              >
                <Phone size={24} />
              </button>
              <button 
                onClick={declineCall}
                className="w-14 h-14 rounded-2xl bg-danger text-white flex items-center justify-center hover:scale-105 hover:bg-danger/90 transition-all shadow-lg shadow-danger/10 cursor-pointer"
                title="Decline Call"
              >
                <PhoneOff size={24} />
              </button>
            </>
          ) : (
            <>
              {callState.status === 'connected' && (
                <>
                  <button 
                    onClick={toggleCallMic}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border cursor-pointer",
                      callState.isMicMuted 
                        ? 'bg-danger border-danger/20 text-white hover:bg-danger/90' 
                        : 'bg-surface-3 border-white/5 text-text-secondary hover:bg-surface-4 hover:text-white'
                    )}
                    title={callState.isMicMuted ? 'Unmute Mic' : 'Mute Mic'}
                  >
                    {callState.isMicMuted ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                  
                  {callState.type === 'video' && (
                    <button 
                      onClick={toggleCallVideo}
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border cursor-pointer",
                        callState.isVideoOff 
                          ? 'bg-surface-4 border-white/5 text-text-muted hover:bg-surface-5 hover:text-text-secondary' 
                          : 'bg-surface-3 border-white/5 text-text-secondary hover:bg-surface-4 hover:text-white'
                      )}
                      title={callState.isVideoOff ? 'Turn Video On' : 'Turn Video Off'}
                    >
                      {callState.isVideoOff ? <VideoOff size={18} /> : <Video size={18} />}
                    </button>
                  )}

                  <button 
                    onClick={isScreenSharing ? stopScreenShare : startScreenShare}
                    className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-all border cursor-pointer",
                      isScreenSharing 
                        ? 'bg-success border-success/20 text-white hover:bg-success/90 animate-pulse' 
                        : 'bg-surface-3 border-white/5 text-text-secondary hover:bg-surface-4 hover:text-white'
                    )}
                    title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                  >
                    <Maximize2 size={18} />
                  </button>
                </>
              )}
              
              <button 
                onClick={hangupCall}
                className="w-14 h-14 rounded-2xl bg-danger text-white flex items-center justify-center hover:scale-105 hover:bg-danger/90 transition-all shadow-lg shadow-danger/15 cursor-pointer"
                title="End Call"
              >
                <PhoneOff size={24} />
              </button>
            </>
          )}

        </div>
      </div>

    </div>
  );
}
