import React, { useState, useEffect } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

const MOCK_GIFS = [
  { id: '1', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXJnbXJndXJndXJndXJndXJndXJndXJndXJndXJndXJndXJnJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxxZUEV2Z3i/giphy.gif', title: 'Celebration' },
  { id: '2', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXJnbXJndXJndXJndXJndXJndXJndXJndXJndXJndXJndXJnJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0MYH8Q8S9mVP3FTO/giphy.gif', title: 'Party' },
  { id: '3', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXJnbXJndXJndXJndXJndXJndXJndXJndXJndXJndXJndXJnJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKVUn7iM8FMEU24/giphy.gif', title: 'Dance' },
  { id: '4', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXJnbXJndXJndXJndXJndXJndXJndXJndXJndXJndXJndXJnJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l41lI4bS0tP194vmg/giphy.gif', title: 'Happy' },
  { id: '5', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXJnbXJndXJndXJndXJndXJndXJndXJndXJndXJndXJndXJnJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/3o7TKMGpxxZUEV2Z3i/giphy.gif', title: 'Celebration 2' },
  { id: '6', url: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHJndXJnbXJndXJndXJndXJndXJndXJndXJndXJndXJndXJndXJnJmVwPXYxX2ludGVybmFsX2dpZl9ieV9pZCZjdD1n/l0MYH8Q8S9mVP3FTO/giphy.gif', title: 'Party 2' },
];

export function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [gifs, setGifs] = useState(MOCK_GIFS);

  useEffect(() => {
    if (search) {
      setLoading(true);
      const timer = setTimeout(() => {
        setGifs(MOCK_GIFS.filter(g => g.title.toLowerCase().includes(search.toLowerCase())));
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    } else {
      setGifs(MOCK_GIFS);
    }
  }, [search]);

  return (
    <div className="w-80 h-96 flex flex-col bg-surface-1 border border-border shadow-2xl rounded-xl overflow-hidden animate-in fade-in zoom-in duration-150">
      <div className="px-4 py-3 bg-surface-2 border-b border-border flex items-center justify-between">
        <span className="text-[10px] font-black text-text-secondary uppercase tracking-[0.15em]">GIF Engine</span>
        <button onClick={onClose} className="p-1 rounded hover:bg-surface-3 text-text-muted hover:text-text-primary transition-colors">
          <X size={14} />
        </button>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input 
            type="text" 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search Tenor..." 
            className="w-full bg-surface-2 border border-border rounded-lg py-2 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/30 transition-colors"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pt-0">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 size={24} className="text-accent animate-spin" />
          </div>
        ) : gifs.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {gifs.map(gif => (
              <button 
                key={gif.id}
                onClick={() => onSelect(gif.url)}
                className="relative aspect-video bg-surface-2 rounded-lg border border-border overflow-hidden hover:border-accent/50 transition-all group/gif"
              >
                <img src={gif.url} alt={gif.title} className="w-full h-full object-cover group-hover/gif:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/gif:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-50">
            <Search size={32} className="mb-2 text-text-muted" />
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">No GIFs Found</p>
          </div>
        )}
      </div>
    </div>
  );
}
