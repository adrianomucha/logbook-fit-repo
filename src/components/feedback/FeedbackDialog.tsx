'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Bug, CheckCircle2, Lightbulb, Loader2, MessageCircle, Send } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FormError } from '@/components/ui/form-error';
import { apiFetch, ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';

const MESSAGE_MAX_LENGTH = 2000;

const CATEGORIES = [
  { value: 'BUG', label: 'Something broke', icon: Bug },
  { value: 'IDEA', label: 'An idea', icon: Lightbulb },
  { value: 'OTHER', label: 'Something else', icon: MessageCircle },
] as const;

type Category = (typeof CATEGORIES)[number]['value'];

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * "Send feedback" dialog, opened from the account menu — the one channel any
 * signed-in coach or client has straight to the owner. Deliberately three
 * fields short (category, message, and a path captured silently): a feedback
 * form that feels like a form doesn't get filled in.
 */
export function FeedbackDialog({ isOpen, onClose }: FeedbackDialogProps) {
  const pathname = usePathname();
  const [category, setCategory] = useState<Category>('IDEA');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form on every open — a sent message must never linger into the
  // next open looking unsent
  useEffect(() => {
    if (!isOpen) return;
    setCategory('IDEA');
    setMessage('');
    setIsSending(false);
    setIsSent(false);
    setError(null);
  }, [isOpen]);

  const send = async () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    setError(null);
    try {
      await apiFetch('/api/feedback', {
        method: 'POST',
        body: JSON.stringify({
          category,
          message: trimmed,
          // Where the dialog was opened, for "which screen was broken" context
          pageUrl: pathname ?? undefined,
        }),
      });
      setIsSent(true);
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? e.message
          : 'Couldn’t send that. Try again.'
      );
    } finally {
      setIsSending(false);
    }
  };

  // Only ever open after a click, so document is guaranteed to exist by the
  // time the portal renders (and SSR never sees it)
  if (!isOpen) return null;

  // Portal to <body>: this dialog is triggered from the account menu inside
  // the sticky app header, whose backdrop-blur makes the header the
  // containing block for fixed descendants — rendered in place, the overlay
  // would pin to the header instead of the viewport.
  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Send feedback"
      description="Report a bug, suggest an idea, or say anything about Logbook."
      footer={
        isSent ? (
          <div className="flex justify-end">
            <Button onClick={onClose}>Done</Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={onClose} disabled={isSending}>
              Cancel
            </Button>
            <Button onClick={send} disabled={isSending || !message.trim()}>
              {isSending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Send
            </Button>
          </div>
        )
      }
    >
      {isSent ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <CheckCircle2 className="h-8 w-8 text-brand" aria-hidden="true" />
          <div>
            <p className="font-medium text-foreground">Thanks — got it.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Every note gets read. It genuinely shapes what gets built next.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              What kind of feedback?
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label="Feedback category"
            >
              {CATEGORIES.map(({ value, label, icon: Icon }) => {
                const isActive = category === value;
                return (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    onClick={() => setCategory(value)}
                    className={cn(
                      'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target',
                      isActive
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="feedback-message"
              className="mb-2 block text-sm font-medium text-foreground"
            >
              {category === 'BUG'
                ? 'What happened?'
                : category === 'IDEA'
                  ? 'What should Logbook do?'
                  : 'What’s on your mind?'}
            </label>
            <Textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              rows={5}
              autoFocus
              placeholder={
                category === 'BUG'
                  ? 'What did you do, and what went wrong?'
                  : 'The rough shape is plenty — no need to polish it.'
              }
            />
            {message.length >= MESSAGE_MAX_LENGTH - 200 && (
              <p className="mt-1 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
                {message.length}/{MESSAGE_MAX_LENGTH}
              </p>
            )}
          </div>

          {error && <FormError>{error}</FormError>}
        </div>
      )}
    </Modal>,
    document.body
  );
}
