import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Mic, MicOff, Headphones, HeadphoneOff, PhoneOff, Signal } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export function VoiceStatusBar() {
  const { voiceState, channels, toggleMute, toggleDeafen, leaveVoiceChannel } = useAppStore();
  const channel = channels.find(c => c.id === voiceState.channelId);

  return (
    <AnimatePresence>
      {voiceState.channelId && channel && (
        <motion.div 
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="overflow-hidden"
        >
          <div className="p-2 pt-3 border-b border-[#3f4147] bg-[#232428] flex flex-col gap-2">
            <div className="flex items-center justify-between px-1">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <Signal size={12} className="text-[#23a55a]" />
                  <span className="text-[11px] font-bold text-[#23a55a] uppercase tracking-wide">Voice Connected</span>
                </div>
                <span className="text-[13px] text-white font-medium truncate">{channel.name}</span>
              </div>
              <button 
                onClick={leaveVoiceChannel}
                className="p-1.5 text-[#dbdee1] hover:text-[#f23f43] hover:bg-white/5 rounded-md transition-all cursor-pointer"
              >
                <PhoneOff size={16} />
              </button>
            </div>

            <div className="flex gap-1">
              <button 
                onClick={toggleMute} 
                className={cn(
                  "flex-1 h-8 rounded flex items-center justify-center transition-colors cursor-pointer", 
                  voiceState.isMuted ? "bg-[#f23f43] text-white" : "hover:bg-[#3f4147] text-[#dbdee1]"
                )}
              >
                {voiceState.isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button 
                onClick={toggleDeafen} 
                className={cn(
                  "flex-1 h-8 rounded flex items-center justify-center transition-colors cursor-pointer", 
                  voiceState.isDeafened ? "bg-[#f23f43] text-white" : "hover:bg-[#3f4147] text-[#dbdee1]"
                )}
              >
                {voiceState.isDeafened ? <HeadphoneOff size={16} /> : <Headphones size={16} />}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
