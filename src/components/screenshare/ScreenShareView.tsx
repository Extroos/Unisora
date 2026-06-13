import React, { useEffect, useRef } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ScreenShareViewProps {
  stream: MediaStream;
  username: string;
  isMe: boolean;
}

export function ScreenShareView({ stream, username, isMe }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
      }).catch(err => {
        console.error('Error enabling fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative flex-1 bg-[#1e1f22] border border-white/5 rounded-xl overflow-hidden flex items-center justify-center group shadow-2xl"
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMe}
        className="w-full h-full object-contain max-h-[70vh]"
      />

      {/* Screen Share Overlay Controls */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-4 pointer-events-none">
        <div className="flex justify-between items-center w-full">
          <span className="text-xs font-bold text-white bg-black/55 px-2.5 py-1 rounded-md backdrop-blur-md">
            {isMe ? 'You are sharing your screen' : `${username} is sharing their screen`}
          </span>
          <span className="text-[10px] font-black tracking-widest text-[#23a55a] bg-[#23a55a]/10 px-2 py-0.5 rounded border border-[#23a55a]/25 uppercase">
            Live
          </span>
        </div>

        <div className="flex justify-between items-center w-full pointer-events-auto">
          <span className="text-[11px] text-text-secondary font-medium">
            1080p @ 30fps stream
          </span>
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg transition-colors border border-white/5 backdrop-blur-sm cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
        </div>
      </div>
    </div>
  );
}
