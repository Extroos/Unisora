import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/utils';

const EMOJI_CATEGORIES = [
  { name: 'Smileys', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳'] },
  { name: 'Gestures', emojis: ['👍', '👎', '👊', '✊', '🤛', '🤜', '🤞', '✌️', '🤟', '🤘', '👌', '👈', '👉', '👆', '👇', '✋', '🤚', '👋', '🖖', '👏', '🙌', '👐', '🤲', '🙏'] },
  { name: 'Hearts', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'] },
  { name: 'Activities', emojis: ['🎮', '🎨', '🎬', '🎤', '🎧', '🎷', '🎸', '🎹', '🎺', '🎻', '🎲', '🧩', '🃏', '♟️', '🎳', '🎯', '🛹', '🚲', '🏎️', '⚽'] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  position?: { top?: number; bottom?: number; left?: number; right?: number };
}

export function EmojiPicker({ onSelect, onClose, position }: EmojiPickerProps) {
  const [search, setSearch] = React.useState('');
  
  const allEmojis = EMOJI_CATEGORIES.flatMap(c => c.emojis);
  const filtered = search.trim() 
    ? allEmojis.filter(e => e.includes(search)) // Very basic search, ideally use names
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      className="fixed z-1000 w-80 h-96 bg-surface-2 border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      style={position}
    >
      <div className="p-3 border-b border-border bg-surface-3/50 flex items-center gap-2 shrink-0">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            placeholder="Search emojis..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-1 border border-border rounded-lg py-1.5 pl-9 pr-3 text-xs text-text-primary focus:outline-none focus:border-accent/40 transition-all"
          />
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-1 text-text-muted transition-all">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3">
        {filtered ? (
           <div className="grid grid-cols-8 gap-1">
             {filtered.map(e => (
               <button 
                 key={e} 
                 onClick={() => { onSelect(e); onClose(); }}
                 className="w-8 h-8 flex items-center justify-center text-lg hover:bg-surface-3 rounded-lg transition-all"
               >
                 {e}
               </button>
             ))}
           </div>
        ) : (
          EMOJI_CATEGORIES.map(cat => (
            <div key={cat.name} className="mb-4 last:mb-0">
              <h3 className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 px-1">{cat.name}</h3>
              <div className="grid grid-cols-8 gap-1">
                {cat.emojis.map(e => (
                  <button 
                    key={e} 
                    onClick={() => { onSelect(e); onClose(); }}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-surface-3 rounded-lg transition-all"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-2 border-t border-border bg-surface-3/30 flex items-center justify-between">
         <div className="flex gap-1">
            {['😀', '👍', '❤️', '🔥', '🚀'].map(e => (
               <button 
                 key={e}
                 onClick={() => { onSelect(e); onClose(); }}
                 className="w-7 h-7 flex items-center justify-center text-sm hover:bg-surface-3 rounded-lg transition-all"
               >
                 {e}
               </button>
            ))}
         </div>
         <span className="text-[9px] font-bold text-text-muted uppercase tracking-widest opacity-40 mr-1">Nexus Emojis</span>
      </div>
    </motion.div>
  );
}
