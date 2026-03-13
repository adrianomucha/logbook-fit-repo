import { useState, useMemo, useRef, useEffect } from 'react';
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
  /** Visual weight: 'card' (default) with border, 'flat' borderless */
  variant?: 'card' | 'flat';
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
  variant = 'card',
}: InlineCheckInReviewProps) {
  const [coachResponse, setCoachResponse] = useState('');
  const [planAdjustment, setPlanAdjustment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Timer refs for cleanup on unmount
  const sentTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const successTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      clearTimeout(sentTimerRef.current);
      clearTimeout(successTimerRef.current);
    };
  }, []);

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
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newCheckIn = createCheckIn(client.id, currentUserId);
      onCreateCheckIn(newCheckIn);
      setJustSentCheckIn(true);
      sentTimerRef.current = setTimeout(() => setJustSentCheckIn(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteCheckIn = () => {
    if (!activeCheckIn || !coachResponse.trim() || isSubmitting) return;
    setIsSubmitting(true);

    const completed = completeCheckIn(activeCheckIn, {
      coachResponse: coachResponse.trim(),
      planAdjustment,
    });

    onCompleteCheckIn(completed);
    setCoachResponse('');
    setPlanAdjustment(false);
    setShowSuccess(true);
    setIsSubmitting(false);

    successTimerRef.current = setTimeout(() => setShowSuccess(false), 3000);
  };

  // Safe first-name extraction — never returns empty string
  const firstName = client.name?.split(' ')[0] || client.name || 'Client';

  const isFlat = variant === 'flat';
  const Wrapper = isFlat ? 'div' : Card;

  // Success message (inline, not a separate page)
  if (showSuccess) {
    return (
      <Wrapper className="animate-fade-in-up">
        <div className="py-8">
          <div className="flex flex-col items-center text-center gap-2">
            <CheckCircle2 className="w-10 h-10 text-success" />
            <h3 className="font-semibold text-lg">
              Check-in complete
            </h3>
            <p className="text-sm text-muted-foreground">
              Your response has been sent to {firstName}.
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // State: No active check-in
  if (!activeCheckIn) {
    return (
      <Wrapper>
        <div className={cn("pb-2", isFlat ? '' : 'px-3 sm:px-6 pt-6')}>
          <div className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5" />
            Check-In
          </div>
        </div>
        <div className={cn(isFlat ? '' : 'px-3 sm:px-6 pb-6')}>
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
              Start a check-in to hear how {firstName} is doing.
            </p>
            <Button onClick={handleStartNewCheckIn} size="sm" disabled={isSubmitting}>
              <ClipboardCheck className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Sending…' : 'Send Check-in'}
            </Button>
          </div>
        </div>
      </Wrapper>
    );
  }

  // State: Pending (waiting for client)
  if (activeCheckIn.status === 'pending') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.date), { addSuffix: true });

    // Show a special "just sent" confirmation for 5 seconds
    // Can be triggered from local button OR from parent (status header button)
    if (justSentCheckIn || justSentFromParent) {
      return (
        <Wrapper className="animate-fade-in-up">
          <div className={cn("py-6", isFlat ? '' : 'px-3 sm:px-6')}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-full">
                <SendHorizonal className="w-6 h-6 text-success" />
              </div>
              <div>
                <h3 className="font-semibold">
                  Check-in Sent!
                </h3>
                <p className="text-sm text-muted-foreground">
                  {firstName} will be notified to share how things are going.
                </p>
              </div>
            </div>
          </div>
        </Wrapper>
      );
    }

    return (
      <Wrapper>
        <div className={cn("pb-2", isFlat ? '' : 'px-3 sm:px-6 pt-6')}>
          <div className="text-lg sm:text-xl font-bold flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground animate-pulse" />
            Waiting for {firstName}
          </div>
        </div>
        <div className={cn("space-y-4", isFlat ? '' : 'px-3 sm:px-6 pb-6')}>
          {/* Status explanation */}
          <div className="bg-background rounded-lg p-3 border">
            <p className="text-sm font-medium mb-1">
              Check-in sent {sentAgo}
            </p>
            <p className="text-xs text-muted-foreground">
              {firstName} will get a notification to share how workouts are going.
              Once {firstName} responds, you&apos;ll see the feedback here and can reply.
            </p>
          </div>

          {/* What client will see */}
          <div className="text-xs text-muted-foreground">
            <p className="font-medium mb-1">What {firstName} will answer:</p>
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
        </div>
      </Wrapper>
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
    <Wrapper>
      {!hideTitle && (
        <div className={cn("pb-2", isFlat ? '' : 'px-3 sm:px-6 pt-6')}>
          <div className="flex items-center justify-between gap-2">
            <div className="text-lg sm:text-xl font-bold flex items-center gap-2 min-w-0">
              <ClipboardCheck className="w-5 h-5 shrink-0" />
              <span className="truncate">{firstName}&apos;s Check-In</span>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              {activeCheckIn.clientRespondedAt
                ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true })
                : 'recently'}
            </span>
          </div>
        </div>
      )}
      <div className={cn("space-y-4", isFlat ? '' : 'px-3 sm:px-6 pb-6', hideTitle && "pt-4")}>
        {/* Feeling indicators */}
        {(workoutFeeling || bodyFeeling) && (
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {workoutFeeling && (
              <div className="bg-muted/40 rounded-xl p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Workouts felt</p>
                <p className="text-lg font-bold">
                  <span className="text-xl mr-1">{workoutFeeling.emoji}</span> {workoutFeeling.label}
                </p>
              </div>
            )}
            {bodyFeeling && (
              <div className="bg-muted/40 rounded-xl p-3 sm:p-4">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Body feels</p>
                <p className="text-lg font-bold">
                  <span className="text-xl mr-1">{bodyFeeling.emoji}</span> {bodyFeeling.label}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Client notes - flattened styling */}
        {activeCheckIn.clientNotes && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">
              Notes from {firstName}
            </p>
            <p className="text-sm bg-background/60 rounded-lg p-3">
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
        <div className="space-y-3 bg-muted/50 rounded-xl p-3 sm:p-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block font-medium">Your response</label>
            <Textarea
              placeholder={`Write your response to ${firstName}...`}
              value={coachResponse}
              onChange={(e) => setCoachResponse(e.target.value.slice(0, 1000))}
              maxLength={1000}
              rows={3}
              className="bg-background border-border/60"
            />
            {coachResponse.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1 text-right">
                {coachResponse.length}/1000
              </p>
            )}
          </div>

          <label className="flex items-center gap-3 cursor-pointer min-h-[44px] px-1 -mx-1 rounded-md hover:bg-muted/50 transition-colors">
            <Checkbox
              checked={planAdjustment}
              onCheckedChange={(checked) => setPlanAdjustment(!!checked)}
              className="h-5 w-5"
            />
            <span className="text-sm select-none">I&apos;ll adjust the plan based on this feedback</span>
          </label>

          <Button
            onClick={handleCompleteCheckIn}
            disabled={!coachResponse.trim() || isSubmitting}
            className={cn(
              "w-full min-h-[48px] text-sm font-semibold transition-all duration-150 active:scale-[0.98]",
              coachResponse.trim()
                ? 'bg-foreground text-background hover:bg-foreground/90 shadow-sm'
                : ''
            )}
            variant={coachResponse.trim() ? 'default' : 'outline'}
            size="lg"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Sending…' : 'Complete Check-in'}
          </Button>
        </div>
      </div>
    </Wrapper>
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
    <div className="bg-muted/50 rounded-lg p-3 border">
      <div className="flex items-center gap-2 mb-2">
        <Flag className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">
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
