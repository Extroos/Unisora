import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { Folder } from 'lucide-react';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = ['#5865f2', '#ed4245', '#3ba55c', '#faa61a', '#eb459e', '#7289da'];

export function CreateFolderModal({ isOpen, onClose }: CreateFolderModalProps) {
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const addFolder = useAppStore(state => state.addFolder);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addFolder(name.trim(), selectedColor);
    setName('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Folder" size="sm">
      <form onSubmit={handleSubmit}>
        <ModalBody className="space-y-6">
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">Folder Name</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
                <Folder size={16} style={{ color: selectedColor }} />
              </span>
              <input
                autoFocus
                type="text"
                placeholder="Work, Gaming, Dev..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-2 border border-border rounded py-2 pl-9 pr-4 text-sm font-bold text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
                maxLength={32}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">Folder Color</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(color => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-8 h-8 rounded-full border-2 transition-all cursor-pointer hover:scale-105"
                  style={{ 
                    backgroundColor: color,
                    borderColor: selectedColor === color ? 'white' : 'transparent',
                    transform: selectedColor === color ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={!name.trim()}>
            Create Folder
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
