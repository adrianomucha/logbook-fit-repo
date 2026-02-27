import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, MessageSquare, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckIn, ExerciseFlag, WorkoutCompletion, WorkoutPlan, Exercise } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { FEELING_LABELS } from '@/lib/checkin-helpers';

interface FlaggedExerciseWithContext {
  flag: ExerciseFlag;
  exerciseName: string;
  exerciseDetails: string;
  date: Date;
}

interface LastCheckInCardProps {
  checkIn: CheckIn | null;
  onStartCheckIn: () => void;
  // Flagged exercises props (merged into this card)
  exerciseFlags?: ExerciseFlag[];
  workoutCompletions?: WorkoutCompletion[];
  plan?: WorkoutPlan;
  clientId?: string;
  onMessageAboutFlag?: (flag: ExerciseFlag, exerciseName: string) => void;
}

export function LastCheckInCard({
  checkIn,
  onStartCheckIn,
  exerciseFlags = [],
  workoutCompletions = [],
  plan,
  clientId,
  onMessageAboutFlag,
}: LastCheckInCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Build flagged exercises with context
  const flaggedExercises = useMemo(() => {
    if (!plan || !clientId) return [];

    const clientCompletions = workoutCompletions.filter(
      (wc) => wc.clientId === clientId
    );

    // Build a map of exerciseId -> Exercise details from plan
    const exerciseMap = new Map<string, Exercise>();
    plan.weeks.forEach((week) => {
      week.days.forEach((day) => {
        day.exercises?.forEach((exercise) => {
          exerciseMap.set(exercise.id, exercise);
        });
      });
    });

    const flagsWithContext: FlaggedExerciseWithContext[] = [];

    exerciseFlags.forEach((flag) => {
      const completion = clientCompletions.find(
        (wc) => wc.id === flag.workoutCompletionId
      );
      if (!completion) return;

      const exercise = exerciseMap.get(flag.exerciseId);
      if (!exercise) return;

      // Build exercise details string
      const details: string[] = [];
      if (exercise.sets) details.push(`${exercise.sets}x`);
      if (exercise.reps) details.push(exercise.reps);
      if (exercise.weight) details.push(`@ ${exercise.weight}`);
      const exerciseDetails = details.join('') || 'No details';

      flagsWithContext.push({
        flag,
        exerciseName: exercise.name,
        exerciseDetails,
        date: new Date(flag.flaggedAt),
      });
    });

    return flagsWithContext.sort(
      (a, b) => b.date.getTime() - a.date.getTime()
    );
  }, [exerciseFlags, workoutCompletions, plan, clientId]);

  const hasFlags = flaggedExercises.length > 0;

  // Empty state - no check-in yet
  if (!checkIn) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Check-in Context
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {/* Flagged exercises even without check-in */}
          {hasFlags && (
            <div className="mb-4">
              <FlaggedExercisesSubsection
                flaggedExercises={flaggedExercises}
                onMessageAboutFlag={onMessageAboutFlag}
              />
            </div>
          )}

          <div className="text-center py-4 border-t">
            <p className="font-medium">No check-ins yet</p>
            <p className="text-sm text-muted-foreground mb-3">
              Start the first check-in to begin the coaching loop
            </p>
            <Button onClick={onStartCheckIn} size="sm">
              Start First Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const checkInDate = new Date(checkIn.completedAt || checkIn.date);
  const daysAgo = Math.floor(
    (Date.now() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Color coding for days ago
  const getDaysAgoColor = () => {
    if (daysAgo >= 14) return 'text-destructive';
    if (daysAgo >= 7) return 'text-warning';
    return 'text-muted-foreground';
  };

  // Get feeling label
  const getWorkoutFeelingLabel = () => {
    if (!checkIn.workoutFeeling) return null;
    return FEELING_LABELS.workout[checkIn.workoutFeeling] || checkIn.workoutFeeling;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength).trim() + '...';
  };

  const hasExpandableContent =
    (checkIn.clientNotes?.length ?? 0) > 100 ||
    (checkIn.coachResponse?.length ?? 0) > 100 ||
    checkIn.bodyFeeling;

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Check-in Context
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Flagged Exercises (if any) - shown first as it's most actionable */}
        {hasFlags && (
          <FlaggedExercisesSubsection
            flaggedExercises={flaggedExercises}
            onMessageAboutFlag={onMessageAboutFlag}
          />
        )}

        {/* Last Check-in */}
        <div className={cn(hasFlags && 'pt-3 border-t')}>
          {/* Header with date and days ago */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium">Last check-in</span>
            <span className="text-sm text-muted-foreground">
              {format(checkInDate, 'MMM d')}
            </span>
            <span className={cn('text-sm', getDaysAgoColor())}>
              ({formatDistanceToNow(checkInDate, { addSuffix: true })})
            </span>
          </div>

          {/* Client response preview */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              {getWorkoutFeelingLabel() && (
                <Badge variant="secondary" className="shrink-0">
                  {getWorkoutFeelingLabel()}
                </Badge>
              )}
              {checkIn.clientNotes && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  "{isExpanded ? checkIn.clientNotes : truncateText(checkIn.clientNotes, 100)}"
                </p>
              )}
              {!checkIn.clientNotes && !getWorkoutFeelingLabel() && (
                <p className="text-sm text-muted-foreground italic">No client notes</p>
              )}
            </div>

            {/* Coach response preview */}
            {checkIn.coachResponse && (
              <div className="pl-3 border-l-2 border-primary/30">
                <p className="text-xs text-muted-foreground mb-1">Your response:</p>
                <p className="text-sm line-clamp-2">
                  {isExpanded
                    ? checkIn.coachResponse
                    : truncateText(checkIn.coachResponse, 100)}
                </p>
              </div>
            )}
          </div>

          {/* Expanded content */}
          {isExpanded && (
            <div className="mt-3 pt-3 border-t space-y-2">
              {checkIn.bodyFeeling && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">How body felt:</p>
                  <Badge variant="outline">
                    {FEELING_LABELS.body[checkIn.bodyFeeling] || checkIn.bodyFeeling}
                  </Badge>
                </div>
              )}

              {checkIn.clientNotes && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Full notes:</p>
                  <p className="text-sm">{checkIn.clientNotes}</p>
                </div>
              )}

              {checkIn.coachResponse && (
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Full response:</p>
                  <p className="text-sm">{checkIn.coachResponse}</p>
                </div>
              )}
            </div>
          )}

          {/* Expand/collapse button */}
          {hasExpandableContent && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-1" />
                  View full check-in
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component for flagged exercises
function FlaggedExercisesSubsection({
  flaggedExercises,
  onMessageAboutFlag,
}: {
  flaggedExercises: FlaggedExerciseWithContext[];
  onMessageAboutFlag?: (flag: ExerciseFlag, exerciseName: string) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-warning" />
        <span className="text-sm font-medium text-warning">
          {flaggedExercises.length} Flagged Exercise{flaggedExercises.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="space-y-2">
        {flaggedExercises.slice(0, 3).map(({ flag, exerciseName, exerciseDetails, date }) => (
          <div
            key={flag.id}
            className="border-l-2 border-warning pl-3 py-1"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{exerciseName}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(date, 'MMM d')}
                  </span>
                </div>
                {flag.note && (
                  <p className="text-sm text-muted-foreground truncate">
                    "{flag.note}"
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{exerciseDetails}</p>
              </div>
              {onMessageAboutFlag && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => onMessageAboutFlag(flag, exerciseName)}
                >
                  <MessageSquare className="w-3 h-3 mr-1" />
                  Message
                </Button>
              )}
            </div>
          </div>
        ))}

        {flaggedExercises.length > 3 && (
          <p className="text-xs text-muted-foreground pl-3">
            +{flaggedExercises.length - 3} more flagged
          </p>
        )}
      </div>
    </div>
  );
}
