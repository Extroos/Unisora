import React, { useState } from 'react';
import { Modal, ModalBody, ModalFooter } from '../ui/Modal';
import { useAppStore } from '../../store/useAppStore';
import { Button } from '../ui/Button';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Status = 'idle' | 'loading' | 'success' | 'error';

export function AddFriendModal({ isOpen, onClose }: AddFriendModalProps) {
  const [username, setUsername] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const sendFriendRequest = useAppStore(state => state.sendFriendRequest);

  const handleClose = () => {
    setUsername('');
    setStatus('idle');
    setMessage('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || status === 'loading') return;

    setStatus('loading');
    setMessage('');

    const result = await sendFriendRequest(trimmed);

    if (result.success) {
      setStatus('success');
      setMessage(`Friend request sent to ${trimmed}!`);
      setUsername('');
      // Auto-close after a brief success display
      setTimeout(() => {
        handleClose();
      }, 1800);
    } else {
      setStatus('error');
      setMessage(result.error || 'Failed to send request.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Friend" size="md">
      <form onSubmit={handleSubmit} className="flex flex-col">
        <ModalBody>
          <p className="text-[11px] text-text-muted font-bold uppercase tracking-widest mb-3">
            Friend's Username
          </p>
          <div className="relative">
            <input
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (status !== 'idle') {
                  setStatus('idle');
                  setMessage('');
                }
              }}
              placeholder="Enter exact username..."
              className="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-all"
              autoFocus
              disabled={status === 'loading'}
            />
          </div>

          {/* Feedback message */}
          {status === 'success' && (
            <div className="mt-3 flex items-center gap-2 text-success text-sm font-semibold animate-in fade-in slide-in-from-top-1">
              <CheckCircle size={16} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {status === 'error' && (
            <div className="mt-3 flex items-center gap-2 text-danger text-sm font-semibold animate-in fade-in slide-in-from-top-1">
              <XCircle size={16} className="shrink-0" />
              <span>{message}</span>
            </div>
          )}
          {status === 'idle' && (
            <p className="text-[10px] text-text-muted mt-2 font-medium">
              You can add friends with their exact username. Usernames are case-insensitive.
            </p>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={handleClose}
            className="text-[13px] font-medium text-text-secondary hover:underline transition-all px-4"
          >
            Cancel
          </button>
          <Button
            variant="primary"
            type="submit"
            disabled={!username.trim() || status === 'loading' || status === 'success'}
            className="h-10 px-8 text-sm font-bold flex items-center gap-2"
          >
            {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
            {status === 'loading' ? 'Sending...' : 'Send Request'}
          </Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
