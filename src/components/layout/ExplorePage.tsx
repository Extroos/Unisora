import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { Compass, Search, Users, Globe, Check, Plus, ShieldCheck, Terminal, Cpu, Database } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion } from 'motion/react';
import { Button } from '../ui/Button';

const CATEGORIES = [
  { id: 'all', label: 'All Spaces', icon: Compass },
  { id: 'tech', label: 'Technology', icon: Cpu },
  { id: 'gaming', label: 'Gaming', icon: Terminal },
  { id: 'creative', label: 'Design & Creative', icon: Database },
  { id: 'education', label: 'Education', icon: ShieldCheck },
];

export function ExplorePage() {
  const { servers, joinServer, setActiveServer, setExploreOpen, currentUser } = useAppStore();
  const [activeCategory, setActiveCategory] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredSpaces = servers.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         s.tags?.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = activeCategory === 'all' || s.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const handleJoin = async (serverId: string) => {
    await joinServer(serverId);
    setActiveServer(serverId);
    setExploreOpen(false);
  };

  return (
    <div className="flex-1 bg-[#1e1f22] flex flex-col overflow-hidden font-sans">
      {/* Compact, Professional Header */}
      <div className="px-8 pt-8 pb-4 shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Compass size={20} className="text-[#5865f2]" />
            Explore Spaces
          </h1>
          <p className="text-xs text-[#949ba4] mt-0.5">
            Discover and join communities across the workspace network.
          </p>
        </div>
        
        {/* Compact Search Bar */}
        <div className="relative w-full md:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#949ba4]" />
          <input 
            type="text" 
            placeholder="Search spaces..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#111214] border border-[#232428] rounded-md py-1.5 pl-9 pr-3 text-sm text-[#dbdee1] placeholder:text-[#949ba4] focus:outline-none focus:border-[#5865f2] transition-colors"
          />
        </div>
      </div>

      {/* Pill Category Filters */}
      <div className="px-8 py-3 bg-[#2b2d31]/40 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap",
                isActive 
                  ? "bg-[#5865f2] text-white" 
                  : "text-[#949ba4] hover:text-[#dbdee1] hover:bg-[#35373c]/50"
              )}
            >
              <Icon size={13} />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Spaces Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-[#313338]/20">
        <div className="max-w-7xl mx-auto">
          {filteredSpaces.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredSpaces.map((space) => {
                const isJoined = space.members.includes(currentUser?.id || '');
                return (
                  <div
                    key={space.id}
                    className="group bg-[#2b2d31] border border-white/5 rounded-lg hover:border-white/10 hover:shadow-lg transition-all flex flex-col h-[180px]"
                  >
                    {/* Header Banner - exactly matching the sidemenu workspace card layout */}
                    <div className="h-[44px] bg-[#1e1f22] relative shrink-0 overflow-hidden rounded-t-lg flex items-center px-3 justify-between">
                      {space.bannerUrl ? (
                        <>
                          <img 
                            src={space.bannerUrl} 
                            alt="" 
                            className="absolute inset-0 w-full h-full object-cover filter blur-[1.5px] brightness-[0.6] select-none pointer-events-none" 
                            style={{
                              objectPosition: `${space.settings?.bannerPositionX ?? 50}% ${space.settings?.bannerPositionY ?? 50}%`,
                              transform: `scale(${ (space.settings?.bannerScale ?? 1) * 1.08 })`,
                            }}
                          />
                          <div 
                            className="absolute inset-0 bg-gradient-to-l from-black/95 via-black/60 to-black/25 pointer-events-none z-0" 
                          />
                        </>
                      ) : (
                        <div className="absolute inset-0 bg-[#5865f2]/5" />
                      )}
                      
                      <div className="flex items-center gap-3 overflow-hidden relative z-10 w-full">
                        {space.iconUrl ? (
                          <img src={space.iconUrl} alt={space.name} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-white/10" />
                        ) : (
                          <div className="w-7 h-7 rounded-lg bg-[#35373c] flex items-center justify-center shrink-0 border border-white/5">
                            <span className="text-xs font-bold text-[#dbdee1]">{space.name.substring(0, 1)}</span>
                          </div>
                        )}
                        <span className="font-semibold text-sm text-white truncate flex items-center gap-1.5">
                          {space.name}
                          {space.settings?.verification && (
                            <span title="Verified Space">
                              <ShieldCheck size={14} className="text-[#5865f2] fill-[#5865f2]/10 shrink-0" />
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Details content */}
                    <div className="px-4 py-3 flex-1 flex flex-col justify-between min-h-0 bg-[#2b2d31] rounded-b-lg">
                      <p className="text-[12px] text-[#949ba4] line-clamp-2 leading-normal flex-1">
                        {space.description || "No description provided."}
                      </p>

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#949ba4] uppercase tracking-wider">
                          <Users size={11} className="text-[#23a55a]" />
                          <span>{(space.members.length + (space.insights?.activeMembers || 0)).toLocaleString()} Online</span>
                        </div>

                        <button
                          onClick={() => !isJoined && handleJoin(space.id)}
                          disabled={isJoined}
                          className={cn(
                            "h-7 px-4 rounded text-xs font-bold transition-colors",
                            isJoined 
                              ? "bg-[#35373c] text-[#949ba4] cursor-not-allowed" 
                              : "bg-[#23a55a] hover:bg-[#1a7f45] text-white"
                          )}
                        >
                          {isJoined ? 'Joined' : 'Join'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-24 text-center border border-dashed border-white/5 rounded-lg bg-[#2b2d31]/20">
              <Search size={32} className="mx-auto mb-3 text-[#949ba4] opacity-30" />
              <h3 className="text-sm font-bold text-white mb-1 tracking-wide">No Spaces Found</h3>
              <p className="text-xs text-[#949ba4]">Try searching for another keyword or check a different category.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
