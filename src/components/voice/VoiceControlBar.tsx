import React from 'react';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Settings, MonitorUp, Video, VideoOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VoiceControlBarProps {
  isMuted: boolean;
  isDeafened: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  isStage: boolean;
  isUserSpeaker: boolean;
  hasRequested: boolean;
  toggleMute: () => void;
  toggleDeafen: () => void;
  toggleCallVideo: () => void;
  handleToggleScreenShare: () => void;
  setSettingsOpen: (open: boolean) => void;
  requestToSpeak: () => void;
  leaveVoiceChannel: () => void;
}

export function VoiceControlBar({
  isMuted,
  isDeafened,
  isVideoOff,
  isScreenSharing,
  isStage,
  isUserSpeaker,
  hasRequested,
  toggleMute,
  toggleDeafen,
  toggleCallVideo,
  handleToggleScreenShare,
  setSettingsOpen,
  requestToSpeak,
  leaveVoiceChannel
}: VoiceControlBarProps) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-[#2b2d31] rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.5)] border border-white/5">
      <div className="flex items-center gap-2 pr-4 border-r border-[#3f4147]">
        <ControlBtn 
          icon={isMuted ? <MicOff size={20} /> : <Mic size={20} />}
          active={isMuted}
          danger={isMuted}
          onClick={toggleMute}
          disabled={isStage && !isUserSpeaker}
          tooltip={isMuted ? "Unmute" : "Mute"}
        />
        <ControlBtn 
          icon={isDeafened ? <HeadphoneOff size={20} /> : <Headphones size={20} />}
          active={isDeafened}
          danger={isDeafened}
          onClick={toggleDeafen}
          tooltip={isDeafened ? "Undeafen" : "Deafen"}
        />
      </div>

      <div className="flex items-center gap-2 pr-4 border-r border-[#3f4147] relative">
        <ControlBtn 
          icon={!isVideoOff ? <Video size={20} /> : <VideoOff size={20} />}
          active={!isVideoOff}
          danger={isVideoOff}
          onClick={toggleCallVideo}
          tooltip={!isVideoOff ? 'Turn Off Camera' : 'Turn On Camera'}
        />
        
        <ControlBtn 
          icon={<MonitorUp size={20} />}
          active={isScreenSharing}
          onClick={handleToggleScreenShare}
          tooltip={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
        />

        <ControlBtn 
          icon={<Settings size={20} />}
          onClick={() => setSettingsOpen(true)}
          tooltip="User Settings"
        />
        {isStage && !isUserSpeaker && (
          <button 
            onClick={requestToSpeak}
            className={cn(
              "h-10 px-4 rounded-full flex items-center gap-2 transition-all font-bold text-[11px] uppercase tracking-widest",
              hasRequested ? "bg-[#5865f2] text-white" : "bg-[#3f4147] text-[#dbdee1] hover:bg-[#4e5058]"
            )}
          >
            <Mic size={16} />
            <span>{hasRequested ? 'Requested' : 'Request'}</span>
          </button>
        )}
      </div>

      <button
        onClick={leaveVoiceChannel}
        className="w-12 h-10 rounded-full bg-[#f23f43] hover:bg-[#d8373b] text-white flex items-center justify-center transition-all shadow-lg cursor-pointer"
      >
        <PhoneOff size={20} />
      </button>
    </div>
  );
}

function ControlBtn({ icon, active, danger, onClick, disabled, tooltip }: any) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-10 h-10 rounded-full flex items-center justify-center transition-all group relative cursor-pointer",
        active 
          ? (danger ? "bg-[#f23f43] text-white" : "bg-[#5865f2] text-white") 
          : "bg-transparent text-[#dbdee1] hover:bg-[#3f4147] hover:text-white",
        disabled && "opacity-20 cursor-not-allowed"
      )}
    >
      {icon}
      {/* Tooltip Simulation */}
      <span className="absolute -top-10 scale-0 group-hover:scale-100 transition-all bg-black text-white text-[10px] px-2 py-1 rounded font-bold whitespace-nowrap z-50">
        {tooltip}
      </span>
    </button>
  );
}
