import { CheckIn, CompletedWorkout, WorkoutPlan } from '@/types';
import { Modal } from '@/components/ui/Modal';
import { CheckCircle2, XCircle, AlertTriangle, CheckSquare } from 'lucide-react';
import { format } from 'date-fns';

const FEELING_LABELS: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

interface CheckInDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkIn: CheckIn | null;
  completedWorkouts: CompletedWorkout[];
  plan?: WorkoutPlan;
}

/**
 * Modal showing full details of a check-in for the client.
 * Uses positive, encouraging language.
 */
export function CheckInDetailModal({
  isOpen,
  onClose,
  checkIn,
  completedWorkouts,
  plan,
}: CheckInDetailModalProps) {
  if (!checkIn) return null;

  const checkInDate = format(
    new Date(checkIn.completedAt || checkIn.date),
    'MMMM d, yyyy'
  );

  const workoutFeeling = checkIn.workoutFeeling
    ? FEELING_LABELS[checkIn.workoutFeeling]
    : null;
  const bodyFeeling = checkIn.bodyFeeling
    ? FEELING_LABELS[checkIn.bodyFeeling]
    : null;

  // Get workouts completed around the check-in date
  const checkInDateObj = new Date(checkIn.date);
  const weekStart = new Date(checkInDateObj);
  weekStart.setDate(weekStart.getDate() - 7);

  const weekWorkouts = completedWorkouts.filter((w) => {
    if (w.clientId !== checkIn.clientId) return false;
    const workoutDate = new Date(w.completedAt);
    return workoutDate >= weekStart && workoutDate <= checkInDateObj;
  });

  // Get workout names from plan if available
  const getWorkoutName = (dayId: string): string => {
    if (!plan) return 'Workout';
    for (const week of plan.weeks) {
      const day = week.days.find((d) => d.id === dayId);
      if (day) return day.name;
    }
    return 'Workout';
  };

  // Get flagged workout details
  const flaggedWorkout = checkIn.flaggedWorkoutId
    ? completedWorkouts.find((w) => w.id === checkIn.flaggedWorkoutId)
    : null;

  // Calculate completion stats
  const totalExpected = plan?.workoutsPerWeek || 4;
  const uniqueWorkoutDays = new Set(
    weekWorkouts.map((w) => `${w.planId}-${w.weekId}-${w.dayId}`)
  );
  const completed = uniqueWorkoutDays.size;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Check-in - ${checkInDate}`} maxWidth="lg">
      <div className="space-y-6">
        {/* What You Said */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            What You Said
          </h3>
          <div className="space-y-3">
            {workoutFeeling && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{workoutFeeling.emoji}</span>
                <span className="text-sm">
                  Workouts felt: <span className="font-medium">{workoutFeeling.label}</span>
                </span>
              </div>
            )}
            {bodyFeeling && (
              <div className="flex items-center gap-2">
                <span className="text-lg">{bodyFeeling.emoji}</span>
                <span className="text-sm">
                  Body feels: <span className="font-medium">{bodyFeeling.label}</span>
                </span>
              </div>
            )}
            {flaggedWorkout && (
              <div className="flex items-start gap-2 text-warning">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">
                  Flagged: <span className="font-medium">{getWorkoutName(flaggedWorkout.dayId)}</span>
                  {checkIn.flaggedWorkoutNote && (
                    <p className="mt-1 text-muted-foreground">"{checkIn.flaggedWorkoutNote}"</p>
                  )}
                </span>
              </div>
            )}
            {checkIn.clientNotes && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm italic">"{checkIn.clientNotes}"</p>
              </div>
            )}
          </div>
        </section>

        {/* Divider */}
        <hr className="border-border" />

        {/* Coach's Feedback */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Your Coach's Feedback
          </h3>
          {checkIn.coachResponse ? (
            <div className="space-y-3">
              <div className="bg-info/5 rounded-lg p-4 border border-info/20">
                <p className="text-sm">{checkIn.coachResponse}</p>
              </div>
              {checkIn.planAdjustment && (
                <div className="flex items-center gap-2 text-success">
                  <CheckSquare className="w-4 h-4" />
                  <span className="text-sm font-medium">Your plan was updated based on this check-in</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your coach will respond soon!
            </p>
          )}
        </section>

        {/* Divider */}
        <hr className="border-border" />

        {/* This Week's Workouts */}
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            That Week's Workouts
          </h3>
          {weekWorkouts.length > 0 ? (
            <div className="space-y-2">
              {weekWorkouts.map((workout) => (
                <div
                  key={workout.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span>{getWorkoutName(workout.dayId)}</span>
                  <span className="text-muted-foreground text-xs">
                    ({format(new Date(workout.completedAt), 'MMM d')})
                  </span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium">
                  {completed >= totalExpected ? (
                    <span className="text-success">
                      You completed all {completed} workouts! Great job! 🎉
                    </span>
                  ) : (
                    <span className="text-foreground">
                      You completed {completed} out of {totalExpected} workouts
                    </span>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No workouts logged this week.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}
