import { format } from 'date-fns';
import { WorkoutDay, WorkoutCompletion } from '@/types';
import { parseSessionName } from '@/lib/session-name';
import { QuickEffortFeedback } from './QuickEffortFeedback';
import { Check, RotateCcw, MessageSquare } from 'lucide-react';

interface SessionCompleteCardProps {
  workoutDay?: WorkoutDay;
  completion: WorkoutCompletion;
  coachName?: string;
  feedbackSubmitted?: boolean;
  isSendingFeedback?: boolean;
  onSendFeedback: (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => void;
  onRestartWorkout?: () => void;
  isRestarting?: boolean;
  onMessageCoach: () => void;
}

const EFFORT_LABELS: Record<string, string> = {
  EASY: 'Easy',
  MEDIUM: 'Medium',
  HARD: 'Hard',
};

/**
 * The completed state as a single session report: the payoff moment (volt
 * check + "Done."), the session's numbers in the brand's mono data voice,
 * the effort prompt, and the quiet follow-up actions — one module instead
 * of a loose stack of cards, so the screen reads finished, not empty.
 */
export function SessionCompleteCard({
  workoutDay,
  completion,
  coachName,
  feedbackSubmitted,
  isSendingFeedback,
  onSendFeedback,
  onRestartWorkout,
  isRestarting,
  onMessageCoach,
}: SessionCompleteCardProps) {
  const { day, title, subtitle } = parseSessionName(
    workoutDay?.name || 'Today’s workout'
  );

  const eyebrow = [day ? `Day ${day}` : 'Today', 'Session complete'].join(' · ');
  const finishedAt = completion.completedAt
    ? format(new Date(completion.completedAt), 'h:mm a')
    : null;

  // The session's numbers — value in the foreground, unit stays quiet
  const minutes = completion.durationSec
    ? Math.max(1, Math.round(completion.durationSec / 60))
    : null;
  const effort = completion.effortRating
    ? EFFORT_LABELS[completion.effortRating]
    : null;

  const stats: [string, string][] = [];
  if (minutes !== null) stats.push([String(minutes), 'min']);
  if (completion.exercisesTotal > 0) {
    const done = completion.exercisesDone;
    const total = completion.exercisesTotal;
    stats.push([
      done === total ? String(total) : `${done}/${total}`,
      total === 1 && done === total ? 'exercise' : 'exercises',
    ]);
  }
  if (effort) stats.push([effort, 'effort']);

  const actionClass =
    'flex-1 h-12 flex items-center justify-center gap-2 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors touch-manipulation disabled:opacity-60 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset';

  return (
    <section
      aria-label="Session complete"
      className="rounded-2xl bg-card border border-border/70 overflow-hidden"
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground truncate">
            {eyebrow}
          </p>
          {finishedAt && (
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] tabular-nums text-muted-foreground/70 shrink-0">
              {finishedAt}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4 mt-4">
          <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shrink-0 animate-[completionPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]">
            <Check className="w-7 h-7 text-brand-foreground stroke-[3]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-none">
              Done.
            </h2>
            <p className="text-[15px] text-muted-foreground mt-1.5 text-pretty">
              {title}
              {subtitle && (
                <span className="text-muted-foreground/60"> · {subtitle}</span>
              )}
            </p>
          </div>
        </div>

        {stats.length > 0 && (
          <p className="font-mono text-[13px] tabular-nums mt-5 pt-4 border-t border-border/50">
            {stats.map(([value, unit], i) => (
              <span key={unit}>
                {i > 0 && <span className="text-muted-foreground/40">&ensp;·&ensp;</span>}
                <span className="font-semibold text-foreground">{value}</span>
                <span className="text-muted-foreground"> {unit}</span>
              </span>
            ))}
          </p>
        )}
      </div>

      {/* Effort prompt lives inside the report until it's answered… */}
      {!feedbackSubmitted && (
        <div className="border-t border-border/50 p-5 sm:p-6">
          <QuickEffortFeedback
            bare
            onSubmit={onSendFeedback}
            isSubmitting={isSendingFeedback}
          />
        </div>
      )}

      {/* …then collapses to a one-line receipt */}
      {feedbackSubmitted && (
        <div className="border-t border-border/50 px-5 sm:px-6 py-3.5 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-success-text shrink-0" strokeWidth={3} />
          <p className="text-[13px] text-muted-foreground">
            Feedback sent{coachName ? ` to ${coachName.split(' ')[0]}` : ''}
          </p>
        </div>
      )}

      {/* Quiet follow-ups — neither deserves to shout on a finished day */}
      <div className="border-t border-border/50 flex divide-x divide-border/50">
        {onRestartWorkout && (
          <button
            type="button"
            onClick={onRestartWorkout}
            disabled={isRestarting}
            className={actionClass}
          >
            <RotateCcw className="w-4 h-4" />
            {isRestarting ? 'Restarting…' : 'Restart workout'}
          </button>
        )}
        <button type="button" onClick={onMessageCoach} className={actionClass}>
          <MessageSquare className="w-4 h-4" />
          Message {coachName?.split(' ')[0] ?? 'coach'}
        </button>
      </div>
    </section>
  );
}
