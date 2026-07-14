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
      title={
        <>
          <span className="block font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            Just checking
          </span>
          <span className="block text-lg sm:text-xl font-bold tracking-tight">
            {title}
          </span>
        </>
      }
      maxWidth="sm"
      footer={
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isPending}
            className="h-11 text-muted-foreground hover:text-foreground active:scale-[0.97] transition-transform duration-150 tap-target"
          >
            Cancel
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isPending}
            className={
              confirmVariant === 'destructive'
                ? 'h-11 px-6 text-sm font-bold uppercase tracking-wider active:scale-[0.97] transition-transform duration-150'
                : 'h-11 px-6 text-sm font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150'
            }
          >
            {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-4 py-1">
        <p className="text-[15px] leading-relaxed text-foreground/80 antialiased">{message}</p>
        {warningMessage && (
          <div className="flex items-start gap-2.5 p-3.5 bg-warning/[0.07] rounded-xl">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" aria-hidden="true" />
            <p className="text-[13px] leading-relaxed text-foreground/80 antialiased">{warningMessage}</p>
          </div>
        )}
      </div>
    </Modal>
  );
}
