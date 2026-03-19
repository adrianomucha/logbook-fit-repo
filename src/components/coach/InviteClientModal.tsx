import { useState, useEffect } from 'react';
import { Loader2, Copy, Check, Link } from 'lucide-react';
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

export function InviteClientModal({ isOpen, onClose }: InviteClientModalProps) {
  const [email, setEmail] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [invite, setInvite] = useState<InviteResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setInvite(null);
      setCopied(false);
      setError(null);
      setIsGenerating(false);
    }
  }, [isOpen]);

  const handleGenerate = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);

    try {
      const result = await apiFetch<InviteResult>('/api/invites', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      setInvite(result);
    } catch {
      setError('Failed to generate invite. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const fullLink = invite
    ? `${window.location.origin}${invite.inviteLink}`
    : '';

  const handleCopy = async () => {
    if (!fullLink) return;
    try {
      await navigator.clipboard.writeText(fullLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const input = document.createElement('input');
      input.value = fullLink;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Client"
      description={!invite ? 'Send a signup link to get your client on board.' : undefined}
      maxWidth="sm"
      footer={
        !invite ? (
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <Link className="w-4 h-4 mr-1.5" />
              )}
              Generate Link
            </Button>
          </div>
        ) : (
          <div className="flex gap-2 justify-end">
            <Button size="sm" onClick={handleCopy}>
              {copied ? (
                <Check className="w-4 h-4 mr-1.5" />
              ) : (
                <Copy className="w-4 h-4 mr-1.5" />
              )}
              {copied ? 'Copied!' : 'Copy Link'}
            </Button>
            <Button variant="outline" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        )
      }
    >
      {!invite ? (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-1.5 block">
              Client email
              <span className="normal-case tracking-normal text-muted-foreground/60 ml-1">
                (optional)
              </span>
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="client@example.com"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
            />
            <p className="text-xs text-muted-foreground mt-1.5">
              Pre-fills the signup form so they don't have to type it.
            </p>
          </div>

          {error && (
            <p className="text-xs text-destructive font-medium">{error}</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Success header */}
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-100 text-emerald-600">
              <Check className="w-4 h-4" strokeWidth={3} />
            </span>
            <div>
              <p className="text-sm font-semibold">Link ready</p>
              <p className="text-xs text-muted-foreground">
                Send this to your client — they'll be set up in seconds.
              </p>
            </div>
          </div>

          {/* Link field */}
          <div className="rounded-lg bg-muted/50 p-3 space-y-2">
            <div className="flex gap-2">
              <Input
                readOnly
                value={fullLink}
                className="text-xs font-mono bg-background"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant="outline"
                size="icon"
                className="shrink-0"
                onClick={handleCopy}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            Expires in 7 days.
            {invite.email && (
              <> Email pre-filled as <strong>{invite.email}</strong>.</>
            )}
          </p>
        </div>
      )}
    </Modal>
  );
}
