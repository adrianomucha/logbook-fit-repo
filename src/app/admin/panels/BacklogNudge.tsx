'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';

type State =
  | { kind: 'idle' }
  | { kind: 'confirming' }
  | { kind: 'sending'; sent: number }
  | { kind: 'done'; sent: number; failures: number; stopped: boolean }
  | { kind: 'error'; sent: number };

/**
 * The one-off "you can skip the waitlist now" email to the backlog (see
 * api/admin/waitlist/backlog-nudge). Confirms first, with a link to preview
 * the email, then sends batch after batch until nobody is left, showing the
 * running count. Stops early if a batch sends nothing but failures (mailer
 * down), so it never loops; whoever wasn't reached stays in the count for a
 * later click.
 */
export function BacklogNudge({ count }: { count: number }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: 'idle' });

  const send = async () => {
    let sent = 0;
    let failures = 0;
    setState({ kind: 'sending', sent });
    try {
      for (;;) {
        const res = await fetch('/api/admin/waitlist/backlog-nudge', { method: 'POST' });
        if (!res.ok) {
          setState({ kind: 'error', sent });
          return;
        }
        const batch = (await res.json()) as {
          sent: number;
          failures: number;
          remaining: number;
        };
        sent += batch.sent;
        failures += batch.failures;
        setState({ kind: 'sending', sent });
        if (batch.remaining === 0) {
          setState({ kind: 'done', sent, failures, stopped: false });
          break;
        }
        if (batch.sent === 0) {
          setState({ kind: 'done', sent, failures, stopped: true });
          break;
        }
      }
    } catch {
      setState({ kind: 'error', sent });
      return;
    } finally {
      router.refresh();
    }
  };

  if (state.kind === 'done' || state.kind === 'error') {
    return (
      <p className="max-w-xs text-right text-sm text-muted-foreground">
        {state.kind === 'error'
          ? `Stopped by an error after ${state.sent} sent. Click again to send the rest.`
          : state.stopped
            ? `Sent ${state.sent}. The mailer is failing (${state.failures} not sent); try again later.`
            : `Sent to ${state.sent} ${state.sent === 1 ? 'person' : 'people'}${
                state.failures > 0 ? `, ${state.failures} failed` : ''
              }.`}
      </p>
    );
  }

  if (count === 0) return null;

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setState({ kind: 'confirming' })}
        disabled={state.kind === 'sending'}
        className="h-10 gap-2 px-4 text-sm font-bold uppercase tracking-wider"
      >
        {state.kind === 'sending' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Mail className="h-4 w-4" />
        )}
        {state.kind === 'sending'
          ? `Sending… ${state.sent} of ${count}`
          : `Email the backlog (${count})`}
      </Button>

      {state.kind === 'confirming' && (
        <div className="absolute right-0 top-full z-20 mt-2 w-80 rounded-xl border border-border bg-card p-4 text-sm shadow-lg">
          <p className="font-semibold">
            Email {count} {count === 1 ? 'person' : 'people'}?
          </p>
          <p className="mt-1 text-muted-foreground">
            Everyone who joined more than 14 days ago, is still waiting and
            hasn&apos;t booked gets the &ldquo;you can skip the waitlist now&rdquo; email,
            once. It sends in batches and takes about a second per person.
          </p>
          <a
            href="/api/admin/waitlist/backlog-nudge?preview=1"
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1 font-medium underline-offset-4 hover:underline"
          >
            Preview the email <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <div className="mt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setState({ kind: 'idle' })}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={send}>
              Send to {count}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
