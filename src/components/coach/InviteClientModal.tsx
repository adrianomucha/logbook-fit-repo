import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Share2, RefreshCw, Plus, Loader2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { apiFetch } from '@/lib/api-client';

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InviteResult {
  id: string;
  token: string;
  email: string | null;
  note: string | null;
  expiresAt: string;
  inviteLink: string;
}

const NOTE_MAX_LENGTH = 280;

const canNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

/**
 * One filled surface per field — the only boxes in the modal. The control sits
 * borderless inside it so the field reads as a single object, not a stack of
 * label + box + hint.
 */
function FieldShell({
  label,
  htmlFor,
  trailing,
  children,
}: {
  label: string;
  htmlFor: string;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-muted/40 overflow-hidden transition-colors focus-within:border-foreground/25 focus-within:bg-background">
      <div className="flex items-baseline justify-between gap-2 px-4 pt-3">
        <label
          htmlFor={htmlFor}
          className="font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
        >
          {label}
        </label>
        {trailing}
      </div>
      {children}
    </div>
  );
}

/** Small pill action — the quiet tier, so nothing competes with Copy link */
function Chip({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 h-8 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 tap-target"
    >
      {children}
    </button>
  );
}

export function InviteClientModal({ isOpen, onClose }: InviteClientModalProps) {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  // Email/note baked into the currently shown invite — lets us skip needless regen
  const [appliedEmail, setAppliedEmail] = useState('');
  const [appliedNote, setAppliedNote] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Replacing a link is destructive, so the warning shows at the moment of the
  // decision instead of sitting on screen permanently
  const [confirmNew, setConfirmNew] = useState(false);
  // Guard so React strict-mode / re-renders don't double-generate on open
  const generatedForOpen = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const fullLink = invite ? `${window.location.origin}${invite.inviteLink}` : '';

  const expiresLabel = invite
    ? new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const generate = useCallback(
    async (emailToBake: string, noteToBake: string, replacing?: InviteResult | null) => {
      setIsGenerating(true);
      setError(null);
      setConfirmNew(false);
      try {
        // Replace, don't stack: kill the previous link from this modal so a
        // regenerated invite doesn't leave a live orphan floating around
        if (replacing) {
          await apiFetch(`/api/invites/${replacing.token}`, { method: 'DELETE' }).catch(() => {
            // Already used or gone — nothing to revoke
          });
        }
        const result = await apiFetch<InviteResult>('/api/invites', {
          method: 'POST',
          body: JSON.stringify({
            email: emailToBake || undefined,
            note: noteToBake || undefined,
          }),
        });
        setInvite(result);
        setAppliedEmail(emailToBake);
        setAppliedNote(noteToBake);
      } catch {
        setError('Couldn’t create a link. Try again.');
      } finally {
        setIsGenerating(false);
      }
    },
    []
  );

  // Reset + auto-generate a ready-to-share link when the modal opens
  useEffect(() => {
    if (!isOpen) {
      generatedForOpen.current = false;
      return;
    }
    setEmail('');
    setNote('');
    setShowEmail(false);
    setInvite(null);
    setAppliedEmail('');
    setAppliedNote('');
    setCopied(false);
    setError(null);
    setConfirmNew(false);
    if (!generatedForOpen.current) {
      generatedForOpen.current = true;
      generate('', '');
    }
  }, [isOpen, generate]);

  // Focus the email input when the optional pre-fill is revealed
  useEffect(() => {
    if (showEmail) {
      requestAnimationFrame(() => emailRef.current?.focus());
    }
  }, [showEmail]);

  // Bake the email into a fresh link — only when it actually changed
  const applyEmail = () => {
    const trimmed = email.trim();
    if (isGenerating || trimmed === appliedEmail) return;
    generate(trimmed, appliedNote, invite);
  };

  // Same deal for the personal note
  const applyNote = () => {
    const trimmed = note.trim();
    if (isGenerating || trimmed === appliedNote) return;
    generate(appliedEmail, trimmed, invite);
  };

  const handleCopy = async () => {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
    } catch {
      const input = document.createElement('input');
      input.value = fullLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShare = async () => {
    if (!fullLink) return;
    try {
      await navigator.share({
        title: 'Join me on Logbook',
        text: 'Here’s your signup link. You’ll be set up in seconds.',
        url: fullLink,
      });
    } catch {
      // User dismissed the share sheet, or it failed — no-op
    }
  };

  // Landscape proportions on purpose: the note takes its room from the dialog's
  // width rather than extra rows, so the modal stays wider than it is tall.
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="block text-2xl sm:text-[28px] font-black tracking-tight leading-none antialiased">
          Invite a client
        </span>
      }
      description="Share a signup link to get your client on board."
      maxWidth="xl"
      footer={
        // One unmissable action. Share collapses to an icon so nothing splits
        // attention with it.
        <div className="flex items-center gap-3">
          {canNativeShare() && (
            <Button
              variant="outline"
              onClick={handleShare}
              disabled={isGenerating || !invite}
              aria-label="Share invite link"
              className="h-12 w-12 shrink-0 rounded-xl p-0"
            >
              <Share2 className="h-[18px] w-[18px]" aria-hidden="true" />
            </Button>
          )}
          <Button
            onClick={handleCopy}
            disabled={isGenerating || !invite}
            className="h-12 flex-1 rounded-xl gap-2 bg-brand text-brand-foreground hover:bg-brand/90 text-sm font-bold uppercase tracking-wider active:scale-[0.98] transition-[background-color,transform] duration-150"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : copied ? (
              <Check className="h-4 w-4" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4" aria-hidden="true" />
            )}
            {isGenerating ? 'Preparing' : copied ? 'Copied' : 'Copy link'}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Link state in the data voice — full text, its own line, nothing to
            truncate against */}
        <p
          aria-live="polite"
          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground tabular-nums antialiased"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ring-2 ${
              error ? 'bg-muted-foreground/40 ring-transparent' : 'bg-brand ring-brand/25'
            } ${isGenerating ? 'animate-pulse' : ''}`}
            aria-hidden="true"
          />
          {isGenerating ? (
            'Creating link…'
          ) : invite ? (
            <>
              Link ready · expires{' '}
              <span className="font-medium text-foreground">{expiresLabel}</span>
            </>
          ) : (
            'No link yet'
          )}
        </p>

        {/* The one real decision in this modal, given the room to look like one */}
        <div>
          <FieldShell
            label={note.length > 0 ? 'Personal note' : 'Personal note · optional'}
            htmlFor="invite-note"
            trailing={
              note.length > 0 ? (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                  {note.length}/{NOTE_MAX_LENGTH}
                </span>
              ) : null
            }
          >
            <Textarea
              id="invite-note"
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
              onBlur={applyNote}
              placeholder="Can’t wait to get you started. First up, we fix that squat."
              rows={2}
              className="min-h-[76px] resize-none border-0 bg-transparent px-4 pb-3 pt-1.5 text-base sm:text-[15px] leading-relaxed focus-visible:ring-0 focus-visible:ring-offset-0"
              maxLength={NOTE_MAX_LENGTH}
            />
          </FieldShell>
          <p className="text-xs text-muted-foreground/70 mt-1.5 px-1 antialiased text-pretty">
            Greets them at signup, then opens your chat.
          </p>
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5">
            <p className="text-xs text-destructive font-medium antialiased">{error}</p>
            <Button variant="outline" size="sm" onClick={() => generate(appliedEmail, appliedNote)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Email pre-fill stays out of the way until it's wanted */}
            {showEmail && (
              <FieldShell label="Client email" htmlFor="invite-email">
                <Input
                  id="invite-email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={applyEmail}
                  placeholder="client@example.com"
                  className="h-10 border-0 bg-transparent px-4 pb-3 pt-1 text-base sm:text-[15px] focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyEmail();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </FieldShell>
            )}

            {/* Both secondary paths on one line, in the quietest tier */}
            <div className="flex flex-wrap items-center gap-2">
              {!showEmail && (
                <Chip onClick={() => setShowEmail(true)}>
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Their email
                </Chip>
              )}

              {/* Escape hatch for a link that reached the wrong person. The URL
                  itself never shows — Copy link and Share are the link. */}
              {invite &&
                (confirmNew ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground antialiased">
                      The current link stops working.
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => generate(appliedEmail, appliedNote, invite)}
                      disabled={isGenerating}
                      className="h-8 rounded-full px-3 text-xs"
                    >
                      Replace it
                    </Button>
                    <Chip onClick={() => setConfirmNew(false)}>Cancel</Chip>
                  </div>
                ) : (
                  <Chip onClick={() => setConfirmNew(true)} disabled={isGenerating}>
                    {isGenerating ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    New link
                  </Chip>
                ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
