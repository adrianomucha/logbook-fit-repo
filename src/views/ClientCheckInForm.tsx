import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCheckIn } from '@/hooks/api/useCheckIn';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const EFFORT_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'TOO_EASY', label: 'Too Easy', emoji: '😴' },
  { value: 'ABOUT_RIGHT', label: 'About Right', emoji: '💪' },
  { value: 'TOO_HARD', label: 'Too Hard', emoji: '😰' },
];

const FEELING_OPTIONS: { value: string; label: string; emoji: string }[] = [
  { value: 'FRESH', label: 'Fresh', emoji: '✨' },
  { value: 'NORMAL', label: 'Normal', emoji: '👍' },
  { value: 'TIRED', label: 'Tired', emoji: '😓' },
  { value: 'RUN_DOWN', label: 'Run Down', emoji: '🥴' },
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
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center animate-enter">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!checkIn) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <AlertTriangle className="w-10 h-10 mx-auto mb-4 text-muted-foreground/60" />
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Check-in Not Found</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">This check-in doesn't exist or has expired.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Already submitted
  if (checkIn.status !== 'PENDING') {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-4 text-success" />
            <h2 className="text-lg font-bold mb-1.5 tracking-tight antialiased">Already Submitted</h2>
            <p className="text-sm text-muted-foreground mb-5 antialiased">You've already responded to this check-in.</p>
            <Button onClick={() => router.push('/client')} className="active:scale-[0.96] transition-transform duration-150">Back to Dashboard</Button>
          </div>
        </div>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <div className="max-w-md w-full bg-card rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter">
          <div className="text-center py-12 px-6">
            <CheckCircle2 className="w-14 h-14 mx-auto mb-4 text-success" />
            <h2 className="text-xl font-bold mb-2 tracking-tight antialiased">Sent to your coach!</h2>
            <p className="text-sm text-muted-foreground antialiased">They'll review and get back to you soon.</p>
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
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="py-4">
          <button
            onClick={() => router.push('/client')}
            className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground font-medium hover:text-foreground transition-colors touch-manipulation mb-3 block"
          >
            ← Back
          </button>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mb-1">Check-in</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Weekly Check-in</h1>
        </div>

        {/* Question 1: Effort Rating */}
        <div>
          <p className="text-[11px] uppercase tracking-wide font-bold mb-3">How did your workouts feel?</p>
          <div className="grid grid-cols-3 gap-2">
            {EFFORT_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setEffortRating(value); setErrors(e => ({ ...e, effortRating: '' })); }}
                className={cn(
                  'py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors touch-manipulation min-h-[44px]',
                  effortRating === value
                    ? 'bg-foreground text-background'
                    : 'bg-muted/60 text-foreground hover:bg-muted'
                )}
              >
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
          <p className="text-[11px] uppercase tracking-wide font-bold mb-3">How does your body feel?</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FEELING_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => { setClientFeeling(value); setErrors(e => ({ ...e, clientFeeling: '' })); }}
                className={cn(
                  'py-3 rounded-lg text-sm font-bold uppercase tracking-wider transition-colors touch-manipulation min-h-[44px]',
                  clientFeeling === value
                    ? 'bg-foreground text-background'
                    : 'bg-muted/60 text-foreground hover:bg-muted'
                )}
              >
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
          <p className="text-[11px] uppercase tracking-wide font-bold mb-3">Anything else for your coach?</p>
          <Textarea
            placeholder="Pain, blockers, schedule changes, or just how your week went..."
            value={painBlockers}
            onChange={(e) => setPainBlockers(e.target.value.slice(0, 500))}
            rows={3}
          />
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1 text-right tabular-nums">{painBlockers.length}/500</p>
        </div>

        {/* Recent Workouts Summary */}
        {recentCompletions.length > 0 && (
          <div>
            <p className="text-[11px] uppercase tracking-wide font-bold mb-3">Recent Workouts</p>
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
          className="w-full h-14 text-base font-bold uppercase tracking-wider bg-foreground text-background hover:bg-foreground/90 active:scale-[0.97] transition-transform duration-150"
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
