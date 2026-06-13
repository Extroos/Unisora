import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export function TitleBar() {
  const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI;

  if (!isElectron) return null;

  const handleMinimize = () => {
    (window as any).electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    (window as any).electronAPI.maximizeWindow();
  };

  const handleClose = () => {
    (window as any).electronAPI.closeWindow();
  };

  return (
    <div 
      className="h-[28px] w-full bg-[#1e1f22] text-[#949ba4] flex items-center justify-between select-none border-b border-[#111214]/50"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      {/* Left side: Logo & Title */}
      <div className="flex items-center gap-2 pl-3 text-xs font-semibold text-[#dbdee1]">
        <div className="w-4 h-4 bg-gradient-to-br from-[#6366f1] to-[#a855f7] rounded-[4px] flex items-center justify-center shadow-sm">
          <span className="text-[10px] font-black text-white">U</span>
        </div>
        <span>Unisora</span>
      </div>

      {/* Right side: Window Controls */}
      <div 
        className="flex h-full items-center"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button 
          onClick={handleMinimize}
          className="h-full px-[14px] flex items-center justify-center hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors duration-100 cursor-default"
          title="Minimize"
        >
          <Minus size={13} strokeWidth={2.5} />
        </button>
        <button 
          onClick={handleMaximize}
          className="h-full px-[14px] flex items-center justify-center hover:bg-[#35373c] hover:text-[#dbdee1] transition-colors duration-100 cursor-default"
          title="Maximize"
        >
          <Square size={10} strokeWidth={2.5} />
        </button>
        <button 
          onClick={handleClose}
          className="h-full px-[14px] flex items-center justify-center hover:bg-[#f23f43] hover:text-white transition-colors duration-100 cursor-default"
          title="Close"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
