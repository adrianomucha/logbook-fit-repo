import { useId, useState } from 'react';
import { WorkoutCompletion } from '@/types';
import { parseSessionName } from '@/lib/parse-session-name';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Check, Send } from 'lucide-react';

type EffortRating = 'EASY' | 'MEDIUM' | 'HARD';

// Selected states reuse the app's effort color semantics (check-in form,
// workout history): easy = success, medium = neutral, hard = warning.
const EFFORT_OPTIONS: { value: EffortRating; label: string; selectedClass: string }[] = [
  { value: 'EASY', label: 'Easy', selectedClass: 'text-success bg-success/10 border-success/40 ring-1 ring-success/20' },
  { value: 'MEDIUM', label: 'Medium', selectedClass: 'text-foreground bg-muted border-foreground/25 ring-1 ring-foreground/10' },
  { value: 'HARD', label: 'Hard', selectedClass: 'text-warning bg-warning/10 border-warning/40 ring-1 ring-warning/20' },
];

interface SessionCompleteCardProps {
  /** Raw coach-authored session name, e.g. "Day 5 — Lower B + Core (Backup)" */
  workoutName?: string;
  completion: WorkoutCompletion;
  coachName?: string;
  /** Effort rating already sent — show the quiet confirmation instead of the prompt */
  feedbackSubmitted?: boolean;
  isSubmittingFeedback?: boolean;
  onSubmitFeedback: (rating: EffortRating, notes?: string) => void;
}

/**
 * Hero card for a finished session — the completed-state sibling of
 * WorkoutOverview's scheduled hero. Same anatomy (mono eyebrow, big title,
 * stat band), plus the one thing left to do after training: tell the coach
 * how it felt. Everything lives in this single card so the state reads as
 * one moment, not three floating fragments.
 */
export function SessionCompleteCard({
  workoutName,
  completion,
  coachName,
  feedbackSubmitted,
  isSubmittingFeedback = false,
  onSubmitFeedback,
}: SessionCompleteCardProps) {
  const [selectedRating, setSelectedRating] = useState<EffortRating | null>(null);
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const promptId = useId();
  const notesId = useId();

  const { day, title, subtitle } = parseSessionName(workoutName || 'Today’s workout');
  const coachFirst = coachName?.split(' ')[0];

  const durationMin = completion.durationSec
    ? Math.max(1, Math.round(completion.durationSec / 60))
    : null;

  const stats: [string | number, string][] = [];
  if (durationMin) stats.push([durationMin, 'min']);
  stats.push([
    completion.exercisesDone < completion.exercisesTotal
      ? `${completion.exercisesDone}/${completion.exercisesTotal}`
      : completion.exercisesTotal,
    completion.exercisesTotal === 1 ? 'exercise' : 'exercises',
  ]);
  stats.push([`${completion.completionPct}%`, 'done']);

  const handleSubmit = () => {
    if (!selectedRating) return;
    onSubmitFeedback(selectedRating, notes.trim() || undefined);
  };

  return (
    <div className="rounded-2xl bg-card border border-border/70 p-5 sm:p-6">
      {/* Header — eyebrow + parsed title, volt check as the celebration mark */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            {day ? `Session complete · Day ${day}` : 'Session complete'}
          </p>
          <h2 className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-[1.15] mt-2.5 text-balance">
            {title}
          </h2>
          {subtitle && (
            <p className="text-[15px] text-muted-foreground mt-1.5">{subtitle}</p>
          )}
        </div>
        <div
          className="w-11 h-11 rounded-full bg-brand flex items-center justify-center shrink-0 animate-[completionPop_0.4s_cubic-bezier(0.34,1.56,0.64,1)_both]"
          aria-hidden="true"
        >
          <Check className="w-5 h-5 text-brand-foreground stroke-[3.5]" />
        </div>
      </div>

      {/* Stat band — numbers carry the weight, units stay quiet */}
      <p className="font-mono text-[13px] tabular-nums mt-4 pt-4 border-t border-border/50">
        {stats.map(([value, unit], i) => (
          <span key={unit}>
            {i > 0 && <span className="text-muted-foreground/40">&ensp;·&ensp;</span>}
            <span className="font-semibold text-foreground">{value}</span>
            <span className="text-muted-foreground"> {unit}</span>
          </span>
        ))}
      </p>

      {/* The in-progress bar, landed — same element the client watched fill up */}
      <div className="mt-3 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-brand"
          style={{ width: `${completion.completionPct}%` }}
        />
      </div>

      {feedbackSubmitted ? (
        <div className="mt-5 pt-4 border-t border-border/50 flex items-center gap-2">
          <Check className="w-3.5 h-3.5 text-success-text shrink-0" strokeWidth={3} aria-hidden="true" />
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Feedback sent{coachFirst ? ` to ${coachFirst}` : ''}
          </p>
        </div>
      ) : (
        <div className="mt-5 pt-5 border-t border-border/50">
          <p
            id={promptId}
            className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground mb-3"
          >
            How did that feel?
          </p>

          <div role="group" aria-labelledby={promptId} className="flex gap-2.5">
            {EFFORT_OPTIONS.map((option) => {
              const isSelected = selectedRating === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedRating(option.value)}
                  className={cn(
                    'flex-1 py-3.5 px-2 rounded-lg border-2 transition-[background-color,border-color,color,box-shadow] min-h-[52px] touch-manipulation',
                    'text-sm font-bold uppercase tracking-wide',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    isSelected
                      ? option.selectedClass
                      : 'border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {selectedRating && !showNotes && (
            <button
              type="button"
              onClick={() => setShowNotes(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline mt-1 min-h-[44px] flex items-center touch-manipulation rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Add a note (optional)
            </button>
          )}

          {showNotes && (
            <>
              <label htmlFor={notesId} className="sr-only">
                Note for your coach
              </label>
              <Textarea
                id={notesId}
                placeholder="Felt strong on the last set"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-3 min-h-[60px] text-base sm:text-sm"
              />
            </>
          )}

          {selectedRating && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmittingFeedback}
              className="w-full mt-3"
            >
              <Send className="w-4 h-4 mr-2" />
              {isSubmittingFeedback
                ? 'Sending…'
                : `Send to ${coachFirst ?? 'coach'}`}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
