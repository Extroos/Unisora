import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Check, Search, UserPlus } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  dmId: string;
}

export function AddMembersModal({ isOpen, onClose, dmId }: AddMembersModalProps) {
  const { friends, users, dmChannels, addParticipantsToGroup } = useAppStore();
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const dm = dmChannels[dmId];
  if (!dm) return null;

  // Filter friends based on search AND they shouldn't be in the DM already
  const filteredFriends = friends.filter(id => {
    const user = users[id];
    if (!user) return false;
    if (dm.participants.includes(id)) return false;
    return user.username.toLowerCase().includes(search.toLowerCase());
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else {
      if (dm.participants.length + next.size >= 10) return; // Limit total members
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleAdd = () => {
    if (selectedIds.size === 0) return;
    addParticipantsToGroup(dmId, Array.from(selectedIds));
    setSelectedIds(new Set());
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Friends" size="md">
      <div className="flex flex-col h-[450px]">
        <div className="px-5 pt-4 pb-2 shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search for friends"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                    onClick={() => toggleSelect(id)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-1.5 rounded transition-all group",
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
            onClick={onClose} 
            className="text-[13px] font-medium text-text-secondary hover:underline transition-all px-4 h-10"
          >
            Cancel
          </button>
          <Button 
            variant="primary" 
            onClick={handleAdd} 
            disabled={selectedIds.size === 0}
            className="h-10 px-8 text-sm font-bold"
          >
            Invite to Group
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
