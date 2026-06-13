import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';

interface CreateInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  serverId: string;
}

const EXPIRATION_OPTIONS = [
  { id: '24h', label: '24 Hours', value: 24 * 60 * 60 * 1000 },
  { id: '7d', label: '7 Days', value: 7 * 24 * 60 * 60 * 1000 },
  { id: '30d', label: '30 Days (Month)', value: 30 * 24 * 60 * 60 * 1000 },
  { id: 'infinite', label: 'Never (Infinite)', value: null }
];

export function CreateInviteModal({ isOpen, onClose, serverId }: CreateInviteModalProps) {
  const createInvite = useAppStore(state => state.createInvite);
  const servers = useAppStore(state => state.servers);
  
  const [expiration, setExpiration] = useState('24h');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const activeServer = servers.find(s => s.id === serverId);

  const handleGenerate = () => {
    const selectedOpt = EXPIRATION_OPTIONS.find(opt => opt.id === expiration);
    const expiresAt = selectedOpt && selectedOpt.value 
      ? new Date(Date.now() + selectedOpt.value).toISOString() 
      : undefined;

    const code = createInvite(serverId, { expiresAt });
    setGeneratedCode(code);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!generatedCode) return;
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setGeneratedCode(null);
    setCopied(false);
    onClose();
  };

  const getExpirationText = () => {
    if (expiration === 'infinite') return 'Your invite code is permanent and will never expire.';
    const label = EXPIRATION_OPTIONS.find(opt => opt.id === expiration)?.label;
    return `Your invite code will expire in ${label?.toLowerCase()}.`;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose} 
      title={`Invite to ${activeServer?.name || 'Space'}`} 
      size="sm"
    >
      <ModalBody className="space-y-5">
        {!generatedCode ? (
          <div className="space-y-4 py-1">
            <p className="text-xs text-text-secondary leading-relaxed">
              Create a code to invite others to this Space. You can customize how long the code remains valid below before generating it.
            </p>

            <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-text-secondary block">Code Expiration</span>
                <span className="text-[10px] text-text-muted block leading-normal">
                  {getExpirationText()}
                </span>
              </div>
              <div className="relative shrink-0">
                <select
                  value={expiration}
                  onChange={(e) => setExpiration(e.target.value)}
                  className="bg-surface-2 border border-border text-text-secondary text-xs rounded px-3 py-2 font-semibold focus:outline-none focus:border-accent cursor-pointer transition-colors"
                >
                  {EXPIRATION_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Your Space Invite Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedCode}
                  className="flex-1 bg-surface-3 border border-border rounded px-3 py-2 text-sm font-mono text-text-primary focus:outline-none"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  variant={copied ? 'secondary' : 'primary'}
                  size="sm"
                  onClick={handleCopy}
                  className="px-5 font-bold transition-all shrink-0"
                >
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
            
            <p className="text-[10px] text-text-muted">
              {getExpirationText()}
            </p>
          </div>
        )}
      </ModalBody>
      <ModalFooter className="bg-surface-2/40">
        {!generatedCode ? (
          <>
            <Button variant="ghost" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGenerate}>
              Generate Code
            </Button>
          </>
        ) : (
          <Button variant="primary" onClick={handleClose} className="w-full">
            Done
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
}
