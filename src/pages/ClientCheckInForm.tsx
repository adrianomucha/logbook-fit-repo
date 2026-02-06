import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppState, WorkoutFeeling, BodyFeeling } from '@/types';
import { submitClientResponse, getRecentWorkouts } from '@/lib/checkin-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle2, Dumbbell, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface ClientCheckInFormProps {
  appState: AppState;
  onUpdateState: (updater: (state: AppState) => AppState) => void;
}

const WORKOUT_FEELINGS: { value: WorkoutFeeling; label: string; emoji: string }[] = [
  { value: 'TOO_EASY', label: 'Too Easy', emoji: '😴' },
  { value: 'ABOUT_RIGHT', label: 'About Right', emoji: '💪' },
  { value: 'TOO_HARD', label: 'Too Hard', emoji: '😰' },
];

const BODY_FEELINGS: { value: BodyFeeling; label: string; emoji: string }[] = [
  { value: 'FRESH', label: 'Fresh', emoji: '✨' },
  { value: 'NORMAL', label: 'Normal', emoji: '👍' },
  { value: 'TIRED', label: 'Tired', emoji: '😓' },
  { value: 'RUN_DOWN', label: 'Run Down', emoji: '🥴' },
];

export function ClientCheckInForm({ appState, onUpdateState }: ClientCheckInFormProps) {
  const { checkinId } = useParams<{ checkinId: string }>();
  const navigate = useNavigate();

  const [workoutFeeling, setWorkoutFeeling] = useState<WorkoutFeeling | null>(null);
  const [bodyFeeling, setBodyFeeling] = useState<BodyFeeling | null>(null);
  const [clientNotes, setClientNotes] = useState('');
  const [flaggedWorkoutId, setFlaggedWorkoutId] = useState<string | null>(null);
  const [flaggedWorkoutNote, setFlaggedWorkoutNote] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);

  const checkIn = useMemo(
    () => appState.checkIns.find(c => c.id === checkinId),
    [appState.checkIns, checkinId]
  );

  const currentClient = appState.clients.find(c => c.id === appState.currentUserId);

  const recentWorkouts = useMemo(
    () => getRecentWorkouts(appState.currentUserId, appState.completedWorkouts, 7),
    [appState.currentUserId, appState.completedWorkouts]
  );

  // Find plan info for workout names
  const plan = useMemo(
    () => currentClient ? appState.plans.find(p => p.id === currentClient.currentPlanId) : undefined,
    [appState.plans, currentClient]
  );

  // Auto-redirect after success
  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => navigate('/client'), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess, navigate]);

  // Invalid states
  if (!checkIn) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-bold mb-2">Check-in Not Found</h2>
            <p className="text-muted-foreground mb-4">This check-in doesn't exist or has expired.</p>
            <Button onClick={() => navigate('/client')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (checkIn.status !== 'pending') {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h2 className="text-xl font-bold mb-2">Already Submitted</h2>
            <p className="text-muted-foreground mb-4">You've already responded to this check-in.</p>
            <Button onClick={() => navigate('/client')}>Back to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success screen
  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-600" />
            <h2 className="text-2xl font-bold mb-2">Sent to your coach!</h2>
            <p className="text-muted-foreground">They'll review and get back to you soon.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getWorkoutName = (workoutDayId: string): string => {
    if (!plan) return 'Workout';
    for (const week of plan.weeks) {
      const day = week.days.find(d => d.id === workoutDayId);
      if (day) return day.name;
    }
    return 'Workout';
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!workoutFeeling) newErrors.workoutFeeling = 'Please select how workouts felt';
    if (!bodyFeeling) newErrors.bodyFeeling = 'Please select how your body feels';
    if (flaggedWorkoutId && !flaggedWorkoutNote.trim()) {
      newErrors.flaggedWorkoutNote = 'Please add a note about this workout';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const updatedCheckIn = submitClientResponse(checkIn, {
      workoutFeeling: workoutFeeling!,
      bodyFeeling: bodyFeeling!,
      clientNotes: clientNotes.trim() || undefined,
      flaggedWorkoutId: flaggedWorkoutId || undefined,
      flaggedWorkoutNote: flaggedWorkoutId ? flaggedWorkoutNote.trim() : undefined,
    });

    onUpdateState(state => ({
      ...state,
      checkIns: state.checkIns.map(c => c.id === checkIn.id ? updatedCheckIn : c),
    }));

    setShowSuccess(true);
  };

  const canSubmit = workoutFeeling && bodyFeeling && (!flaggedWorkoutId || flaggedWorkoutNote.trim());

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div>
          <Button variant="ghost" onClick={() => navigate('/client')} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl sm:text-3xl font-bold">Weekly Check-in</h1>
          <p className="text-muted-foreground text-sm mt-1">Let your coach know how things are going</p>
        </div>

        {/* Question 1: Workout Feeling */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">How did your workouts feel this week?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {WORKOUT_FEELINGS.map(({ value, label, emoji }) => (
                <Button
                  key={value}
                  variant={workoutFeeling === value ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => { setWorkoutFeeling(value); setErrors(e => ({ ...e, workoutFeeling: '' })); }}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            {errors.workoutFeeling && (
              <p className="text-xs text-red-600 mt-2">{errors.workoutFeeling}</p>
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
              {BODY_FEELINGS.map(({ value, label, emoji }) => (
                <Button
                  key={value}
                  variant={bodyFeeling === value ? 'default' : 'outline'}
                  className="h-auto py-3 flex flex-col gap-1"
                  onClick={() => { setBodyFeeling(value); setErrors(e => ({ ...e, bodyFeeling: '' })); }}
                >
                  <span className="text-xl">{emoji}</span>
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            {errors.bodyFeeling && (
              <p className="text-xs text-red-600 mt-2">{errors.bodyFeeling}</p>
            )}
          </CardContent>
        </Card>

        {/* Optional Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Any notes for your coach?</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="How was your week? Anything your coach should know..."
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value.slice(0, 500))}
              rows={3}
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">{clientNotes.length}/500</p>
          </CardContent>
        </Card>

        {/* Flag a Workout */}
        {recentWorkouts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Flag a workout
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                Want your coach to look at a specific workout? Select one below.
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentWorkouts.map((workout) => (
                  <button
                    key={workout.id}
                    onClick={() => {
                      setFlaggedWorkoutId(flaggedWorkoutId === workout.id ? null : workout.id);
                      if (flaggedWorkoutId === workout.id) setFlaggedWorkoutNote('');
                      setErrors(e => ({ ...e, flaggedWorkoutNote: '' }));
                    }}
                    className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                      flaggedWorkoutId === workout.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <p className="font-medium text-sm">{getWorkoutName(workout.dayId)}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(workout.completedAt), 'EEEE, MMM d')}
                    </p>
                  </button>
                ))}
              </div>

              {flaggedWorkoutId && (
                <div className="mt-3">
                  <label className="text-sm font-medium mb-1 block">
                    What should your coach know about this workout?
                  </label>
                  <Textarea
                    placeholder="e.g., The weight felt too heavy on squats..."
                    value={flaggedWorkoutNote}
                    onChange={(e) => setFlaggedWorkoutNote(e.target.value.slice(0, 300))}
                    rows={2}
                  />
                  <p className="text-xs text-muted-foreground mt-1 text-right">{flaggedWorkoutNote.length}/300</p>
                  {errors.flaggedWorkoutNote && (
                    <p className="text-xs text-red-600 mt-1">{errors.flaggedWorkoutNote}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {recentWorkouts.length === 0 && (
          <Card>
            <CardContent className="py-6 text-center text-muted-foreground text-sm">
              No completed workouts this week to flag
            </CardContent>
          </Card>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="w-full"
          size="lg"
        >
          Submit Check-in
        </Button>
      </div>
    </div>
  );
}
