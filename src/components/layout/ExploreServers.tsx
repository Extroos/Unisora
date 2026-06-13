import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Search, Compass, Users, Globe, Hash, Plus, Check } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

const PUBLIC_SPACES: any[] = [];

export function ExploreServers() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('All');
  const { servers, joinServer } = useAppStore();
  
  const filteredSpaces = PUBLIC_SPACES.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || 
                          s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchesTag = activeTag === 'All' || s.tags.includes(activeTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div className="flex-1 flex flex-col bg-surface-1 overflow-hidden font-sans">
      {/* Directory Header (Solid Classic) */}
      <div className="bg-surface-2 border-b border-border py-16 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,var(--color-accent),transparent)] opacity-[0.03] pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-4 justify-center">
            <div className="w-12 h-12 rounded bg-surface-1 border border-border flex items-center justify-center text-accent shadow-sm">
              <Compass size={24} />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">Explorer</h1>
              <p className="text-[10px] text-text-muted font-black uppercase tracking-widest mt-0.5">Community & Professional Directory</p>
            </div>
          </div>
          
          <div className="relative max-w-2xl mx-auto mt-8">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input 
              type="text" 
              placeholder="Filter by workspace name, topic, or technical expertise..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-0 border border-border rounded-lg py-4 pl-12 pr-4 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-accent transition-all shadow-lg"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-10 custom-scrollbar bg-surface-1">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-6">
            <div className="flex flex-col">
              <h2 className="text-xs font-bold text-text-secondary uppercase tracking-[0.2em] mb-1">
                Verified Workspaces
              </h2>
              <p className="text-[11px] text-text-muted font-medium">Discover specialized technical environments and professional hubs.</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['All', 'SRE', 'Architecture', 'Hardware', 'Data Science', 'Engineering'].map(tag => (
                <button 
                  key={tag} 
                  onClick={() => setActiveTag(tag)}
                  className={cn(
                    "px-4 py-1.5 rounded transition-all text-[11px] font-black uppercase tracking-widest",
                    activeTag === tag 
                      ? "bg-accent text-white shadow-lg shadow-accent/20" 
                      : "bg-surface-2 border border-border text-text-muted hover:text-text-primary hover:bg-surface-3"
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredSpaces.map((space, i) => {
              const isJoined = servers.some(s => s.id === space.id);
              return (
                <motion.div
                  key={space.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.05 }}
                  className="group bg-surface-2 border border-border rounded-xl overflow-hidden hover:border-accent transition-all flex flex-col shadow-sm hover:shadow-2xl"
                >
                  <div className="relative h-32 overflow-hidden bg-surface-3">
                    <img 
                      src={space.bannerUrl} 
                      alt="" 
                      className="w-full h-full object-cover opacity-30 group-hover:opacity-40 group-hover:scale-105 transition-all duration-700"
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-surface-2 to-transparent" />
                  </div>
                  
                  <div className="px-6 pb-6 relative -mt-8 flex-1 flex flex-col">
                    <div className="w-16 h-16 rounded-lg bg-surface-1 border-4 border-surface-2 overflow-hidden shadow-xl mb-4 group-hover:scale-105 transition-transform">
                      <img src={space.iconUrl} alt={space.name} className="w-full h-full object-cover" />
                    </div>
                    
                    <h3 className="text-lg font-bold text-text-primary mb-1 group-hover:text-accent transition-colors tracking-tight">{space.name}</h3>
                    <p className="text-xs text-text-secondary line-clamp-2 mb-5 leading-relaxed font-medium">{space.description}</p>
                    
                    <div className="flex flex-wrap gap-1.5 mb-8">
                      {space.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-black uppercase tracking-widest text-text-muted bg-surface-1 px-2.5 py-1 rounded border border-border/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                    
                    <div className="mt-auto flex items-center justify-between pt-5 border-t border-border/40">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-text-muted">
                        <Users size={14} className="text-accent/60" />
                        <span className="uppercase tracking-widest">{space.memberCount.toLocaleString()} Active</span>
                      </div>
                      
                      <Button 
                        variant={isJoined ? "secondary" : "primary"} 
                        size="sm"
                        onClick={() => !isJoined && joinServer(space.id)}
                        className={cn(
                          "rounded-lg h-9 px-6 text-[11px] uppercase tracking-widest font-black transition-all",
                          isJoined ? "bg-surface-3 border-border cursor-default" : "bg-accent hover:bg-accent-hover shadow-lg shadow-accent/20"
                        )}
                      >
                        {isJoined ? (
                          <span className="flex items-center gap-2"><Check size={12} /> Joined</span>
                        ) : (
                          "Join Workspace"
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
