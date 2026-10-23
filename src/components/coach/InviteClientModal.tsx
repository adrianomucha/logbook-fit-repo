import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { Copy, Check, Share2, RefreshCw, Plus, Loader2, Mail } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Chip, FieldShell, StatusLine } from './shared/formSurfaces';
import { apiFetch, ApiError } from '@/lib/api-client';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { cn } from '@/lib/utils';

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
  emailSentAt: string | null;
  inviteLink: string;
}

type EmailSendState =
  | { status: 'idle' }
  | { status: 'sending' }
  | { status: 'sent'; to: string }
  | { status: 'failed'; message: string };

const NOTE_MAX_LENGTH = 280;

const canNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export function InviteClientModal({ isOpen, onClose }: InviteClientModalProps) {
  const { user } = useCurrentUser();
  // The signup page this link opens leads with the coach's photo and bio.
  // A coach with neither is about to send a bare page — say so here, at the
  // moment of sending, not in a settings pane they may never open.
  const profileIsBare =
    !!user && !user.avatarUrl && !user.coachProfile?.bio?.trim();
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
  // Emailing is a separate, explicit step: typing an address only bakes it
  // into the link, so nothing goes out until the coach presses Email invite
  const [emailSend, setEmailSend] = useState<EmailSendState>({ status: 'idle' });
  // Guard so React strict-mode / re-renders don't double-generate on open
  const generatedForOpen = useRef(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const sendButtonRef = useRef<HTMLButtonElement>(null);

  const fullLink = invite ? `${window.location.origin}${invite.inviteLink}` : '';

  const expiresLabel = invite
    ? new Date(invite.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const generate = useCallback(
    async (
      emailToBake: string,
      noteToBake: string,
      replacing?: InviteResult | null
    ): Promise<InviteResult | null> => {
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
        // A new link hasn't been emailed anywhere yet
        setEmailSend({ status: 'idle' });
        return result;
      } catch {
        setError('Couldn’t create a link. Try again.');
        return null;
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
    setEmailSend({ status: 'idle' });
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

  // Email the current link to the typed address, baking the address into a
  // fresh link first if it changed since the last one
  const handleSendEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed || isGenerating || emailSend.status === 'sending') return;
    if (emailRef.current && !emailRef.current.checkValidity()) {
      setEmailSend({ status: 'failed', message: 'That email doesn’t look right.' });
      return;
    }
    const current =
      invite && trimmed === appliedEmail ? invite : await generate(trimmed, appliedNote, invite);
    if (!current) return;

    setEmailSend({ status: 'sending' });
    try {
      const res = await apiFetch<{ sent: boolean }>(`/api/invites/${current.token}/send`, {
        method: 'POST',
      });
      setEmailSend(
        res.sent
          ? { status: 'sent', to: trimmed }
          : {
              status: 'failed',
              message: 'Email isn’t available right now. Copy the link and send it yourself.',
            }
      );
    } catch (err) {
      setEmailSend({
        status: 'failed',
        message:
          err instanceof ApiError ? err.message : 'Couldn’t send the email. Copy the link instead.',
      });
    }
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
        <span className="block text-2xl sm:text-[28px] font-bold tracking-tight leading-none antialiased">
          Invite a client
        </span>
      }
      description="Email your client a signup link, or share it yourself."
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
        <StatusLine tone={error ? 'idle' : 'ready'} pulse={isGenerating}>
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
        </StatusLine>

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
            {profileIsBare && (
              <>
                {' '}
                Your photo and bio go there too:{' '}
                <Link
                  href="/coach/settings?section=profile"
                  className="underline underline-offset-2 transition-colors hover:text-foreground"
                >
                  add yours
                </Link>
                .
              </>
            )}
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
              <div>
                <FieldShell label="Client email" htmlFor="invite-email">
                  <Input
                    id="invite-email"
                    ref={emailRef}
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailSend.status !== 'idle') setEmailSend({ status: 'idle' });
                    }}
                    // Pressing Email invite bakes the address itself — a
                    // blur-triggered link on the way there would race it
                    onBlur={(e) => {
                      if (e.relatedTarget === sendButtonRef.current) return;
                      applyEmail();
                    }}
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
                {/* Sending is its own step, and its outcome is spelled out —
                    a coach shouldn't wait on an email that never left */}
                <div className="mt-2 flex items-start justify-between gap-3 px-1">
                  <p
                    className={cn(
                      'text-xs antialiased text-pretty pt-1.5',
                      emailSend.status === 'failed'
                        ? 'text-destructive'
                        : emailSend.status === 'sent'
                          ? 'text-foreground'
                          : 'text-muted-foreground/70'
                    )}
                    aria-live="polite"
                  >
                    {emailSend.status === 'sent' ? (
                      <>
                        <Check className="inline h-3.5 w-3.5 -mt-0.5 mr-1" strokeWidth={3} aria-hidden="true" />
                        Emailed to {emailSend.to}.
                      </>
                    ) : emailSend.status === 'failed' ? (
                      emailSend.message
                    ) : (
                      'We’ll email them the link. It also fills in their sign-up form.'
                    )}
                  </p>
                  {emailSend.status !== 'sent' && (
                    <Button
                      ref={sendButtonRef}
                      size="sm"
                      variant="outline"
                      onClick={handleSendEmail}
                      disabled={!email.trim() || isGenerating || emailSend.status === 'sending'}
                      className="h-8 shrink-0 rounded-full px-3 text-xs gap-1.5"
                    >
                      {emailSend.status === 'sending' ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      {emailSend.status === 'sending' ? 'Sending' : 'Email invite'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Both secondary paths on one line, in the quietest tier */}
            <div className="flex flex-wrap items-center gap-2">
              {!showEmail && (
                <Chip onClick={() => setShowEmail(true)}>
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  Email it to them
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
