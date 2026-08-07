import { useState, useCallback, useEffect, useId } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDialogBehavior } from '@/hooks/useDialogBehavior';
import { cn, noWidows } from '@/lib/utils';
import { AlertTriangle, Check, HelpCircle, Loader2, X, type LucideIcon } from 'lucide-react';

type ConfirmIntent = 'default' | 'destructive';

/**
 * One accent runs the length of the dialog — the medallion, the consequence
 * rail and the confirm button all speak in the same colour, so the weight of
 * the action is legible before a word is read. Destructive takes the brand's
 * red; everything else takes volt, the same lime that fires "Start workout".
 *
 * The medallion is a solid fill rather than a tinted one on purpose: at 10%
 * over near-black, both accents collapse into the dark-theme background.
 */
const INTENT_STYLES: Record<
  ConfirmIntent,
  { medallion: string; rail: string; confirm: string; icon: LucideIcon }
> = {
  default: {
    medallion: 'bg-brand text-brand-foreground',
    rail: 'bg-brand',
    confirm: 'bg-brand text-brand-foreground hover:bg-brand/90',
    icon: HelpCircle,
  },
  destructive: {
    medallion: 'bg-destructive text-destructive-foreground',
    rail: 'bg-destructive',
    confirm: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
    icon: AlertTriangle,
  },
};

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
  confirmVariant?: ConfirmIntent;
  /** When set, the confirm button stays locked until this exact text is
   * typed — the deliberate-friction rail for weighty actions. */
  requireText?: string;
  /** Glyph for the medallion. Pass the verb of the action (Trash2, LogOut,
   *  RotateCcw) so the dialog is recognisable before it is read; falls back
   *  to the intent's own icon. */
  icon?: LucideIcon;
  /** Mono kicker above the title. Defaults to the house "Just checking". */
  eyebrow?: string;
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
  icon,
  eyebrow = 'Just checking',
}: ConfirmationModalProps) {
  const [isPending, setIsPending] = useState(false);
  const [typed, setTyped] = useState('');
  const titleId = useId();
  const messageId = useId();

  // Fresh challenge every time the modal opens
  useEffect(() => {
    if (isOpen) setTyped('');
  }, [isOpen]);

  // An in-flight action owns the dialog: no backdrop, Escape or X out from
  // under a request that is already on the wire
  const requestClose = useCallback(() => {
    if (!isPending) onClose();
  }, [isPending, onClose]);

  const panelRef = useDialogBehavior({ isOpen, onClose: requestClose });

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

  if (!isOpen) return null;

  const styles = INTENT_STYLES[confirmVariant];
  const Icon = icon ?? styles.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 backdrop-blur-sm sm:items-center sm:p-4 animate-in fade-in-0 duration-200 motion-reduce:animate-none"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      {/* Bottom sheet on mobile, centred card on desktop. Header and footer
          hold their ground; only the message column scrolls, so a long
          consequence block never strands the buttons off-screen. */}
      <div
        ref={panelRef}
        tabIndex={-1}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative flex w-full max-h-[calc(100dvh-2.5rem)] flex-col overflow-hidden rounded-t-2xl bg-background text-foreground pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-border focus:outline-none sm:max-h-[85vh] sm:max-w-md sm:rounded-2xl sm:pb-0 animate-in fade-in-0 slide-in-from-bottom-4 duration-200 sm:slide-in-from-bottom-0 sm:zoom-in-95 motion-reduce:animate-none"
      >
        {/* Positioning lives on the wrapper — .tap-target sets position:
            relative and would override `absolute` on the button itself */}
        <div className="absolute right-2.5 top-4 z-10 sm:right-3.5 sm:top-5">
          <button
            type="button"
            onClick={requestClose}
            disabled={isPending}
            aria-label="Close"
            className="tap-target flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="shrink-0 px-5 pt-5 sm:px-7 sm:pt-6">
          <div className="flex items-start gap-3.5 pr-9">
            <span
              className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-full animate-bounce-once',
                styles.medallion
              )}
            >
              <Icon className="h-[22px] w-[22px]" strokeWidth={2} aria-hidden="true" />
            </span>
            <div className="min-w-0 pt-0.5">
              <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {eyebrow}
              </span>
              <h2
                id={titleId}
                className="mt-1 text-lg font-bold leading-tight tracking-tight text-balance text-foreground sm:text-xl"
              >
                {noWidows(title)}
              </h2>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-4 sm:px-7 sm:pb-6">
          <p
            id={messageId}
            className="text-pretty text-[15px] leading-[1.6] text-foreground/80 antialiased"
          >
            {noWidows(message)}
          </p>

          {warningMessage && (
            <div className="mt-4 flex overflow-hidden rounded-xl bg-muted/70">
              <span className={cn('w-[3px] shrink-0', styles.rail)} aria-hidden="true" />
              <div className="px-3.5 py-3">
                <span className="block font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  What happens
                </span>
                <p className="mt-1.5 text-pretty text-[13px] leading-relaxed text-foreground/75 antialiased">
                  {noWidows(warningMessage)}
                </p>
              </div>
            </div>
          )}

          {requireText && (
            <div className="mt-5">
              <label
                htmlFor="confirmation-modal-text"
                className="mb-2 block text-pretty font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground"
              >
                Type{' '}
                <span className="font-sans font-semibold normal-case tracking-normal text-foreground">
                  {requireText}
                </span>{' '}
                {/* bound so "confirm" never drops to a line of its own */}
                to{'\u00A0'}confirm
              </label>
              <div className="relative">
                <Input
                  id="confirmation-modal-text"
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  placeholder={requireText}
                  disabled={isPending}
                  autoComplete="off"
                  className="h-11 pr-10 font-mono text-[15px] sm:text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && textConfirmed && !isPending) {
                      e.preventDefault();
                      handleConfirm();
                    }
                  }}
                />
                {typed.length > 0 && textConfirmed && (
                  <Check
                    className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-success-text animate-set-complete"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tinted tray gives the choice pair a floor of its own */}
        <div className="shrink-0 border-t border-border bg-muted/40 px-5 py-4 sm:px-7">
          <div className="flex gap-2.5 sm:justify-end">
            <Button
              variant="outline"
              onClick={requestClose}
              disabled={isPending}
              className="h-11 flex-1 font-medium transition-transform duration-150 active:scale-[0.97] sm:flex-initial sm:px-5"
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isPending || !textConfirmed}
              className={cn(
                'h-11 flex-1 text-sm font-bold uppercase tracking-wider transition-transform duration-150 active:scale-[0.97] sm:flex-initial sm:px-7',
                styles.confirm
              )}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
