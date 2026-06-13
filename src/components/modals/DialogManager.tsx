import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ConfirmationModal } from './ConfirmationModal';
import { TextInputModal } from './TextInputModal';

export function DialogManager() {
  const { dialog, closeDialog } = useAppStore();

  if (!dialog) return null;

  if (dialog.type === 'confirm') {
    return (
      <ConfirmationModal
        isOpen={dialog.isOpen}
        onClose={closeDialog}
        onConfirm={() => dialog.onConfirm()}
        title={dialog.title}
        description={dialog.description}
        confirmLabel={dialog.confirmLabel}
        cancelLabel={dialog.cancelLabel}
        isDanger={dialog.isDanger}
      />
    );
  }

  return (
    <TextInputModal
      isOpen={dialog.isOpen}
      onClose={closeDialog}
      onConfirm={(value) => dialog.onConfirm(value)}
      title={dialog.title}
      description={dialog.description}
      placeholder={dialog.placeholder}
      defaultValue={dialog.defaultValue}
      confirmLabel={dialog.confirmLabel}
      cancelLabel={dialog.cancelLabel}
    />
  );
}
