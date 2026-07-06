import { Client, WorkoutCompletion } from '@/types';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { StatusHeader, StatusType } from './StatusHeader';
import { TodayActionCard, ActionState } from './TodayActionCard';
import { CoachContextStrip } from './CoachContextStrip';
import { QuickEffortFeedback } from './QuickEffortFeedback';
import { WorkoutOverview } from './WorkoutOverview';
import { Button } from '@/components/ui/button';
import { Calendar, ChevronRight, RotateCcw } from 'lucide-react';

interface TodayFocusViewProps {
  client: Client;
  todayWorkout: WeekDayInfo | null;
  todayCompletion: WorkoutCompletion | null;
  /** Coach's instruction note from today's workout exercises */
  coachNote?: string;
  coachName?: string;
  coachAvatar?: string;
  feedbackSubmitted?: boolean;
  isSendingFeedback?: boolean;
  onStartWorkout: () => void;
  onResumeWorkout: () => void;
  onRestartWorkout?: () => void;
  isRestarting?: boolean;
  onSendFeedback: (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => void;
  onMessageCoach: () => void;
  onViewWeekly: () => void;
}

function getStatusType(
  todayWorkout: WeekDayInfo | null,
  todayCompletion: WorkoutCompletion | null
): StatusType {
  if (todayCompletion?.status === 'COMPLETED') return 'completed';
  if (todayCompletion?.status === 'IN_PROGRESS') return 'in-progress';
  return 'workout-scheduled';
}

function getActionState(
  todayWorkout: WeekDayInfo | null,
  todayCompletion: WorkoutCompletion | null
): ActionState {
  if (todayCompletion?.status === 'COMPLETED') return 'completed';
  if (todayCompletion?.status === 'IN_PROGRESS') return 'in-progress';
  return 'scheduled';
}

export function TodayFocusView({
  client,
  todayWorkout,
  todayCompletion,
  coachNote,
  coachName,
  coachAvatar,
  feedbackSubmitted,
  isSendingFeedback,
  onStartWorkout,
  onResumeWorkout,
  onRestartWorkout,
  isRestarting,
  onSendFeedback,
  onMessageCoach,
  onViewWeekly,
}: TodayFocusViewProps) {
  const statusType = getStatusType(todayWorkout, todayCompletion);
  const actionState = getActionState(todayWorkout, todayCompletion);
  const completionPct = todayCompletion?.completionPct || 0;

  const showFeedbackPrompt = actionState === 'completed' && !feedbackSubmitted && !todayCompletion?.effortRating;
  const showFeedbackSent = actionState === 'completed' && (feedbackSubmitted || !!todayCompletion?.effortRating);

  const showOverview = (actionState === 'scheduled' || actionState === 'in-progress') && todayWorkout?.workoutDay;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="animate-fade-in-up">
        <StatusHeader status={statusType} clientName={client.name} />
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
          />
        </div>
      )}

      {/* Fallback to action card for completed / rest states */}
      {(actionState === 'completed' || actionState === 'rest') && (
        <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <TodayActionCard
            state={actionState}
            workoutName={todayWorkout?.workoutDay?.name}
            exerciseCount={todayWorkout?.workoutDay?.exercises?.length}
            completionPct={completionPct}
            onAction={onMessageCoach}
            hideCta={showFeedbackSent}
          />
        </div>
      )}

      {/* Restart workout button (completed state only) */}
      {actionState === 'completed' && onRestartWorkout && (
        <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={onRestartWorkout}
            disabled={isRestarting}
          >
            <RotateCcw className="w-4 h-4" />
            {isRestarting ? 'Restarting...' : 'Restart Workout'}
          </Button>
        </div>
      )}

      {/* Coach Context Strip (only for completed/rest, since overview handles it for scheduled) */}
      {(actionState === 'completed' || actionState === 'rest') && coachNote && coachName && (
        <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <CoachContextStrip
            coachName={coachName}
            coachAvatar={coachAvatar}
            note={coachNote}
          />
        </div>
      )}

      {/* Quick Effort Feedback */}
      {showFeedbackPrompt && (
        <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <QuickEffortFeedback onSubmit={onSendFeedback} isSubmitting={isSendingFeedback} />
        </div>
      )}

      {/* View Week — one full-width tappable row */}
      <div className="animate-fade-in-up" style={{ animationDelay: '250ms' }}>
        <button
          onClick={onViewWeekly}
          className="w-full h-12 rounded-xl border border-border/70 bg-card flex items-center gap-3 px-4 text-sm font-medium text-foreground hover:bg-muted/50 active:scale-[0.99] transition-[background-color,transform] duration-150 touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="flex-1 text-left">View full week</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground/60" />
        </button>
      </div>
    </div>
  );
}
