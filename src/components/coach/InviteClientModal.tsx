import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Share2, RefreshCw, Plus } from 'lucide-react';
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

/** Uppercase tracked mono label — the same "data voice" used across list headers and stats */
function FieldLabel({
  htmlFor,
  children,
  trailing,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2 mb-2">
      <label
        htmlFor={htmlFor}
        className="font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
      >
        {children}
      </label>
      {trailing}
    </div>
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
        text: 'Here’s your signup link — you’ll be set up in seconds.',
        url: fullLink,
      });
    } catch {
      // User dismissed the share sheet, or it failed — no-op
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <span className="flex flex-col">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased">
            Grow your roster
          </span>
          <span className="font-black tracking-tight antialiased">Invite Client</span>
        </span>
      }
      description="Share a signup link to get your client on board."
      maxWidth="md"
      footer={
        <div className="flex items-center justify-between gap-3">
          {/* Live expiry — reads like a logbook stat, same voice as the plan tally */}
          <p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums antialiased min-w-0">
            <span
              className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25 shrink-0"
              aria-hidden="true"
            />
            <span className="truncate">
              {expiresLabel ? (
                <>
                  Link ready · expires <span className="font-medium text-foreground">{expiresLabel}</span>
                </>
              ) : error ? (
                'No link yet'
              ) : (
                'Creating link…'
              )}
            </span>
          </p>
          <div className="flex gap-3 shrink-0">
            {canNativeShare() && (
              <Button
                variant="outline"
                onClick={handleShare}
                disabled={isGenerating || !invite}
                className="flex items-center gap-2"
              >
                <Share2 className="h-4 w-4" aria-hidden="true" />
                Share
              </Button>
            )}
            <Button
              onClick={handleCopy}
              disabled={isGenerating || !invite}
              className="flex items-center gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Copy className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-6 py-1 sm:py-2">
        {/* Personal note — the one real decision in this modal */}
        <div>
          <FieldLabel
            htmlFor="invite-note"
            trailing={
              note.length > 0 ? (
                <span className="font-mono text-[10px] tabular-nums text-muted-foreground/50">
                  {note.length}/{NOTE_MAX_LENGTH}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground/50 font-sans">optional</span>
              )
            }
          >
            Personal note
          </FieldLabel>
          <Textarea
            id="invite-note"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX_LENGTH))}
            onBlur={applyNote}
            placeholder="Can’t wait to get you started — first up, we fix that squat."
            rows={3}
            className="resize-none leading-relaxed"
            maxLength={NOTE_MAX_LENGTH}
          />
          <p className="text-xs text-muted-foreground mt-2 antialiased text-pretty">
            Greets them at signup, then lands in chat as your first message.
          </p>
        </div>

        {error ? (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
            <p className="text-xs text-destructive font-medium antialiased">{error}</p>
            <Button variant="outline" size="sm" onClick={() => generate(appliedEmail, appliedNote)}>
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Email pre-fill stays out of the way until it's wanted */}
            {showEmail ? (
              <div>
                <FieldLabel htmlFor="invite-email">Client email</FieldLabel>
                <Input
                  id="invite-email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={applyEmail}
                  placeholder="client@example.com"
                  className="h-11"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applyEmail();
                      (e.target as HTMLInputElement).blur();
                    }
                  }}
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowEmail(true)}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Pre-fill their email
              </button>
            )}

            {/* Escape hatch for a link that reached the wrong person. The URL
                itself never shows — Copy link and Share are the link. */}
            {invite && (
              <button
                type="button"
                onClick={() => generate(appliedEmail, appliedNote, invite)}
                disabled={isGenerating}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 tap-target disabled:opacity-50"
              >
                <RefreshCw
                  className={isGenerating ? 'w-3.5 h-3.5 animate-spin' : 'w-3.5 h-3.5'}
                  aria-hidden="true"
                />
                New link
                <span className="font-normal text-muted-foreground/60">
                  — the current one stops working
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
