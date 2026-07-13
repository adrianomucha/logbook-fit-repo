import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCheckIn } from '@/hooks/api/useCheckIn';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// Selected states reuse the app's effort color semantics (QuickEffortFeedback,
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

  const { checkIn, isLoading, submitClientResponse } = useCheckIn(checkinId);

  const [effortRating, setEffortRating] = useState<string | null>(null);
  const [clientFeeling, setClientFeeling] = useState<string | null>(null);
  const [painBlockers, setPainBlockers] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-redirect after success
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => router.push('/client'), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, router]);

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
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Check-in Not Found</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">This check-in doesn&apos;t exist or has expired.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to Dashboard</Button>
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
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Already Submitted</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">You&apos;ve already responded to this check-in.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-dvh bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-success animate-bounce-once" />
            <h2 className="text-xl font-bold mb-2 tracking-tight antialiased">Sent to your coach!</h2>
            <p className="text-sm text-muted-foreground antialiased">They&apos;ll review and get back to you soon.</p>
          </div>
        </div>
      </div>
    );
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!effortRating) newErrors.effortRating = 'Please select how workouts felt';
    if (!clientFeeling) newErrors.clientFeeling = 'Please select how your body feels';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await submitClientResponse({
        effortRating: effortRating!,
        clientFeeling: clientFeeling!,
        painBlockers: painBlockers.trim() || undefined,
      });
      setShowSuccess(true);
    } catch {
      setErrors({ submit: 'Failed to submit. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = effortRating && clientFeeling && !isSubmitting;

  // Recent completions from the API (included in check-in detail)
  const recentCompletions = checkIn.client.completions ?? [];

  return (
    <div className="min-h-dvh bg-background p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="py-4">
          <button
            onClick={() => router.push('/client')}
            className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium hover:text-foreground transition-colors touch-manipulation mb-3 block"
          >
            ← Back
          </button>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1">Check-in</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Weekly Check-in</h1>
        </div>

        {/* Question 1: Effort Rating */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">How did your workouts feel?</p>
          <div className="grid grid-cols-3 gap-2">
            {EFFORT_OPTIONS.map(({ value, label, emoji, selectedClass }) => (
              <button
                key={value}
                onClick={() => { setEffortRating(value); setErrors(e => ({ ...e, effortRating: '' })); }}
                aria-pressed={effortRating === value}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-1 rounded-lg border-2 transition-all touch-manipulation min-h-[64px]',
                  'text-xs font-bold uppercase tracking-wide',
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
            <p className="text-xs text-destructive mt-2">{errors.effortRating}</p>
          )}
        </div>

        {/* Question 2: Body Feeling */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">How does your body feel?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FEELING_OPTIONS.map(({ value, label, emoji, selectedClass }) => (
              <button
                key={value}
                onClick={() => { setClientFeeling(value); setErrors(e => ({ ...e, clientFeeling: '' })); }}
                aria-pressed={clientFeeling === value}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 px-1 rounded-lg border-2 transition-all touch-manipulation min-h-[64px]',
                  'text-xs font-bold uppercase tracking-wide',
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
            <p className="text-xs text-destructive mt-2">{errors.clientFeeling}</p>
          )}
        </div>

        {/* Optional Notes */}
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">Anything else for your coach?</p>
          <Textarea
            placeholder="Pain, blockers, schedule changes, or just how your week went..."
            value={painBlockers}
            onChange={(e) => setPainBlockers(e.target.value.slice(0, 500))}
            rows={3}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1 text-right tabular-nums">{painBlockers.length}/500</p>
        </div>

        {/* Recent Workouts Summary */}
        {recentCompletions.length > 0 && (
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-3 antialiased">Recent Workouts</p>
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

        {/* Submit Error */}
        {errors.submit && (
          <p className="text-sm text-destructive text-center">{errors.submit}</p>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full h-14 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.97] transition-[background-color,transform] duration-150"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          Submit Check-in
        </Button>
      </div>
    </div>
  );
}
