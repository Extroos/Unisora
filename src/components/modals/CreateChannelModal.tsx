import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { Hash, Volume2, Megaphone, Mic } from 'lucide-react';
import { cn } from '../../lib/utils';

interface CreateChannelModalProps {
  isOpen: boolean;
  onClose: () => void;
  categoryId: string;
}

export function CreateChannelModal({ isOpen, onClose, categoryId }: CreateChannelModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'text' | 'voice' | 'announcement' | 'stage'>('text');
  const { activeServerId, channels } = useAppStore();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && activeServerId) {
      useAppStore.getState().addChannel(
        activeServerId,
        categoryId,
        name.trim().toLowerCase().replace(/\s+/g, '-'),
        type as any,
        type === 'stage' // isStage is true if type is stage
      );
      setName('');
      setType('text');
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Channel" size="md">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">Channel Type</label>
            <div className="grid grid-cols-2 gap-2">
              <ChannelTypeBtn 
                active={type === 'text'} 
                onClick={() => setType('text')} 
                icon={<Hash size={20} />} 
                title="Text" 
                desc="Chat, files, and more." 
              />
              <ChannelTypeBtn 
                active={type === 'voice'} 
                onClick={() => setType('voice')} 
                icon={<Volume2 size={20} />} 
                title="Voice" 
                desc="Audio and video." 
              />
              <ChannelTypeBtn 
                active={type === 'announcement'} 
                onClick={() => setType('announcement')} 
                icon={<Megaphone size={20} />} 
                title="News" 
                desc="Announcement broadcast." 
              />
              <ChannelTypeBtn 
                active={type === 'stage'} 
                onClick={() => setType('stage')} 
                icon={<Mic size={20} />} 
                title="Stage" 
                desc="Moderated live events." 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1.5 block">Channel Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                {type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />}
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="environment-id"
                className="w-full bg-surface-2 border border-border rounded py-2 pl-9 pr-4 text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                autoFocus
              />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            Create Channel
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function ChannelTypeBtn({ active, onClick, icon, title, desc }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col gap-2 p-3 rounded border transition-all text-left",
        active 
          ? "bg-surface-3 border-accent shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)]" 
          : "bg-surface-2 border-border hover:bg-surface-3 hover:border-border-hover"
      )}
    >
      <div className="flex items-center justify-between">
        <div className={cn("text-text-muted", active && "text-accent")}>
          {icon}
        </div>
        <div className={cn(
          "w-4 h-4 rounded-full border border-border flex items-center justify-center transition-all",
          active && "border-accent bg-accent"
        )}>
          {active && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
        </div>
      </div>
      <div>
        <h4 className={cn("text-xs font-black uppercase tracking-wider", active ? "text-white" : "text-text-primary")}>{title}</h4>
        <p className="text-[10px] text-text-muted font-bold uppercase tracking-tight leading-tight mt-0.5">{desc}</p>
      </div>
    </button>
  );
}
