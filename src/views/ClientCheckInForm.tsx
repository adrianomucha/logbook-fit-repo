import { useEffect, useId, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCheckIn } from '@/hooks/api/useCheckIn';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { ApiError } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, Check, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Selected states reuse the app's effort color semantics (SessionCompleteCard,
// workout history): easy/fresh = success, strained = warning, run down = destructive.
const EFFORT_OPTIONS: { value: string; label: string; emoji: string; selectedClass: string }[] = [
  { value: 'EASY', label: 'Too Easy', emoji: '😴', selectedClass: 'text-success bg-success/10 border-success/40 ring-1 ring-success/20' },
  { value: 'MEDIUM', label: 'About Right', emoji: '💪', selectedClass: 'text-foreground bg-muted border-foreground/25 ring-1 ring-foreground/10' },
  { value: 'HARD', label: 'Too Hard', emoji: '😰', selectedClass: 'text-warning bg-warning/10 border-warning/40 ring-1 ring-warning/20' },
];

const FEELING_OPTIONS: { value: string; label: string; emoji: string; selectedClass: string }[] = [
  { value: 'FRESH', label: 'Fresh', emoji: '✨', selectedClass: 'text-success bg-success/10 border-success/40 ring-1 ring-success/20' },
  { value: 'NORMAL', label: 'Normal', emoji: '👍', selectedClass: 'text-foreground bg-muted border-foreground/25 ring-1 ring-foreground/10' },
  { value: 'TIRED', label: 'Tired', emoji: '😓', selectedClass: 'text-warning bg-warning/10 border-warning/40 ring-1 ring-warning/20' },
  { value: 'RUN_DOWN', label: 'Run Down', emoji: '🥴', selectedClass: 'text-destructive bg-destructive/10 border-destructive/40 ring-1 ring-destructive/20' },
];

export function ClientCheckInForm() {
  const params = useParams<{ checkinId: string }>();
  const checkinId = params?.checkinId ?? null;
  const router = useRouter();

  const { checkIn, isLoading, submitClientResponse, refresh } = useCheckIn(checkinId);
  const { coach } = useCurrentUser();
  const coachFirstName = coach?.user.name?.split(' ')[0] ?? null;

  // The success screen replaces the form — move focus to its heading so the
  // confirmation is announced, without scrolling it under anything
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const [effortRating, setEffortRating] = useState<string | null>(null);
  const [clientFeeling, setClientFeeling] = useState<string | null>(null);
  const [painBlockers, setPainBlockers] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!showSuccess) return;
    window.scrollTo({ top: 0 });
    successHeadingRef.current?.focus({ preventScroll: true });
  }, [showSuccess]);

  const effortLabelId = useId();
  const effortErrorId = useId();
  const feelingLabelId = useId();
  const feelingErrorId = useId();
  const effortGroupRef = useRef<HTMLDivElement>(null);
  const feelingGroupRef = useRef<HTMLDivElement>(null);

  // No auto-redirect: the success screen is a terminal state the reader
  // leaves on their own. A timer would yank the page out from under anyone
  // still reading it (WCAG 2.2.1).

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center animate-enter">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!checkIn) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground/60" />
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Check-in not found</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">This check-in doesn&apos;t exist or has expired.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen — checked before the status gate: the post-submit
  // revalidation flips status to CLIENT_RESPONDED, and the user must see
  // "Sent" rather than a cold "Already sent"
  if (showSuccess) {
    // Echo what was sent — a receipt, so the moment isn't a void
    const effort = EFFORT_OPTIONS.find((o) => o.value === effortRating);
    const feeling = FEELING_OPTIONS.find((o) => o.value === clientFeeling);
    const note = painBlockers.trim();

    return (
      <div className="min-h-dvh bg-background px-4 pt-10 sm:pt-16 pb-10">
        <div className="max-w-md mx-auto space-y-6 animate-enter">
          {/* Volt check — the same celebration mark the coach's success screen
              and the workout-complete state carry */}
          <div className="w-16 h-16 rounded-full bg-brand flex items-center justify-center animate-bounce-once">
            <Check className="w-8 h-8 text-brand-foreground" strokeWidth={3} aria-hidden="true" />
          </div>

          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-2">
              Check-in sent
            </p>
            <h1
              ref={successHeadingRef}
              tabIndex={-1}
              className="text-3xl sm:text-4xl font-black uppercase tracking-tight leading-[0.95] text-balance antialiased focus:outline-none"
            >
              {coachFirstName ? `Sent to ${coachFirstName}` : 'Sent to your coach'}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              {coachFirstName ?? 'Your coach'} will read it and get back to you — their reply
              shows up on your dashboard.
            </p>
          </div>

          {(effort || feeling || note) && (
            <div className="rounded-2xl bg-card border border-border/70 px-4 divide-y divide-border/50">
              {effort && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Workouts felt
                  </span>
                  <span className="text-sm font-semibold antialiased">
                    {effort.emoji} {effort.label}
                  </span>
                </div>
              )}
              {feeling && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Body feels
                  </span>
                  <span className="text-sm font-semibold antialiased">
                    {feeling.emoji} {feeling.label}
                  </span>
                </div>
              )}
              {note && (
                <div className="py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1">
                    Your note
                  </p>
                  <p className="text-sm leading-relaxed antialiased">{note}</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-1.5 pt-1">
            {/* Same volt CTA the today card uses — one clear way onward */}
            <button
              onClick={() => router.push('/client')}
              className="w-full h-14 rounded-xl bg-brand text-brand-foreground text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-brand/90 active:scale-[0.98] transition-[background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Back to today
            </button>
            <Button
              variant="ghost"
              onClick={() => router.push('/client?tab=chat')}
              className="w-full text-muted-foreground"
            >
              Message {coachFirstName ?? 'your coach'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Expired — the client never responded; "Already Submitted" would be a lie
  if (checkIn.status === 'EXPIRED') {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground/60" />
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Check-in expired</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">This check-in is no longer open — the next one will appear on your dashboard.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted
  if (checkIn.status !== 'PENDING') {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-success" />
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Already sent</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">You already sent this one to your coach.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!effortRating) newErrors.effortRating = 'Choose how your workouts felt';
    if (!clientFeeling) newErrors.clientFeeling = 'Choose how your body feels';
    setErrors(newErrors);
    // Send focus to the first unanswered question so the reason is on screen
    if (newErrors.effortRating) effortGroupRef.current?.focus();
    else if (newErrors.clientFeeling) feelingGroupRef.current?.focus();
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (isSubmitting) return;
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await submitClientResponse({
        effortRating: effortRating!,
        clientFeeling: clientFeeling!,
        painBlockers: painBlockers.trim() || undefined,
      });
      setShowSuccess(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // The check-in was answered in another tab or expired while the form
        // sat open — "try again" can never succeed. Refetch so the right
        // terminal screen (submitted/expired) renders instead of a dead end.
        await refresh();
        setErrors({
          submit: 'This check-in is no longer open — it may have been answered already or expired.',
        });
      } else {
        setErrors({ submit: 'Failed to submit. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recent completions from the API (included in check-in detail)
  const recentCompletions = checkIn.client.completions ?? [];

  return (
    <div className="min-h-dvh bg-background p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {/* space-y-8 between questions against mb-3 inside each: groups need at
          least 2× their internal gap or the form reads as one flat stack. */}
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="py-4">
          <button
            onClick={() => router.push('/client')}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium hover:text-foreground transition-colors touch-manipulation mb-3 block"
          >
            ← Back
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">Check-in</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Time to check in</h1>
        </div>

        {/* Question 1: Effort Rating */}
        <div>
          <p id={effortLabelId} className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">How did your workouts feel?</p>
          {/* Named group so the choices announce what they answer; tabIndex -1
              lets validation move focus here without adding a tab stop. */}
          <div
            ref={effortGroupRef}
            tabIndex={-1}
            role="group"
            aria-labelledby={effortLabelId}
            aria-describedby={errors.effortRating ? effortErrorId : undefined}
            className="grid grid-cols-3 gap-2 focus:outline-none"
          >
            {EFFORT_OPTIONS.map(({ value, label, emoji, selectedClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setEffortRating(value); setErrors(e => ({ ...e, effortRating: '' })); }}
                aria-pressed={effortRating === value}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-1 rounded-lg border-2 transition-[background-color,border-color,color,box-shadow] touch-manipulation min-h-[64px]',
                  'text-xs font-bold uppercase tracking-wide',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  effortRating === value
                    ? selectedClass
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="text-xl leading-none select-none" aria-hidden="true">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          {errors.effortRating && (
            <p id={effortErrorId} className="text-sm text-destructive mt-2">{errors.effortRating}</p>
          )}
        </div>

        {/* Question 2: Body Feeling */}
        <div>
          <p id={feelingLabelId} className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">How does your body feel?</p>
          <div
            ref={feelingGroupRef}
            tabIndex={-1}
            role="group"
            aria-labelledby={feelingLabelId}
            aria-describedby={errors.clientFeeling ? feelingErrorId : undefined}
            className="grid grid-cols-2 sm:grid-cols-4 gap-2 focus:outline-none"
          >
            {FEELING_OPTIONS.map(({ value, label, emoji, selectedClass }) => (
              <button
                key={value}
                type="button"
                onClick={() => { setClientFeeling(value); setErrors(e => ({ ...e, clientFeeling: '' })); }}
                aria-pressed={clientFeeling === value}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-1 rounded-lg border-2 transition-[background-color,border-color,color,box-shadow] touch-manipulation min-h-[64px]',
                  'text-xs font-bold uppercase tracking-wide',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  clientFeeling === value
                    ? selectedClass
                    : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <span className="text-xl leading-none select-none" aria-hidden="true">{emoji}</span>
                {label}
              </button>
            ))}
          </div>
          {errors.clientFeeling && (
            <p id={feelingErrorId} className="text-sm text-destructive mt-2">{errors.clientFeeling}</p>
          )}
        </div>

        {/* Optional Notes */}
        <div>
          <label htmlFor="checkin-notes" className="block font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">Anything else for your coach?</label>
          <Textarea
            id="checkin-notes"
            placeholder="Right knee twinged on squats Wednesday"
            value={painBlockers}
            onChange={(e) => setPainBlockers(e.target.value.slice(0, 500))}
            rows={3}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1 text-right tabular-nums">{painBlockers.length}/500</p>
        </div>

        {/* Recent Workouts Summary */}
        {recentCompletions.length > 0 && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">Recent workouts</p>
            <div className="space-y-1.5">
              {recentCompletions.map((completion) => (
                <div
                  key={completion.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/40"
                >
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold tracking-tight truncate">
                      {completion.day?.name ?? 'Workout'}
                    </p>
                    {completion.completedAt && (
                      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
                        {format(new Date(completion.completedAt), 'EEEE, MMM d')}
                      </p>
                    )}
                  </div>
                  {completion.completionPct != null && (
                    <p className="text-sm font-bold tabular-nums shrink-0">
                      {Math.round(completion.completionPct)}%
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {recentCompletions.length === 0 && (
          <div className="rounded-lg bg-muted/40 py-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">No recent completed workouts</p>
          </div>
        )}

        {/* Submit Error — stable region so repeat failures re-announce */}
        <div role="alert" aria-live="assertive">
          {errors.submit && (
            <p className="text-sm text-destructive text-center">{errors.submit}</p>
          )}
        </div>

        {/* Submit stays enabled until the request starts: disabling it while
            the form is incomplete hid the reason and made validate() dead code. */}
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full h-14 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.97] transition-[background-color,transform] duration-150"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Send check-in
        </Button>
      </div>
    </div>
  );
}
