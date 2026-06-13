import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrl = e.ctrlKey || e.metaKey;

      // Ctrl+, → Settings
      if (isCtrl && e.key === ',') {
        e.preventDefault();
        useAppStore.getState().setSettingsOpen(true);
      }

      // Ctrl+K → Focus search (dispatches custom event picked up by ChatArea)
      if (isCtrl && e.key === 'k') {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('nexus:open-search'));
      }

      // Escape → Close modals
      if (e.key === 'Escape') {
        const state = useAppStore.getState();
        if (state.isSettingsOpen) {
          useAppStore.getState().setSettingsOpen(false);
        } else if (state.isNotificationsOpen) {
          useAppStore.getState().setNotificationsOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
