import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Check, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CreateGroupDmModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateGroupDmModal({ isOpen, onClose }: CreateGroupDmModalProps) {
  const { friends, users, dmChannels, createGroupDm, setActiveDm } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter friends based on search
  const filteredFriends = friends.filter(id => {
    const user = users[id];
    if (!user) return false;
    if (search && !user.username.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      if (newSet.size >= 9) return; // Max 9 other users (10 total)
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.size === 1) {
      const targetFriendId = Array.from(selectedIds)[0] as string;
      const existingDm = Object.values(dmChannels).find(dm => 
        dm.participants.length === 2 && dm.participants.includes(targetFriendId)
      );
      if (existingDm) {
        setActiveDm(existingDm.id);
      } else {
        setActiveDm(targetFriendId);
      }
      setSelectedIds(new Set());
      setSearch('');
      onClose();
    } else if (selectedIds.size > 1) {
      const dmId = await createGroupDm(Array.from(selectedIds));
      if (dmId) {
        setActiveDm(dmId);
      }
      setSelectedIds(new Set());
      setSearch('');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Select Friends" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col h-[450px]">
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Type the username of a friend"
              className="w-full bg-surface-2 border border-border rounded py-1.5 pl-9 pr-4 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-all"
              autoFocus
            />
          </div>
        </div>

        <ModalBody className="p-2 pt-0">
          {filteredFriends.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
              <Search size={24} className="mb-2" />
              <p className="text-[11px] font-bold uppercase tracking-widest">No friends found</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredFriends.map(id => {
                const user = users[id];
                if (!user) return null;
                const isSelected = selectedIds.has(id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleSelection(id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded transition-all group text-left",
                      isSelected ? "bg-surface-3" : "hover:bg-surface-2"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={user.avatarUrl} alt={user.username} size="xs" status={user.status} />
                      <span className={cn("text-sm font-bold truncate transition-colors", isSelected ? "text-white" : "text-text-secondary group-hover:text-text-primary")}>
                        {user.username}
                      </span>
                    </div>
                    <div className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center transition-all",
                      isSelected ? "bg-accent border-accent text-white" : "border-border group-hover:border-text-muted"
                    )}>
                      {isSelected && <Check size={10} strokeWidth={4} />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mr-auto">
            {selectedIds.size} Selected
          </span>
          <button 
            type="button"
            onClick={onClose} 
            className="text-[13px] font-medium text-text-secondary hover:underline transition-all px-4 h-10"
          >
            Cancel
          </button>
          <Button 
            variant="primary" 
            type="submit" 
            disabled={selectedIds.size === 0}
            className="h-10 px-8 text-sm font-bold"
          >
            Create Group
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
