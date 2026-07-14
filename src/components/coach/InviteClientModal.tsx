import { useState, useEffect, useRef, useCallback } from 'react';
import { Copy, Check, Share2, RefreshCw } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { apiFetch } from '@/lib/api-client';

interface InviteClientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InviteResult {
  id: string;
  token: string;
  email: string | null;
  expiresAt: string;
  inviteLink: string;
}

const canNativeShare = () =>
  typeof navigator !== 'undefined' && typeof navigator.share === 'function';

export function InviteClientModal({ isOpen, onClose }: InviteClientModalProps) {
  const [email, setEmail] = useState('');
  const [invite, setInvite] = useState<InviteResult | null>(null);
  // Email baked into the currently shown invite — lets us skip needless regen
  const [appliedEmail, setAppliedEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guard so React strict-mode / re-renders don't double-generate on open
  const generatedForOpen = useRef(false);

  const fullLink = invite ? `${window.location.origin}${invite.inviteLink}` : '';

  const generate = useCallback(async (emailToBake: string, replacing?: InviteResult | null) => {
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
        body: JSON.stringify({ email: emailToBake || undefined }),
      });
      setInvite(result);
      setAppliedEmail(emailToBake);
    } catch {
      setError('Couldn’t create a link. Try again.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Reset + auto-generate a ready-to-share link when the modal opens
  useEffect(() => {
    if (!isOpen) {
      generatedForOpen.current = false;
      return;
    }
    setEmail('');
    setInvite(null);
    setAppliedEmail('');
    setCopied(false);
    setError(null);
    if (!generatedForOpen.current) {
      generatedForOpen.current = true;
      generate('');
    }
  }, [isOpen, generate]);

  // Bake the email into a fresh link — only when it actually changed
  const applyEmail = () => {
    const trimmed = email.trim();
    if (isGenerating || trimmed === appliedEmail) return;
    generate(trimmed, invite);
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
      title="Invite Client"
      description="Share a signup link to get your client on board."
      maxWidth="md"
      footer={
        <div className="flex gap-2">
          {canNativeShare() && (
            <Button
              className="flex-1 h-11"
              onClick={handleShare}
              disabled={isGenerating || !invite}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Share
            </Button>
          )}
          <Button
            variant={canNativeShare() ? 'outline' : 'default'}
            className="flex-1 h-11"
            onClick={handleCopy}
            disabled={isGenerating || !invite}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1.5" />
            ) : (
              <Copy className="w-4 h-4 mr-1.5" />
            )}
            {copied ? 'Copied!' : 'Copy link'}
          </Button>
        </div>
      }
    >
      <div className="space-y-7 py-1 sm:py-2">
        {/* Email — optional pre-fill */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium mb-2 block">
            Client email
            <span className="normal-case tracking-normal text-muted-foreground/50 ml-1 font-sans">
              optional
            </span>
          </label>
          <Input
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
          <p className="text-xs text-muted-foreground mt-2 antialiased">
            Pre-fills their signup so they don’t have to type it.
          </p>
        </div>

        {/* Link */}
        <div>
          <label className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70 font-medium mb-2 flex items-center gap-1.5">
            {isGenerating ? (
              <RefreshCw className="w-2.5 h-2.5 animate-spin" />
            ) : (
              <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25" aria-hidden="true" />
            )}
            Invite link
            <span className="normal-case tracking-normal text-muted-foreground/50 ml-auto font-sans">
              Expires in 7 days
            </span>
          </label>

          {error ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
              <p className="text-xs text-destructive font-medium antialiased">{error}</p>
              <Button variant="outline" size="sm" onClick={() => generate(appliedEmail)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                readOnly
                value={isGenerating && !invite ? 'Creating link…' : fullLink}
                className="h-11 pr-10 text-xs font-mono tabular-nums text-muted-foreground"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                disabled={isGenerating || !invite}
                aria-label="Copy link"
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted active:scale-90 transition-[color,background-color,transform] disabled:opacity-40 disabled:pointer-events-none"
              >
                {copied ? <Check className="w-4 h-4 text-foreground" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          )}

          {/* Escape hatch for a link sent to the wrong person */}
          {invite && !error && (
            <div className="flex items-center justify-between gap-2 mt-4">
              <p className="text-xs text-muted-foreground antialiased">
                Sent to the wrong person?
              </p>
              <button
                onClick={() => generate(appliedEmail, invite)}
                disabled={isGenerating}
                className="font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors tap-target disabled:opacity-50 antialiased"
              >
                Revoke &amp; new link
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
