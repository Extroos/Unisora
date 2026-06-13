import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppStore } from '../../store/useAppStore';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Signal, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function VoiceStatusBar() {
  const { voiceState, channels, toggleMute, toggleDeafen, leaveVoiceChannel, setActiveChannel, setActiveServer, dmChannels, users } = useAppStore();
  const channel = useMemo(() => {
    if (!voiceState.channelId) return null;
    if (voiceState.channelId.startsWith('dm-')) {
      const dmChannel = dmChannels[voiceState.channelId];
      if (dmChannel) {
        return {
          id: dmChannel.id,
          serverId: '',
          name: dmChannel.name || `Group Chat (${dmChannel.participants.length})`,
          type: 'voice' as const,
        };
      }
      // Check if it's a 1-on-1 DM ID format like dm-[userId]-[myId] or dm-userId
      const otherId = voiceState.channelId.replace('dm-', '');
      const otherUser = users[otherId];
      return {
        id: voiceState.channelId,
        serverId: '',
        name: otherUser ? otherUser.username : 'Private Call',
        type: 'voice' as const,
      };
    }
    return channels.find(c => c.id === voiceState.channelId) || null;
  }, [voiceState.channelId, channels, dmChannels, users]);

  const containerRef = useRef<HTMLDivElement>(null);
  const signalRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHoveredSignal, setIsHoveredSignal] = useState(false);
  const [currentPing, setCurrentPing] = useState(35);
  const [pingHistory, setPingHistory] = useState<number[]>([
    35, 36, 35, 34, 35, 35, 35, 37, 35, 36, 35, 35, 34, 38, 35, 35, 36, 35, 37, 35
  ]);

  const [popoverCoords, setPopoverCoords] = useState({ bottom: 120, left: 16, width: 248 });
  const [tooltipCoords, setTooltipCoords] = useState({ bottom: 0, left: 0 });

  // Fluctuating ping simulation
  useEffect(() => {
    if (!voiceState.channelId) return;
    const interval = setInterval(() => {
      const nextPing = Math.floor(Math.random() * 8) + 32; // 32 to 39 ms
      setCurrentPing(nextPing);
      setPingHistory(prev => [...prev.slice(1), nextPing]);
    }, 2000);
    return () => clearInterval(interval);
  }, [voiceState.channelId]);

  // Recalculate coordinates when popover opens or window resizes
  useEffect(() => {
    if (isModalOpen && containerRef.current) {
      const updateCoords = () => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverCoords({
          bottom: window.innerHeight - rect.top + 8, // 8px space above
          left: rect.left,
          width: rect.width
        });
      };
      updateCoords();
      window.addEventListener('resize', updateCoords);
      return () => window.removeEventListener('resize', updateCoords);
    }
  }, [isModalOpen]);

  // Track coordinates of the signal container for portal tooltip positioning
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipCoords({
      bottom: window.innerHeight - rect.top + 6,
      left: rect.left
    });
    setIsHoveredSignal(true);
  };

  const handleMouseLeave = () => {
    setIsHoveredSignal(false);
  };

  const avgPing = useMemo(() => {
    return Math.round(pingHistory.reduce((sum, val) => sum + val, 0) / pingHistory.length);
  }, [pingHistory]);

  const timeLabels = useMemo(() => {
    const labels = [];
    const now = new Date();
    for (let i = 3; i >= 0; i--) {
      const time = new Date(now.getTime() - i * 60000);
      labels.push(time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    return labels;
  }, [currentPing]);

  // Generate SVG path for the ping history (responsive width, height = 45)
  const svgPath = useMemo(() => {
    const width = popoverCoords.width - 24; // padding allowance
    const height = 45;
    const padding = 3;
    const chartHeight = height - padding * 2;
    
    return pingHistory.map((val, index) => {
      const x = (index / (pingHistory.length - 1)) * width;
      const y = height - padding - (Math.min(100, Math.max(0, val)) / 100) * chartHeight;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }, [pingHistory, popoverCoords.width]);

  const svgAreaPath = useMemo(() => {
    if (!svgPath) return '';
    const width = popoverCoords.width - 24;
    return `${svgPath} L ${width} 45 L 0 45 Z`;
  }, [svgPath, popoverCoords.width]);

  const handleChannelClick = () => {
    if (channel) {
      if (channel.id.startsWith('dm-')) {
        setActiveServer('');
        useAppStore.setState({ activeDmId: channel.id, isExploreOpen: false, isAdminOpen: false, isDraftsOpen: false, activeChannelId: null });
      } else {
        setActiveServer(channel.serverId);
        setActiveChannel(channel.id);
      }
    }
  };

  return (
    <>
      <AnimatePresence>
        {voiceState.channelId && channel && (
          <motion.div 
            ref={containerRef}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="p-2 pt-3 border-b border-[#3f4147] bg-[#232428] flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <div className="flex flex-col min-w-0">
                  <div 
                    ref={signalRef}
                    onClick={() => setIsModalOpen(true)}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="flex items-center gap-1.5 cursor-pointer select-none group relative self-start"
                  >
                    <Signal 
                      size={12} 
                      className={cn(
                        "transition-transform duration-200 group-hover:scale-110",
                        voiceState.isConnecting ? "text-[#f0b232]" : "text-[#23a55a]"
                      )} 
                    />
                    <span 
                      className={cn(
                        "text-[11px] font-bold uppercase tracking-wide group-hover:underline",
                        voiceState.isConnecting ? "text-[#f0b232]" : "text-[#23a55a]"
                      )}
                    >
                      {voiceState.isConnecting ? "RTC Connecting..." : "Voice Connected"}
                    </span>
                  </div>
                  <span 
                    onClick={handleChannelClick}
                    className="text-[13px] text-white font-medium truncate cursor-pointer hover:underline"
                  >
                    {channel.name}
                  </span>
                </div>
                <button 
                  onClick={leaveVoiceChannel}
                  className="p-1.5 text-[#dbdee1] hover:text-[#f23f43] hover:bg-white/5 rounded-md transition-all cursor-pointer shrink-0"
                >
                  <PhoneOff size={16} />
                </button>
              </div>

              <div className="flex gap-1.5">
                <button 
                  onClick={toggleMute} 
                  className={cn(
                    "flex-1 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-[#3f4147]/20 shadow-sm", 
                    voiceState.isMuted 
                      ? "bg-[#f23f43] text-white hover:bg-[#d8373b]" 
                      : "bg-[#2b2d31]/80 hover:bg-[#35373c] text-[#dbdee1]"
                  )}
                >
                  {voiceState.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button 
                  onClick={toggleDeafen} 
                  className={cn(
                    "flex-1 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border border-[#3f4147]/20 shadow-sm", 
                    voiceState.isDeafened 
                      ? "bg-[#f23f43] text-white hover:bg-[#d8373b]" 
                      : "bg-[#2b2d31]/80 hover:bg-[#35373c] text-[#dbdee1]"
                  )}
                >
                  {voiceState.isDeafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Latency Portal Tooltip */}
      {createPortal(
        <AnimatePresence>
          {isHoveredSignal && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              style={{
                position: 'fixed',
                bottom: `${tooltipCoords.bottom}px`,
                left: `${tooltipCoords.left}px`,
              }}
              className="bg-[#111214] text-white text-[11px] font-semibold px-2 py-1 rounded shadow-md border border-[#3f4147]/50 whitespace-nowrap z-[1005] pointer-events-none"
            >
              {voiceState.isConnecting ? "RTC Connecting..." : `Ping: ${currentPing} ms`}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Popover Connection Details floating above the Wifi icon */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[1000] flex items-stretch justify-stretch pointer-events-auto">
          {/* Transparent Backdrop to close on clicking anywhere */}
          <div 
            onClick={() => setIsModalOpen(false)}
            className="absolute inset-0 bg-transparent cursor-default"
          />
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            style={{
              position: 'fixed',
              bottom: `${popoverCoords.bottom}px`,
              left: `${popoverCoords.left}px`,
              width: `${popoverCoords.width}px`
            }}
            className="bg-[#232428] rounded-lg border border-[#3f4147] shadow-xl overflow-hidden text-left flex flex-col z-10 p-3 gap-2.5"
          >
            {/* Header */}
            <div className="flex justify-between items-center pb-1 border-b border-[#3f4147]/30">
              <span className="text-[11px] font-bold text-[#5865f2] uppercase tracking-wider">
                Connection
              </span>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#949ba4] hover:text-white transition-colors cursor-pointer"
              >
                <X size={13} />
              </button>
            </div>

            {/* Sparkline Graph */}
            <div className="bg-[#1e1f22] rounded-md p-1.5 flex flex-col gap-0.5 border border-[#3f4147]/20 relative overflow-hidden">
              <div className="flex justify-between items-stretch">
                {/* Left: SVG Chart Area */}
                <div className="relative flex-1 h-[45px]">
                  <svg className="w-full h-full" viewBox={`0 0 ${popoverCoords.width - 24} 45`} preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="popoverChartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#5865f2" stopOpacity="0.4"/>
                        <stop offset="100%" stopColor="#5865f2" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    <line x1="0" y1="12" x2={popoverCoords.width - 24} y2="12" stroke="#35373c" strokeWidth="0.5" strokeDasharray="2 2" />
                    <line x1="0" y1="33" x2={popoverCoords.width - 24} y2="33" stroke="#35373c" strokeWidth="0.5" strokeDasharray="2 2" />
                    <path d={svgAreaPath} fill="url(#popoverChartGradient)" />
                    <path d={svgPath} fill="none" stroke="#5865f2" strokeWidth="1.5" />
                  </svg>
                </div>

                {/* Right: Y Axis Labels */}
                <div className="w-6 flex flex-col justify-between items-end text-[8px] text-[#949ba4] font-medium pl-1 select-none">
                  <span>100</span>
                  <span>50</span>
                  <span>0</span>
                </div>
              </div>

              {/* Bottom: X Axis Labels */}
              <div className="flex justify-between text-[8px] text-[#949ba4] font-medium pt-1 border-t border-[#3f4147]/30 select-none">
                <span>{timeLabels[0]}</span>
                <span>{timeLabels[3]}</span>
              </div>
            </div>

            {/* Connection Metrics */}
            <div className="flex flex-col gap-1.5">
              <div className="text-[11px] font-bold text-white font-mono tracking-tight truncate">
                c-mad01-c9d85c31
              </div>
              <div className="flex flex-col gap-0.5 text-[11px] text-[#dbdee1]">
                <div className="flex justify-between">
                  <span>Average ping:</span>
                  <span className="font-bold text-white">{voiceState.isConnecting ? "Connecting..." : `${avgPing} ms`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last ping:</span>
                  <span className="font-bold text-white">{voiceState.isConnecting ? "Connecting..." : `${currentPing} ms`}</span>
                </div>
                <div className="flex justify-between">
                  <span>Packet loss:</span>
                  <span className="font-bold text-white">0.0%</span>
                </div>
              </div>
            </div>

            {/* Warning Description */}
            <p className="text-[9.5px] text-[#949ba4] leading-normal select-none border-t border-[#3f4147]/20 pt-1.5">
              You may sound robotic if your packet loss rate is over 10%.
            </p>
          </motion.div>
        </div>,
        document.body
      )}
    </>
  );
}

