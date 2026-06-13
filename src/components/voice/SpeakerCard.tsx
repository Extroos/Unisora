import React, { useEffect, useRef } from 'react';
import { MicOff, HeadphoneOff, VideoOff, Maximize2, Monitor } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar } from '../ui/Avatar';
import { motion } from 'motion/react';

interface SpeakerCardProps {
  user: any;
  isMe: boolean;
  isMuted: boolean;
  isSpeaking: boolean;
  videoStream?: MediaStream | null;
  isScreenShare?: boolean;
  isConnecting?: boolean;
  hasNoCamera?: boolean;
  key?: React.Key;
}

export function SpeakerCard({ user, isMe, isMuted, isSpeaking, videoStream, isScreenShare, isConnecting, hasNoCamera }: SpeakerCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error("Failed to enter fullscreen:", err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  return (
    <motion.div 
      ref={containerRef}
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "relative w-full h-full rounded-lg flex flex-col items-center justify-center overflow-hidden transition-all duration-100 group",
        isScreenShare ? "bg-black" : "bg-[#1e1f22]",
        "hover:bg-[#2b2d31]",
        isConnecting && "opacity-45 brightness-50 bg-[#111214] select-none pointer-events-none"
      )}
    >
      {videoStream ? (
        <video 
          ref={(el) => {
            if (el) {
              if (el.srcObject !== videoStream) {
                el.srcObject = videoStream;
              }
              el.play().catch(err => {
                if (err.name !== 'AbortError') {
                  console.log("video play failed:", err);
                }
              });
            }
          }} 
          autoPlay 
          playsInline 
          muted={isMe} 
          className={cn("absolute inset-0 w-full h-full z-0", isScreenShare ? "object-contain" : "object-cover")}
        />
      ) : null}

      {/* Camera Off Indicator (Top Right) */}
      {!videoStream && !isScreenShare && !hasNoCamera && (
        <div className="absolute top-3 right-3 z-20 w-6 h-6 bg-[#2b2d31]/80 rounded-full flex items-center justify-center border border-[#3f4147]/50 shadow-md backdrop-blur-xs select-none">
          <VideoOff size={11} className="text-[#949ba4]" />
        </div>
      )}

      {videoStream && (
        <button 
          onClick={toggleFullscreen}
          className="absolute bottom-3 right-3 z-30 w-8 h-8 bg-black/60 hover:bg-black/80 rounded-lg flex items-center justify-center border border-white/10 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md backdrop-blur-xs"
          title="Toggle Fullscreen"
        >
          <Maximize2 size={14} />
        </button>
      )}

      {/* Screen Share Live Badges (Top Right) */}
      {isScreenShare && (
        <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 select-none pointer-events-none">
          <span className="text-[10px] font-bold text-[#dbdee1] bg-black/60 px-2 py-0.5 rounded backdrop-blur-md border border-white/5 shadow-md">
            720P 30FPS
          </span>
          <span className="text-[10px] font-bold text-white bg-[#f23f43] px-2 py-0.5 rounded shadow-md uppercase tracking-wider">
            LIVE
          </span>
        </div>
      )}

      {/* Centered No Camera Detected Layout */}
      {hasNoCamera ? (
        <div className="flex flex-col items-center justify-center gap-2 text-[#f23f43] z-10 select-none">
          <div className="w-12 h-12 rounded-full bg-[#f23f43]/10 border border-[#f23f43]/20 flex items-center justify-center animate-pulse">
            <VideoOff size={20} className="text-[#f23f43]" />
          </div>
          <span className="text-[10px] font-bold text-[#dbdee1] uppercase tracking-wider">No Camera Detected</span>
        </div>
      ) : (
        /* Overlay controls/indicators */
        <div className={cn("relative z-10 flex flex-col items-center justify-center gap-3 w-full h-full", videoStream && "absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent")}>
          {!videoStream && (
            <div className="relative">
              <Avatar src={user.avatarUrl} alt={user.username} size="xl" className="shadow-lg" />
              {isMuted && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f23f43] rounded-full flex items-center justify-center border-[3px] border-[#2b2d31]">
                  <MicOff size={12} className="text-white" />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-20">
        <span className="text-xs font-bold text-white bg-black/40 px-2 py-0.5 rounded backdrop-blur-md flex items-center gap-1.5">
          {isScreenShare ? (
            <>
              <Monitor size={12} className="text-white shrink-0" />
              <span>{user.username}</span>
            </>
          ) : (
            isMe ? 'You' : user.username
          )}
          {isConnecting && (
            <span className="text-[10px] text-[#f0b232] font-semibold flex items-center gap-1 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f0b232] animate-pulse" />
              Connecting...
            </span>
          )}
        </span>
      </div>


    </motion.div>
  );
}
