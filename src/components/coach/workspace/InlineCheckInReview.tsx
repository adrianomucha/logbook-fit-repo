import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Clock,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Dumbbell,
  Send,
  SendHorizonal,
  Flag,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  CheckIn,
  Client,
  WorkoutPlan,
  WorkoutCompletion,
  ExerciseFlag,
  Exercise,
} from '@/types';
import { format, formatDistanceToNow, subDays } from 'date-fns';
import { completeCheckIn, createCheckIn } from '@/lib/checkin-helpers';

const WORKOUT_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
};

const BODY_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

interface FlaggedExerciseWithContext {
  flag: ExerciseFlag;
  exerciseName: string;
  workoutName: string;
  date: Date;
}

interface InlineCheckInReviewProps {
  client: Client;
  activeCheckIn?: CheckIn | null;
  plan?: WorkoutPlan;
  workoutCompletions: WorkoutCompletion[];
  exerciseFlags: ExerciseFlag[];
  currentUserId: string;
  onCompleteCheckIn: (checkIn: CheckIn) => void;
  onCreateCheckIn: (checkIn: CheckIn) => void;
  onMessageAboutFlag?: (flag: ExerciseFlag, exerciseName: string) => void;
  /** Signal from parent that check-in was just sent (for showing confirmation) */
  justSentFromParent?: boolean;
  /** Hide the title when it would be redundant with status header */
  hideTitle?: boolean;
}

export function InlineCheckInReview({
  client,
  activeCheckIn,
  plan,
  workoutCompletions,
  exerciseFlags,
  currentUserId,
  onCompleteCheckIn,
  onCreateCheckIn,
  onMessageAboutFlag,
  justSentFromParent = false,
  hideTitle = false,
}: InlineCheckInReviewProps) {
  const [coachResponse, setCoachResponse] = useState('');
  const [planAdjustment, setPlanAdjustment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);

  // Get flagged exercises from recent workouts (past 7 days)
  const flaggedExercisesFromWeek = useMemo(() => {
    if (!client.id) return [];

    const sevenDaysAgo = subDays(new Date(), 7);

    // Get workout completions from the past week for this client
    const recentCompletions = workoutCompletions.filter(
      (wc) =>
        wc.clientId === client.id &&
        wc.status === 'COMPLETED' &&
        wc.completedAt &&
        new Date(wc.completedAt) >= sevenDaysAgo
    );

    const recentCompletionIds = new Set(recentCompletions.map((wc) => wc.id));

    // Filter exercise flags to those workout completions
    return exerciseFlags.filter((ef) => recentCompletionIds.has(ef.workoutCompletionId));
  }, [client.id, workoutCompletions, exerciseFlags]);

  // Build flagged exercises with context
  const flaggedExercisesWithContext = useMemo(() => {
    if (!plan) return [];

    // Build a map of exerciseId -> Exercise and dayId -> Day name
    const exerciseMap = new Map<string, Exercise>();
    const dayNameMap = new Map<string, string>();

    plan.weeks.forEach((week) => {
      week.days.forEach((day) => {
        dayNameMap.set(day.id, day.name);
        day.exercises?.forEach((exercise) => {
          exerciseMap.set(exercise.id, exercise);
        });
      });
    });

    const flagsWithContext: FlaggedExerciseWithContext[] = [];

    flaggedExercisesFromWeek.forEach((flag) => {
      const completion = workoutCompletions.find((wc) => wc.id === flag.workoutCompletionId);
      if (!completion) return;

      const exercise = exerciseMap.get(flag.exerciseId);
      if (!exercise) return;

      flagsWithContext.push({
        flag,
        exerciseName: exercise.name,
        workoutName: dayNameMap.get(completion.dayId) || 'Workout',
        date: new Date(flag.flaggedAt),
      });
    });

    return flagsWithContext.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [flaggedExercisesFromWeek, workoutCompletions, plan]);

  const handleStartNewCheckIn = () => {
    const newCheckIn = createCheckIn(client.id, currentUserId);
    onCreateCheckIn(newCheckIn);
    setJustSentCheckIn(true);
    // Clear the "just sent" state after 5 seconds
    setTimeout(() => setJustSentCheckIn(false), 5000);
  };

  const handleCompleteCheckIn = () => {
    if (!activeCheckIn || !coachResponse.trim()) return;

    const completed = completeCheckIn(activeCheckIn, {
      coachResponse: coachResponse.trim(),
      planAdjustment,
    });

    onCompleteCheckIn(completed);
    setCoachResponse('');
    setPlanAdjustment(false);
    setShowSuccess(true);

    // Reset success message after 3 seconds
    setTimeout(() => setShowSuccess(false), 3000);
  };

  // Success message (inline, not a separate page)
  if (showSuccess) {
    return (
      <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
        <CardContent className="py-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0" />
            <div>
              <h3 className="font-semibold text-green-700 dark:text-green-400">
                Check-in Complete!
              </h3>
              <p className="text-sm text-green-600 dark:text-green-500">
                Your response has been sent to {client.name}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State: No active check-in
  if (!activeCheckIn) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Check-In
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Show flagged exercises even without check-in */}
          {flaggedExercisesWithContext.length > 0 && (
            <div className="mb-4">
              <FlaggedExercisesSection
                flags={flaggedExercisesWithContext}
                onMessageAboutFlag={onMessageAboutFlag}
              />
            </div>
          )}

          <div className={cn(
            "text-center py-4",
            flaggedExercisesWithContext.length > 0 && "border-t"
          )}>
            <p className="font-medium">No active check-in</p>
            <p className="text-sm text-muted-foreground mb-3">
              Start a check-in to hear how {client.name.split(' ')[0]} is doing.
            </p>
            <Button onClick={handleStartNewCheckIn} size="sm">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Send Check-in
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // State: Pending (waiting for client)
  if (activeCheckIn.status === 'pending') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.date), { addSuffix: true });

    // Show a special "just sent" confirmation for 5 seconds
    // Can be triggered from local button OR from parent (status header button)
    if (justSentCheckIn || justSentFromParent) {
      return (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <SendHorizonal className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">
                  Check-in Sent!
                </h3>
                <p className="text-sm text-green-600 dark:text-green-500">
                  {client.name.split(' ')[0]} will be notified to share how they're doing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            Waiting for {client.name.split(' ')[0]}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status explanation */}
          <div className="bg-white dark:bg-background rounded-lg p-3 border">
            <p className="text-sm font-medium mb-1">
              Check-in sent {sentAgo}
            </p>
            <p className="text-xs text-muted-foreground">
              {client.name.split(' ')[0]} will receive a notification to share how their workouts are going.
              Once they respond, you'll see their feedback here and can reply.
            </p>
          </div>

          {/* What client will see */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">What {client.name.split(' ')[0]} will answer:</p>
            <ul className="list-disc list-inside space-y-0.5 ml-1">
              <li>How workouts felt (too easy / about right / too hard)</li>
              <li>How their body feels (fresh / normal / tired / run down)</li>
              <li>Any notes or concerns</li>
            </ul>
          </div>

          {/* Show flagged exercises while waiting */}
          {flaggedExercisesWithContext.length > 0 && (
            <div className="pt-3 border-t">
              <FlaggedExercisesSection
                flags={flaggedExercisesWithContext}
                onMessageAboutFlag={onMessageAboutFlag}
              />
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // State: Responded - Coach needs to review
  const workoutFeeling = activeCheckIn.workoutFeeling
    ? WORKOUT_FEELING_DISPLAY[activeCheckIn.workoutFeeling]
    : null;
  const bodyFeeling = activeCheckIn.bodyFeeling
    ? BODY_FEELING_DISPLAY[activeCheckIn.bodyFeeling]
    : null;

  return (
    <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
      {!hideTitle && (
        <CardHeader className="pb-2 px-3 sm:px-6">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2 min-w-0">
              <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span className="truncate">{client.name.split(' ')[0]}'s Check-In</span>
            </CardTitle>
            <span className="text-xs text-muted-foreground shrink-0">
              {activeCheckIn.clientRespondedAt
                ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true })
                : 'recently'}
            </span>
          </div>
        </CardHeader>
      )}
      <CardContent className={cn("space-y-4 px-3 sm:px-6", hideTitle && "pt-4")}>
        {/* Feeling indicators - flattened, no nested borders */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3">
          {workoutFeeling && (
            <div className="bg-white/60 dark:bg-background/40 rounded-lg p-2 sm:p-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Workouts felt</p>
              <p className="text-sm font-medium">
                {workoutFeeling.emoji} {workoutFeeling.label}
              </p>
            </div>
          )}
          {bodyFeeling && (
            <div className="bg-white/60 dark:bg-background/40 rounded-lg p-2 sm:p-2.5">
              <p className="text-xs text-muted-foreground mb-0.5">Body feels</p>
              <p className="text-sm font-medium">
                {bodyFeeling.emoji} {bodyFeeling.label}
              </p>
            </div>
          )}
        </div>

        {/* Client notes - flattened styling */}
        {activeCheckIn.clientNotes && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Notes from {client.name.split(' ')[0]}
            </p>
            <p className="text-sm bg-white/60 dark:bg-background/40 rounded-lg p-3">
              "{activeCheckIn.clientNotes}"
            </p>
          </div>
        )}

        {/* Flagged Exercises This Week */}
        {flaggedExercisesWithContext.length > 0 && (
          <FlaggedExercisesSection
            flags={flaggedExercisesWithContext}
            onMessageAboutFlag={onMessageAboutFlag}
          />
        )}

        {/* Coach Response - Inline Form */}
        <div className="pt-3 border-t space-y-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Your response</label>
            <Textarea
              placeholder={`Write your response to ${client.name.split(' ')[0]}...`}
              value={coachResponse}
              onChange={(e) => setCoachResponse(e.target.value.slice(0, 1000))}
              rows={3}
              className="bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {coachResponse.length}/1000
            </p>
          </div>

          <label className="flex items-start gap-2 cursor-pointer min-h-[44px]">
            <Checkbox
              checked={planAdjustment}
              onCheckedChange={(checked) => setPlanAdjustment(!!checked)}
              className="mt-0.5"
            />
            <span className="text-sm">I'll adjust the plan based on this feedback</span>
          </label>

          <Button
            onClick={handleCompleteCheckIn}
            disabled={!coachResponse.trim()}
            className="w-full min-h-[44px]"
            size="sm"
          >
            <Send className="w-4 h-4 mr-2" />
            Complete Check-in
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-component for flagged exercises
function FlaggedExercisesSection({
  flags,
  onMessageAboutFlag,
}: {
  flags: FlaggedExerciseWithContext[];
  onMessageAboutFlag?: (flag: ExerciseFlag, exerciseName: string) => void;
}) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-3 border border-amber-200">
      <div className="flex items-center gap-2 mb-2">
        <Flag className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
          Flagged This Week ({flags.length})
        </span>
      </div>

      <div className="space-y-2">
        {flags.slice(0, 3).map(({ flag, exerciseName, workoutName, date }) => (
          <div key={flag.id} className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-3 h-3 text-muted-foreground shrink-0" />
                <span className="text-sm font-medium truncate">{exerciseName}</span>
              </div>
              <p className="text-xs text-muted-foreground ml-5">
                {workoutName} · {format(date, 'MMM d')}
              </p>
              {flag.note && (
                <p className="text-xs text-muted-foreground ml-5 italic mt-0.5">
                  "{flag.note}"
                </p>
              )}
            </div>
            {onMessageAboutFlag && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0 h-7 text-xs"
                onClick={() => onMessageAboutFlag(flag, exerciseName)}
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                Ask
              </Button>
            )}
          </div>
        ))}

        {flags.length > 3 && (
          <p className="text-xs text-muted-foreground">+{flags.length - 3} more flagged</p>
        )}
      </div>
    </div>
  );
}
