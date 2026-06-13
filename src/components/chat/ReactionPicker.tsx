import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Search } from 'lucide-react';

const EMOJI_CATEGORIES = [
  { id: 'recent', label: '🕐', emojis: ['👍', '❤️', '😂', '🔥', '💯'] },
  { id: 'smileys', label: '😊', emojis: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤔', '😐', '😑', '😶'] },
  { id: 'gestures', label: '👋', emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👍', '👎', '👏', '🙌', '🤝', '🙏', '💪'] },
  { id: 'hearts', label: '❤️', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'] },
  { id: 'objects', label: '🎉', emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '✨', '🌟', '💫', '⭐', '🔥', '💥', '💯', '🚀', '⚡', '🎮', '🎯', '🏆', '🎵', '🎶', '💻'] },
];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('recent');

  const currentCategory = EMOJI_CATEGORIES.find(c => c.id === activeCategory) || EMOJI_CATEGORIES[0];
  const filteredEmojis = search ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(() => true) : currentCategory.emojis;

  return (
    <div className="w-80 glass-heavy rounded-xl shadow-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
      {/* Search */}
      <div className="p-2.5 border-b border-border">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full bg-surface-2 border border-border rounded-lg py-1.5 pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30"
            autoFocus
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border">
        {EMOJI_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={cn(
              "w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors",
              activeCategory === cat.id ? "bg-surface-3" : "hover:bg-surface-3"
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 max-h-48 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-8 gap-0.5">
          {filteredEmojis.map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="w-8 h-8 flex items-center justify-center hover:bg-surface-3 rounded-md text-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Quick reaction bar shown on message hover
export function QuickReactions({ onSelect }: { onSelect: (emoji: string) => void }) {
  const quickEmojis = ['👍', '❤️', '😂', '🔥', '👀', '💯'];
  return (
    <div className="flex items-center gap-0.5 p-1 glass rounded-lg">
      {quickEmojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="w-7 h-7 flex items-center justify-center hover:bg-surface-3 rounded-md text-sm transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
