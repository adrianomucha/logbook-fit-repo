import { WorkoutCompletion } from '@/types';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { CoachContextStrip } from './CoachContextStrip';
import { WorkoutOverview } from './WorkoutOverview';
import { SessionCompleteCard } from './SessionCompleteCard';
import { Button } from '@/components/ui/button';
import { WorkoutViewToggle } from '@/components/client/WorkoutViewToggle';
import { RotateCcw } from 'lucide-react';
import { EMPTY_WEEK_COPY } from '@logbook/shared/client-empty-states';

type ActionState = 'scheduled' | 'in-progress' | 'completed';

interface TodayFocusViewProps {
  todayWorkout: WeekDayInfo | null;
  todayCompletion: WorkoutCompletion | null;
  /** Coach's instruction note from today's workout exercises */
  coachNote?: string;
  coachName?: string;
  coachAvatar?: string;
  feedbackSubmitted?: boolean;
  isSendingFeedback?: boolean;
  onStartWorkout: () => void;
  /** The start request is in flight — the button waits so it can't fire twice */
  isStartingWorkout?: boolean;
  onResumeWorkout: () => void;
  onRestartWorkout?: () => void;
  isRestarting?: boolean;
  onSendFeedback: (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => void;
  onViewWeekly: () => void;
}

function getActionState(
  todayCompletion: WorkoutCompletion | null
): ActionState {
  if (todayCompletion?.status === 'COMPLETED') return 'completed';
  if (todayCompletion?.status === 'IN_PROGRESS') return 'in-progress';
  return 'scheduled';
}

export function TodayFocusView({
  todayWorkout,
  todayCompletion,
  coachNote,
  coachName,
  coachAvatar,
  feedbackSubmitted,
  isSendingFeedback,
  onStartWorkout,
  isStartingWorkout,
  onResumeWorkout,
  onRestartWorkout,
  isRestarting,
  onSendFeedback,
  onViewWeekly,
}: TodayFocusViewProps) {
  const actionState = getActionState(todayCompletion);
  const completionPct = todayCompletion?.completionPct || 0;

  const showFeedbackSent = actionState === 'completed' && (feedbackSubmitted || !!todayCompletion?.effortRating);

  const showOverview = (actionState === 'scheduled' || actionState === 'in-progress') && todayWorkout?.workoutDay;

  return (
    <div className="space-y-6">
      {/* Today / week switcher — navigation chrome, kept quiet */}
      <div className="animate-fade-in-up" style={{ animationDelay: '30ms' }}>
        <WorkoutViewToggle value="today" onChange={(m) => m === 'weekly' && onViewWeekly()} />
      </div>

      {/* Hero session card + exercise list (scheduled / in-progress) */}
      {showOverview && todayWorkout?.workoutDay && (
        <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <WorkoutOverview
            workoutDay={todayWorkout.workoutDay}
            coachName={coachName}
            actionState={actionState === 'in-progress' ? 'in-progress' : 'scheduled'}
            completionPct={completionPct}
            onAction={actionState === 'in-progress' ? onResumeWorkout : onStartWorkout}
            isActionPending={actionState !== 'in-progress' && isStartingWorkout}
          />
        </div>
      )}

      {/* The week has no workouts (or none matches yet) — say so instead of
          leaving the page at a bare greeting */}
      {!todayWorkout?.workoutDay && !todayCompletion && (
        <div
          className="rounded-2xl bg-card border border-border/70 px-5 py-10 text-center animate-fade-in-up"
          style={{ animationDelay: '60ms' }}
        >
          <h2 className="text-lg font-bold tracking-tight antialiased">{EMPTY_WEEK_COPY.title}</h2>
          <p className="text-sm text-muted-foreground mt-1.5 antialiased text-pretty">
            {EMPTY_WEEK_COPY.body(coachName)}
          </p>
        </div>
      )}

      {/* Completed hero — session summary + effort feedback in one card */}
      {actionState === 'completed' && todayCompletion && (
        <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <SessionCompleteCard
            workoutName={todayWorkout?.workoutDay?.name}
            completion={todayCompletion}
            coachName={coachName}
            feedbackSubmitted={showFeedbackSent}
            isSubmittingFeedback={isSendingFeedback}
            onSubmitFeedback={onSendFeedback}
          />
        </div>
      )}

      {/* Coach Context Strip (only for completed, since overview handles it for scheduled) */}
      {actionState === 'completed' && coachNote && coachName && (
        <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <CoachContextStrip
            coachName={coachName}
            coachAvatar={coachAvatar}
            note={coachNote}
          />
        </div>
      )}

      {/* Restart — rare, deliberate action. A hairline footer row with a
          reason on the left gives the quiet ghost button a place to belong,
          instead of floating alone under the cards */}
      {actionState === 'completed' && onRestartWorkout && (
        <div
          className="animate-fade-in-up flex items-center justify-between gap-4 border-t border-border/60 pt-4 px-1"
          style={{ animationDelay: '150ms' }}
        >
          <p className="text-xs text-muted-foreground">Logged by mistake?</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRestartWorkout}
            disabled={isRestarting}
            className="-mr-2 text-muted-foreground hover:text-foreground tap-target"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" aria-hidden="true" />
            {isRestarting ? 'Restarting…' : 'Restart workout'}
          </Button>
        </div>
      )}

    </div>
  );
}
