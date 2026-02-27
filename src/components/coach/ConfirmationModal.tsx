import { useState, useCallback } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  warningMessage?: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warningMessage,
  confirmLabel,
  confirmVariant = 'default',
}: ConfirmationModalProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = useCallback(async () => {
    if (isPending) return; // double-click guard
    setIsPending(true);
    try {
      await onConfirm();
    } finally {
      setIsPending(false);
    }
  }, [onConfirm, isPending]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={isPending ? () => {} : onClose}
      title={title}
      maxWidth="sm"
      footer={
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <p className="text-muted-foreground">{message}</p>
        {warningMessage && (
          <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-sm text-warning">{warningMessage}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
