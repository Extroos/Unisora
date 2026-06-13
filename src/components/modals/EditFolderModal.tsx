import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Folder, Trash2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';

interface EditFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  folderId: string;
}

const COLORS = ['#5865f2', '#ed4245', '#3ba55c', '#faa61a', '#eb459e', '#7289da'];

export function EditFolderModal({ isOpen, onClose, folderId }: EditFolderModalProps) {
  const { folders, updateFolder, deleteFolder } = useAppStore();
  const folder = folders.find(f => f.id === folderId);
  
  const [name, setName] = useState(folder?.name || '');
  const [color, setColor] = useState(folder?.color || '#5865f2');

  React.useEffect(() => {
    if (folder) {
      setName(folder.name);
      setColor(folder.color || '#5865f2');
    }
  }, [folder]);

  const handleSave = () => {
    if (name.trim()) {
      updateFolder(folderId, { name: name.trim(), color });
      onClose();
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete the folder "${folder?.name}"? Servers will be moved back to the main list.`)) {
      deleteFolder(folderId);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-10000 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-sm bg-surface-1 rounded-2xl border border-border shadow-2xl overflow-hidden"
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-surface-2 border border-border flex items-center justify-center">
                  <Folder size={20} style={{ color }} />
                </div>
                <h2 className="text-xl font-bold text-white">Edit Folder</h2>
              </div>
              <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Folder Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 text-white focus:outline-none focus:border-accent/40 transition-all"
                  placeholder="Enter folder name..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Folder Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className="w-8 h-8 rounded-full border-2 transition-all"
                      style={{ 
                        backgroundColor: c, 
                        borderColor: color === c ? 'white' : 'transparent',
                        transform: color === c ? 'scale(1.1)' : 'scale(1)'
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex flex-col gap-3">
                <Button onClick={handleSave} className="w-full py-6 rounded-xl font-bold">Save Changes</Button>
                <button 
                  onClick={handleDelete}
                  className="flex items-center justify-center gap-2 py-3 text-sm font-bold text-danger hover:bg-danger/10 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                  Delete Folder
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
