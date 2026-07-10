import { CheckIn, WorkoutCompletion, WorkoutPlan } from '@/types';
import { cn } from '@/lib/utils';
import { FEELING_DISPLAY } from '@/lib/feeling-display';
import { Modal } from '@/components/ui/Modal';
import { CheckCircle2, AlertTriangle, CheckSquare } from 'lucide-react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';

interface CheckInDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  checkIn: CheckIn | null;
  completedWorkouts: WorkoutCompletion[];
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
    ? FEELING_DISPLAY[checkIn.workoutFeeling]
    : null;
  const bodyFeeling = checkIn.bodyFeeling
    ? FEELING_DISPLAY[checkIn.bodyFeeling]
    : null;

  // Workouts completed in the 7 days ending on the check-in day (day-inclusive,
  // so workouts logged later the same day still count)
  const checkInDateObj = new Date(checkIn.date);
  const windowEnd = endOfDay(checkInDateObj);
  const windowStart = startOfDay(subDays(checkInDateObj, 6));

  const weekWorkouts = completedWorkouts
    .filter((w) => {
      if (w.clientId !== checkIn.clientId) return false;
      if (w.status !== 'COMPLETED' || !w.completedAt) return false;
      const workoutDate = new Date(w.completedAt);
      return workoutDate >= windowStart && workoutDate <= windowEnd;
    })
    .sort(
      (a, b) =>
        new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime()
    );

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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          <span className="block font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            Check-in
          </span>
          <span className="block text-lg sm:text-xl font-bold tracking-tight">
            {checkInDate}
          </span>
        </>
      }
      maxWidth="lg"
    >
      <div className="space-y-6">
        {/* What You Said */}
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            What You Said
          </h3>
          <div className="space-y-3">
            {workoutFeeling && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Workouts felt</span>
                <span className={cn('font-bold', workoutFeeling.text)}>{workoutFeeling.emoji} {workoutFeeling.label}</span>
              </div>
            )}
            {bodyFeeling && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Body feels</span>
                <span className={cn('font-bold', bodyFeeling.text)}>{bodyFeeling.emoji} {bodyFeeling.label}</span>
              </div>
            )}
            {flaggedWorkout && (
              <div className="flex items-start gap-2 text-warning">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="text-sm">
                  Flagged: <span className="font-medium">{getWorkoutName(flaggedWorkout.dayId)}</span>
                  {checkIn.flaggedWorkoutNote && (
                    <p className="mt-1 text-muted-foreground">&ldquo;{checkIn.flaggedWorkoutNote}&rdquo;</p>
                  )}
                </span>
              </div>
            )}
            {checkIn.clientNotes && (
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-sm italic">&ldquo;{checkIn.clientNotes}&rdquo;</p>
              </div>
            )}
          </div>
        </section>

        {/* Divider */}
        <hr className="border-border" />

        {/* Coach's Feedback */}
        <section>
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            Your Coach&apos;s Feedback
          </h3>
          {checkIn.coachResponse ? (
            <div className="space-y-3">
              <div className="rounded-xl bg-muted/40 px-4 py-4 border-l-2 border-brand">
                <p className="text-sm text-foreground/80 leading-relaxed">{checkIn.coachResponse}</p>
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
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground mb-3">
            That Week&apos;s Workouts
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
                    ({format(new Date(workout.completedAt!), 'MMM d')})
                  </span>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t">
                <p className="text-sm font-medium">
                  {completed >= totalExpected ? (
                    <span className="text-success">
                      You completed all {completed} workouts
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
            <p className="text-sm text-muted-foreground">No workouts logged that week.</p>
          )}
        </section>
      </div>
    </Modal>
  );
}
