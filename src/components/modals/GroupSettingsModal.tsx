import React, { useState, useRef } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { Avatar } from '../ui/Avatar';
import { Camera, Trash2, LogOut, UserMinus, ShieldAlert, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface GroupSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  dmId: string;
}

export function GroupSettingsModal({ isOpen, onClose, dmId }: GroupSettingsModalProps) {
  const { 
    dmChannels, 
    users, 
    currentUser, 
    renameGroupDm, 
    changeGroupDmAvatar, 
    removeParticipantFromGroup,
    leaveGroupDm,
    openDialog
  } = useAppStore();

  const dm = dmChannels[dmId];
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!dm) return null;

  const [groupName, setGroupName] = useState(dm.name || '');
  const [isUploading, setIsUploading] = useState(false);
  const isOwner = dm.ownerId === currentUser?.id;

  const handleSaveName = () => {
    if (groupName.trim() && groupName !== dm.name) {
      renameGroupDm(dmId, groupName.trim());
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      if (typeof reader.result === 'string') {
        try {
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileData: reader.result, fileName: file.name })
          });
          if (uploadRes.ok) {
            const uploadData = await uploadRes.json();
            changeGroupDmAvatar(dmId, uploadData.url);
          }
        } catch (err) {
          console.error('Group photo upload failed:', err);
        } finally {
          setIsUploading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLeaveGroup = () => {
    openDialog({
      type: 'confirm',
      title: 'Leave Group',
      description: 'Are you sure you want to leave this group? You will need to be re-invited to join again.',
      confirmLabel: 'Leave Group',
      isDanger: true,
      onConfirm: () => {
        leaveGroupDm(dmId);
        onClose();
      }
    });
  };

  const handleRemoveMember = (userId: string, username: string) => {
    openDialog({
      type: 'confirm',
      title: 'Remove Member',
      description: `Are you sure you want to remove ${username} from the group?`,
      confirmLabel: 'Remove',
      isDanger: true,
      onConfirm: () => {
        removeParticipantFromGroup(dmId, userId);
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Group Settings" size="md">
      <div className="flex flex-col h-[520px]">
        <ModalBody className="p-6 space-y-6 overflow-y-auto hidden-scrollbar">
          {/* Avatar Settings */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group/avatar cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <Avatar 
                src={dm.avatarUrl} 
                alt={dm.name || 'Group'} 
                size="xl" 
                showStatus={false}
                className="w-24 h-24 rounded-2xl border-2 border-border group-hover/avatar:opacity-80 transition-all"
              />
              <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-all">
                <Camera size={24} className="text-white" />
              </div>
              {isUploading && (
                <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              accept="image/*" 
              className="hidden" 
              onChange={handleFileChange}
            />
            <span className="text-[11px] text-text-muted font-bold uppercase tracking-wider">
              Click photo to upload new avatar
            </span>
          </div>

          {/* Group Name input */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
              Group Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="flex-1 bg-surface-2 border border-border rounded px-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-accent/40 transition-all"
              />
              <Button 
                variant="primary" 
                size="sm"
                onClick={handleSaveName}
                disabled={!groupName.trim() || groupName === dm.name}
                className="px-4 text-xs font-bold"
              >
                Save
              </Button>
            </div>
          </div>

          {/* Members list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Members ({dm.participants.length})
              </label>
              {isOwner && (
                <span className="text-[9px] text-accent font-bold uppercase tracking-wider bg-accent/10 px-2 py-0.5 rounded">
                  Group Creator
                </span>
              )}
            </div>
            <div className="bg-surface-2 border border-border rounded-lg p-2 space-y-1 divide-y divide-border/20 max-h-[160px] overflow-y-auto hidden-scrollbar">
              {dm.participants.map(pId => {
                const user = users[pId];
                if (!user) return null;
                const isUserOwner = pId === dm.ownerId;
                const isMe = pId === currentUser?.id;

                return (
                  <div key={pId} className="flex items-center justify-between py-1.5 px-2 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-2">
                      <Avatar src={user.avatarUrl} alt={user.username} size="xs" status={user.status} />
                      <span className="text-xs font-bold text-text-secondary truncate">
                        {user.username} {isMe && <span className="text-text-muted font-normal">(You)</span>}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUserOwner ? (
                        <span className="text-[9px] text-accent/80 font-bold uppercase tracking-widest">
                          Owner
                        </span>
                      ) : (
                        isOwner && !isMe && (
                          <button
                            onClick={() => handleRemoveMember(pId, user.username)}
                            className="p-1 rounded text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                            title="Remove Member"
                          >
                            <UserMinus size={13} />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ModalBody>

        <ModalFooter className="justify-between bg-surface-2/40">
          <button
            onClick={handleLeaveGroup}
            className="flex items-center gap-2 px-3 py-1.5 rounded text-xs font-bold text-danger hover:bg-danger/10 transition-colors uppercase tracking-wider"
          >
            <LogOut size={13} />
            Leave Group
          </button>
          <Button variant="secondary" onClick={onClose} className="px-4 text-xs font-bold">
            Close
          </Button>
        </ModalFooter>
      </div>
    </Modal>
  );
}
