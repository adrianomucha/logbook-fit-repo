'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Eye, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'NEW' | 'REVIEWED' | 'RESOLVED';

/**
 * Status cell for a feedback row: the current state plus the one or two
 * transitions that make sense from it. Server state is the truth — after a
 * successful PATCH the row re-renders via router.refresh(), so there's no
 * local status copy to drift.
 */
export function FeedbackStatusActions({
  id,
  status,
}: {
  id: string;
  status: Status;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);

  const setStatus = async (next: Status) => {
    if (pending) return;
    setPending(next);
    setFailed(false);
    try {
      const res = await fetch(`/api/admin/feedback/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  };

  const action = (next: Status, label: string, icon: React.ReactNode) => (
    <Button
      key={next}
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setStatus(next)}
      disabled={pending !== null}
      className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
    >
      {pending === next ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {label}
    </Button>
  );

  return (
    <span className="inline-flex items-center gap-1">
      {failed && (
        <span className="text-xs text-destructive">Failed — retry</span>
      )}
      {status === 'NEW' && (
        <>
          <span className="mr-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" aria-hidden="true" />
            New
          </span>
          {action(
            'REVIEWED',
            'Reviewed',
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          {action(
            'RESOLVED',
            'Resolve',
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </>
      )}
      {status === 'REVIEWED' && (
        <>
          <span className="mr-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Reviewed
          </span>
          {action(
            'RESOLVED',
            'Resolve',
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </>
      )}
      {status === 'RESOLVED' && (
        <>
          <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70">
            Resolved
          </span>
          {action(
            'NEW',
            'Reopen',
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </>
      )}
    </span>
  );
}
