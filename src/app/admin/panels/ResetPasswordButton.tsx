'use client';

import { useState } from 'react';
import { Check, Copy, KeyRound, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Two-step password reset for an account row. On success the temporary
 * password is shown exactly once (it's never retrievable again — only the
 * hash is stored), with a copy affordance.
 */
export function ResetPasswordButton({ userId }: { userId: string }) {
  const [step, setStep] = useState<'idle' | 'confirm' | 'working' | 'done'>(
    'idle'
  );
  const [tempPassword, setTempPassword] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const reset = async () => {
    setStep('working');
    setError('');
    try {
      const res = await fetch(`/api/admin/users/${userId}/password`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.tempPassword) {
        setError(data?.error || 'Reset failed. Try again.');
        setStep('idle');
        return;
      }
      setTempPassword(data.tempPassword);
      setStep('done');
    } catch {
      setError('Reset failed. Try again.');
      setStep('idle');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — the password is still visible to select manually
    }
  };

  if (step === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5">
        <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
          {tempPassword}
        </code>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={copy}
          className="h-8 px-2"
          title="Copy temporary password"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-brand" strokeWidth={3} />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
        </Button>
      </span>
    );
  }

  if (step === 'confirm') {
    return (
      <span className="inline-flex items-center gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={reset}
          className="h-8 px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
        >
          Confirm reset
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setStep('idle')}
          className="h-8 px-2"
          title="Cancel"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setStep('confirm')}
        disabled={step === 'working'}
        className="h-8 px-3 font-mono text-[10px] uppercase tracking-[0.12em]"
      >
        {step === 'working' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <KeyRound className="h-3.5 w-3.5" />
        )}
        <span className="ml-1.5">Reset password</span>
      </Button>
      {error && (
        <span role="alert" className="text-[11px] text-destructive">
          {error}
        </span>
      )}
    </span>
  );
}
