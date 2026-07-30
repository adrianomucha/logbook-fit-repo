import { useState, useCallback, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  warningMessage?: string;
  confirmLabel: string;
  /** Label for the dismiss button. Defaults to "Cancel"; override when a
   *  flow-specific word reads better ("Keep going" mid-workout). */
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  /** When set, the confirm button stays locked until this exact text is
   * typed — the deliberate-friction rail for weighty actions. */
  requireText?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warningMessage,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  requireText,
}: ConfirmationModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [typed, setTyped] = useState('');

  // Fresh challenge every time the modal opens
  useEffect(() => {
    if (isOpen) setTyped('');
  }, [isOpen]);

  const textConfirmed =
    !requireText || typed.trim().toLowerCase() === requireText.trim().toLowerCase();

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
            {cancelLabel}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={isPending || !textConfirmed}
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
        {requireText && (
          <div>
            <label
              htmlFor="confirmation-modal-text"
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium mb-2 block"
            >
              Type <span className="text-foreground normal-case tracking-normal font-sans font-semibold">{requireText}</span> to confirm
            </label>
            <Input
              id="confirmation-modal-text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requireText}
              disabled={isPending}
              autoComplete="off"
              className="h-11"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && textConfirmed && !isPending) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
