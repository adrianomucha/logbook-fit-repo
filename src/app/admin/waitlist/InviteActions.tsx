'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InviteActionsProps {
  id: string;
  status: 'PENDING' | 'INVITED' | 'JOINED';
  /** Relative signup path for INVITED rows (token link), null otherwise. */
  invitePath: string | null;
}

/**
 * Per-row actions on the admin waitlist: send/re-send the beta invite and
 * copy the invite link. The row itself is server-rendered; after a send we
 * router.refresh() so the status column re-renders from the database.
 */
export function InviteActions({ id, status, invitePath }: InviteActionsProps) {
  const router = useRouter();
  const [isSending, setIsSending] = useState(false);
  const [notice, setNotice] = useState<'email_failed' | 'error' | null>(null);
  const [copied, setCopied] = useState(false);

  if (status === 'JOINED') {
    return null;
  }

  const send = async () => {
    setIsSending(true);
    setNotice(null);
    try {
      const res = await fetch('/api/waitlist/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setNotice('error');
        return;
      }
      // Invite recorded but the email didn't go out (Resend unconfigured or
      // down) — tell the admin so they copy the link and deliver it by hand.
      if (!data?.emailSent) {
        setNotice('email_failed');
      }
      router.refresh();
    } catch {
      setNotice('error');
    } finally {
      setIsSending(false);
    }
  };

  const copy = async () => {
    if (!invitePath) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${invitePath}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the link is still in the invite email
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        {invitePath && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={copy}
            className="h-8 px-2 font-mono text-[10px] uppercase tracking-[0.12em]"
            title="Copy invite link"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
            <span className="ml-1.5">{copied ? 'Copied' : 'Copy link'}</span>
          </Button>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={send}
          disabled={isSending}
          className="h-8 px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
        >
          {isSending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
          <span className="ml-1.5">
            {status === 'INVITED' ? 'Re-send' : 'Send invite'}
          </span>
        </Button>
      </div>
      {notice === 'email_failed' && (
        <p className="text-[11px] text-muted-foreground">
          Email not sent — copy the link and send it yourself.
        </p>
      )}
      {notice === 'error' && (
        <p role="alert" className="text-[11px] text-destructive">
          Something went wrong. Try again.
        </p>
      )}
    </div>
  );
}
