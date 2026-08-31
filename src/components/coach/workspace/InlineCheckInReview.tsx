import { useState, useMemo, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Check,
  ClipboardCheck,
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
// One shared feeling map for the whole loop (client form, standalone review,
// this panel) — same labels, same AA-contrast status colors everywhere
import { FEELING_DISPLAY } from '@/lib/feeling-display';

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
  /**
   * Persist the coach's response. Must reject if the write failed — this
   * panel only clears the draft and shows the success state once it resolves.
   */
  onCompleteCheckIn: (checkIn: CheckIn) => Promise<void> | void;
  onCreateCheckIn: (checkIn: CheckIn) => Promise<void> | void;
  /** Withdraw a still-unanswered check-in (sent by mistake, wrong timing) */
  onCancelCheckIn?: () => Promise<void> | void;
  onMessageAboutFlag?: (flag: ExerciseFlag, exerciseName: string) => void;
  /** Signal from parent that check-in was just sent (for showing confirmation) */
  justSentFromParent?: boolean;
  /** Visual weight: 'card' (default) with border, 'flat' borderless */
  variant?: 'card' | 'flat';
  /**
   * The page header already offers "Send check-in" as its primary action —
   * skip the idle prompt row so the same button never appears twice. With
   * nothing else to show (no recent flags) the idle state renders nothing.
   */
  hideSendPrompt?: boolean;
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
  onCancelCheckIn,
  onMessageAboutFlag,
  justSentFromParent = false,
  variant = 'card',
  hideSendPrompt = false,
}: InlineCheckInReviewProps) {
  const [coachResponse, setCoachResponse] = useState('');
  const [responseError, setResponseError] = useState('');
  const [planAdjustment, setPlanAdjustment] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [justSentCheckIn, setJustSentCheckIn] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const responseRef = useRef<HTMLTextAreaElement>(null);

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

    // Workout activity from the past week — including sessions the client
    // started and never finished, since a flag raised mid-workout on an
    // abandoned session is exactly the "help me" signal to review
    const recentCompletions = workoutCompletions.filter((wc) => {
      if (wc.clientId !== client.id) return false;
      const at = wc.completedAt ?? wc.startedAt;
      return !!at && new Date(at) >= sevenDaysAgo;
    });

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

  const handleStartNewCheckIn = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const newCheckIn = createCheckIn(client.id, currentUserId);
      // Await before claiming it was sent — the parent toasts and rethrows
      // on failure, so a 409/500 must not paint "Sent to <name>".
      await onCreateCheckIn(newCheckIn);
      setJustSentCheckIn(true);
      sentTimerRef.current = setTimeout(() => setJustSentCheckIn(false), 5000);
    } catch {
      // Parent already surfaced the reason; just don't show the sent state.
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit stays enabled until the request starts (same pattern as the
  // standalone review) — an empty submit explains itself inline instead of
  // presenting a disabled button that silently drops from the tab order
  const handleCompleteCheckIn = async () => {
    if (!activeCheckIn || isSubmitting) return;
    if (!coachResponse.trim()) {
      setResponseError(`Write a response to ${firstName} before completing the check-in.`);
      responseRef.current?.focus();
      return;
    }
    setIsSubmitting(true);

    const completed = completeCheckIn(activeCheckIn, {
      coachResponse: coachResponse.trim(),
      planAdjustment,
    });

    try {
      await onCompleteCheckIn(completed);
    } catch {
      // Keep the draft and the checkbox exactly as typed so the coach can
      // retry without rewriting their response.
      setIsSubmitting(false);
      return;
    }

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
            {/* Same volt confirmation as the standalone review + finished workout */}
            <div className="w-12 h-12 rounded-full bg-brand flex items-center justify-center animate-bounce-once">
              <Check className="w-6 h-6 text-brand-foreground" strokeWidth={3} aria-hidden="true" />
            </div>
            <h3 className="font-bold text-lg tracking-tight mt-1">
              Check-in complete
            </h3>
            <p className="text-sm text-muted-foreground">
              Your response is on its way to {firstName}.
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // "Sent to <name>" confirmation, shown for 5 seconds after either send
  // button (this panel's or the page header's). Checked before the state
  // branches: right after a header-initiated send the refetch hasn't landed
  // yet, so activeCheckIn can still be null while the confirmation shows.
  if (justSentCheckIn || justSentFromParent) {
    return (
      <Wrapper className="animate-fade-in-up">
        <div className={cn("py-8", isFlat ? '' : 'px-3 sm:px-6')}>
          <div className="flex flex-col items-center text-center gap-2">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-full animate-bounce-once">
              <SendHorizonal className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg antialiased">
              Sent to {firstName}
            </h3>
            <p className="text-sm text-muted-foreground antialiased">
              They&apos;ll see it next time they open the app.
            </p>
          </div>
        </div>
      </Wrapper>
    );
  }

  // State: No active check-in
  if (!activeCheckIn) {
    // Nothing to say: the header carries the send action and there are no
    // flags to surface — render nothing rather than a decorative card
    if (hideSendPrompt && flaggedExercisesWithContext.length === 0) {
      return null;
    }
    return (
      <Wrapper>
        <div className={cn(isFlat ? '' : 'px-3 sm:px-6 pt-6 pb-6')}>
          {/* Show flagged exercises even without check-in */}
          {flaggedExercisesWithContext.length > 0 && (
            <FlaggedExercisesSection
              flags={flaggedExercisesWithContext}
              onMessageAboutFlag={onMessageAboutFlag}
            />
          )}

          {/* Quiet one-line prompt — this is a resting state, not a call to
              arms, so it stays a slim row instead of a tall centered block */}
          {!hideSendPrompt && (
            <div className={cn(
              "flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-1",
              flaggedExercisesWithContext.length > 0 && "border-t pt-4 mt-4"
            )}>
              <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="text-2xl select-none sm:ps-1" aria-hidden="true">📋</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold antialiased">Time for a check-in?</p>
                  <p className="text-sm text-muted-foreground antialiased">
                    See how {firstName}&apos;s training is going.
                  </p>
                </div>
              </div>
              <Button onClick={handleStartNewCheckIn} size="sm" disabled={isSubmitting} className="self-start sm:self-auto shrink-0 ps-2.5 active:scale-[0.96] transition-transform duration-150">
                <ClipboardCheck className="w-4 h-4 me-2" />
                {isSubmitting ? 'Sending…' : 'Send Check-in'}
              </Button>
            </div>
          )}
        </div>
      </Wrapper>
    );
  }

  // State: Pending (waiting for client)
  if (activeCheckIn.status === 'pending') {
    const sentAgo = formatDistanceToNow(new Date(activeCheckIn.date), { addSuffix: true });

    // One calm status line, same slim-row shape as the idle prompt — the
    // ball is in the client's court, so this state should ask for nothing.
    return (
      <Wrapper>
        <div className={cn(isFlat ? '' : 'px-3 sm:px-6 py-6')}>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-1">
            {/* Dot stays beside the heading on phones — alone on its own
                stacked row it reads as a stray mark */}
            <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
              <span className="relative flex h-2.5 w-2.5 shrink-0 sm:ms-1.5" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-warning" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold antialiased">Waiting on {firstName}</h3>
                <p className="text-sm text-muted-foreground antialiased">
                  Check-in sent <span className="tabular-nums">{sentAgo}</span> — you&apos;ll review their answers here.
                </p>
              </div>
            </div>
            {/* Escape hatch — sent by mistake or at a bad time */}
            {onCancelCheckIn && (
              <Button
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                className="self-start sm:self-auto shrink-0 text-muted-foreground hover:text-destructive"
                onClick={async () => {
                  if (isSubmitting) return;
                  setIsSubmitting(true);
                  try {
                    await onCancelCheckIn();
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
              >
                Withdraw
              </Button>
            )}
          </div>

          {/* Show flagged exercises while waiting */}
          {flaggedExercisesWithContext.length > 0 && (
            <div className="pt-4 mt-3 border-t">
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
    ? FEELING_DISPLAY[activeCheckIn.workoutFeeling]
    : null;
  const bodyFeeling = activeCheckIn.bodyFeeling
    ? FEELING_DISPLAY[activeCheckIn.bodyFeeling]
    : null;
  const submittedAgo = activeCheckIn.clientRespondedAt
    ? formatDistanceToNow(new Date(activeCheckIn.clientRespondedAt), { addSuffix: true }).replace(/^about /, '')
    : 'recently';

  return (
    <Wrapper>
      <div className={cn('space-y-5', isFlat ? '' : 'px-3 sm:px-6 py-6')}>
        {/* The client's answers as instrument readouts — same vitals grid as
            the page's stats strip, with the submitted time as one more reading */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
          {workoutFeeling && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-2">
                Workouts felt
              </p>
              <p className={cn(
                'font-mono text-sm font-bold uppercase tracking-[0.08em] antialiased',
                'flex items-center gap-2 leading-none',
                workoutFeeling.text
              )}>
                <span className="text-lg leading-none select-none" aria-hidden="true">{workoutFeeling.emoji}</span>
                {workoutFeeling.label}
              </p>
            </div>
          )}
          {bodyFeeling && (
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-2">
                Body feels
              </p>
              <p className={cn(
                'font-mono text-sm font-bold uppercase tracking-[0.08em] antialiased',
                'flex items-center gap-2 leading-none',
                bodyFeeling.text
              )}>
                <span className="text-lg leading-none select-none" aria-hidden="true">{bodyFeeling.emoji}</span>
                {bodyFeeling.label}
              </p>
            </div>
          )}
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-2">
              Submitted
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums leading-none antialiased">
              {submittedAgo}
            </p>
          </div>
        </div>

        {/* Client notes read as a quote — the brand's volt-edge treatment,
            capped near 65ch so the measure stays comfortable */}
        {activeCheckIn.clientNotes && (
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5">
              Notes from {firstName}
            </p>
            <p className="border-s-2 border-brand/60 ps-3 text-[15px] leading-relaxed text-foreground/90 max-w-prose text-pretty">
              {activeCheckIn.clientNotes}
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

        {/* Coach response — space-grouped with the evidence above, no sub-panel */}
        <div>
          <label
            htmlFor="inline-coach-response"
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased mb-1.5 block"
          >
            Your response
          </label>
          <Textarea
            id="inline-coach-response"
            ref={responseRef}
            aria-invalid={!!responseError || undefined}
            aria-describedby={responseError ? 'inline-coach-response-error' : undefined}
            placeholder={`Write your response to ${firstName}…`}
            value={coachResponse}
            onChange={(e) => {
              setCoachResponse(e.target.value.slice(0, 1000));
              if (responseError) setResponseError('');
            }}
            maxLength={1000}
            rows={4}
          />
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium mt-1.5 text-end tabular-nums">
            {coachResponse.length}/1000
          </p>
          {/* Stable live region so repeat empty submits re-announce */}
          <div role="alert" aria-live="assertive">
            {responseError && (
              <p id="inline-coach-response-error" className="text-sm text-destructive mt-1">
                {responseError}
              </p>
            )}
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer select-none mt-2.5 min-h-11">
            <Checkbox
              checked={planAdjustment}
              onCheckedChange={(checked) => setPlanAdjustment(!!checked)}
            />
            <span className="text-sm">I&apos;ll adjust the plan based on this feedback</span>
          </label>

          {/* Submit — the section's one volt moment */}
          <Button
            onClick={handleCompleteCheckIn}
            disabled={isSubmitting}
            className="w-full h-12 mt-4 text-sm font-bold uppercase tracking-wider bg-brand text-brand-foreground hover:bg-brand/90 active:scale-[0.96] transition-[background-color,transform] duration-150"
            size="lg"
          >
            {isSubmitting ? 'Sending…' : 'Complete check-in'}
          </Button>
        </div>
      </div>
    </Wrapper>
  );
}

// Sub-component for flagged exercises — same amber tile language as the
// standalone review's flag rows, with the Ask escape hatch into chat
function FlaggedExercisesSection({
  flags,
  onMessageAboutFlag,
}: {
  flags: FlaggedExerciseWithContext[];
  onMessageAboutFlag?: (flag: ExerciseFlag, exerciseName: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-warning-text font-medium antialiased mb-1.5">
        Flagged this week · {flags.length}
      </p>
      <div className="space-y-1.5">
        {flags.slice(0, 3).map(({ flag, exerciseName, workoutName, date }) => (
          <div key={flag.id} className="rounded-md bg-warning/10 px-2.5 py-2 flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="flex items-center gap-1.5 text-xs font-bold text-warning-text">
                <Flag className="w-3 h-3 shrink-0" aria-hidden="true" />
                {/* The icon carries "flagged" only visually — say it */}
                <span className="sr-only">Flagged: </span>
                <span className="truncate">{exerciseName}</span>
              </p>
              {/* foreground/70, not muted-foreground: the amber tint eats ~0.4 of contrast */}
              <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-foreground/70 font-medium mt-1">
                {workoutName} · {format(date, 'MMM d')}
              </p>
              {flag.note && (
                <p className="text-xs text-foreground/80 leading-relaxed mt-1 text-pretty">
                  &ldquo;{flag.note}&rdquo;
                </p>
              )}
            </div>
            {onMessageAboutFlag && (
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 px-2.5 text-xs bg-card tap-target"
                onClick={() => onMessageAboutFlag(flag, exerciseName)}
              >
                <MessageSquare className="w-3 h-3 me-1" aria-hidden="true" />
                Ask
                <span className="sr-only"> about {exerciseName}</span>
              </Button>
            )}
          </div>
        ))}

        {flags.length > 3 && (
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium">
            +{flags.length - 3} more flagged
          </p>
        )}
      </div>
    </div>
  );
}
