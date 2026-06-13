import React, { useState } from 'react';
import { X, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface StickerPickerProps {
  onSelect: (stickerUrl: string) => void;
  onClose: () => void;
}

const STICKER_PACKS = [
  {
    id: 'nexus-core',
    name: 'Nexus Core',
    stickers: [
      'https://api.dicebear.com/7.x/bottts/svg?seed=sticker1',
      'https://api.dicebear.com/7.x/bottts/svg?seed=sticker2',
      'https://api.dicebear.com/7.x/bottts/svg?seed=sticker3',
      'https://api.dicebear.com/7.x/bottts/svg?seed=sticker4',
      'https://api.dicebear.com/7.x/bottts/svg?seed=sticker5',
      'https://api.dicebear.com/7.x/bottts/svg?seed=sticker6',
    ]
  },
  {
    id: 'cosmic',
    name: 'Cosmic Vibes',
    stickers: [
      'https://api.dicebear.com/7.x/shapes/svg?seed=s1',
      'https://api.dicebear.com/7.x/shapes/svg?seed=s2',
      'https://api.dicebear.com/7.x/shapes/svg?seed=s3',
      'https://api.dicebear.com/7.x/shapes/svg?seed=s4',
      'https://api.dicebear.com/7.x/shapes/svg?seed=s5',
      'https://api.dicebear.com/7.x/shapes/svg?seed=s6',
    ]
  }
];

export function StickerPicker({ onSelect, onClose }: StickerPickerProps) {
  const [activePack, setActivePack] = useState(STICKER_PACKS[0].id);

  return (
    <div className="w-80 h-96 flex flex-col bg-surface-1 border border-border shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <div className="px-4 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">Sticker Library</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
        {STICKER_PACKS.map(pack => (
          <div key={pack.id} className="mb-6 last:mb-2">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-3 px-1">{pack.name}</h4>
            <div className="grid grid-cols-3 gap-3">
              {pack.stickers.map((url, i) => (
                <button 
                  key={i}
                  onClick={() => onSelect(url)}
                  className="aspect-square bg-surface-2 rounded-xl border border-border/50 p-2 flex items-center justify-center hover:bg-surface-3 hover:border-accent/30 transition-all group/sticker active:scale-95"
                >
                  <img src={url} alt="Sticker" className="w-full h-full object-contain group-hover/sticker:scale-110 transition-transform duration-300" />
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="h-12 bg-surface-2 border-t border-border flex items-center px-2 gap-1 overflow-x-auto scrollbar-none">
        {STICKER_PACKS.map(pack => (
          <button 
            key={pack.id}
            onClick={() => setActivePack(pack.id)}
            className={cn(
              "w-10 h-8 rounded-lg flex items-center justify-center transition-all",
              activePack === pack.id ? "bg-accent/10 text-accent" : "text-text-muted hover:bg-surface-3"
            )}
          >
            <div className="w-5 h-5 rounded-md overflow-hidden bg-surface-3">
              <img src={pack.stickers[0]} alt="" className="w-full h-full object-contain" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
