'use client';

import { Check, AlertTriangle } from 'lucide-react';
import {
  isCommonPassword,
  passwordByteLength,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
} from '@/lib/validations/schemas';
import { cn } from '@/lib/utils';

const RULES = [
  {
    id: 'length',
    label: '8+ chars',
    met: (password: string) => password.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: 'letter',
    label: 'A letter',
    met: (password: string) => /[a-zA-Z]/.test(password),
  },
  {
    id: 'number',
    label: 'A number',
    met: (password: string) => /[0-9]/.test(password),
  },
] as const;

/**
 * Live checklist under the password field: each rule ticks green as the user
 * satisfies it, so nobody meets the requirements for the first time via a
 * rejected submit. Renders the same rules passwordSchema enforces — if the
 * schema changes, change this with it.
 */
export function PasswordRules({ password }: { password: string }) {
  // Edge cases stay hidden until they actually happen — the happy path is
  // three checkmarks, not a wall of warnings.
  const tooCommon =
    password.length >= PASSWORD_MIN_LENGTH && isCommonPassword(password);
  const tooLong = passwordByteLength(password) > PASSWORD_MAX_BYTES;

  return (
    <div className="space-y-1.5" aria-live="polite">
      <ul className="flex flex-wrap gap-x-4 gap-y-1">
        {RULES.map((rule) => {
          const met = rule.met(password);
          return (
            <li
              key={rule.id}
              className={cn(
                'inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors duration-200',
                met ? 'text-success-text' : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'flex h-3.5 w-3.5 items-center justify-center rounded-full border transition-colors duration-200',
                  met
                    ? 'border-success bg-success text-success-foreground'
                    : 'border-border/80'
                )}
                aria-hidden="true"
              >
                {met && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
              </span>
              {rule.label}
              <span className="sr-only">{met ? ', done' : ', missing'}</span>
            </li>
          );
        })}
      </ul>
      {(tooCommon || tooLong) && (
        <p className="flex items-start gap-1.5 text-xs text-destructive">
          <AlertTriangle
            className="mt-0.5 h-3 w-3 shrink-0"
            aria-hidden="true"
          />
          {tooCommon
            ? 'This one tops the most-hacked lists — pick something harder to guess'
            : 'Passwords max out at 72 characters'}
        </p>
      )}
    </div>
  );
}
