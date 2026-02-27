import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCheckIn } from '@/hooks/api/useCheckIn';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Dumbbell, AlertTriangle, Loader2 } from 'lucide-react';
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
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!checkIn) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Check-in Not Found</h2>
            <p className="text-muted-foreground mb-4">This check-in doesn't exist or has expired.</p>
            <Button onClick={() => router.push('/client')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Already submitted
  if (checkIn.status !== 'PENDING') {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
            <h2 className="text-xl font-bold mb-2">Already Submitted</h2>
            <p className="text-muted-foreground mb-4">You've already responded to this check-in.</p>
            <Button onClick={() => router.push('/client')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background p-3 sm:p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-success" />
            <h2 className="text-2xl font-bold mb-2">Sent to your coach!</h2>
            <p className="text-muted-foreground">They'll review and get back to you soon.</p>
          </CardContent>
        </Card>
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
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => router.push('/client')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Weekly Check-in</h1>
          <p className="text-muted-foreground text-sm mt-1">Let your coach know how things are going</p>
        </div>

        {/* Question 1: Effort Rating */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How did your workouts feel this week?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {EFFORT_OPTIONS.map(({ value, label, emoji }) => (
                <Button
                  key={value}
                  variant={effortRating === value ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => { setEffortRating(value); setErrors(e => ({ ...e, effortRating: '' })); }}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            {errors.effortRating && (
              <p className="text-xs text-destructive mt-2">{errors.effortRating}</p>
            )}
          </CardContent>
        </Card>

        {/* Question 2: Body Feeling */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How does your body feel?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FEELING_OPTIONS.map(({ value, label, emoji }) => (
                <Button
                  key={value}
                  variant={clientFeeling === value ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => { setClientFeeling(value); setErrors(e => ({ ...e, clientFeeling: '' })); }}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            {errors.clientFeeling && (
              <p className="text-xs text-destructive mt-2">{errors.clientFeeling}</p>
            )}
          </CardContent>
        </Card>

        {/* Optional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anything else for your coach?</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Pain, blockers, schedule changes, or just how your week went..."
              value={painBlockers}
              onChange={(e) => setPainBlockers(e.target.value.slice(0, 500))}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{painBlockers.length}/500</p>
          </CardContent>
        </Card>

        {/* Recent Workouts Summary */}
        {recentCompletions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Recent Workouts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentCompletions.map((completion) => (
                  <div
                    key={completion.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  >
                    <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {completion.day?.name ?? 'Workout'}
                      </p>
                      {completion.completedAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(completion.completedAt), 'EEEE, MMM d')}
                        </p>
                      )}
                    </div>
                    {completion.completionPct != null && (
                      <p className="text-xs text-muted-foreground shrink-0">
                        {Math.round(completion.completionPct)}%
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {recentCompletions.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No recent completed workouts
            </CardContent>
          </Card>
        )}

        {/* Submit Error */}
        {errors.submit && (
          <p className="text-sm text-destructive text-center">{errors.submit}</p>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
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
