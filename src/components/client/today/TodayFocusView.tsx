import { Client, WorkoutCompletion } from '@/types';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { StatusHeader } from './StatusHeader';
import { SessionCompleteCard } from './SessionCompleteCard';
import { CoachContextStrip } from './CoachContextStrip';
import { WorkoutOverview } from './WorkoutOverview';
import { WorkoutViewToggle } from '@/components/client/WorkoutViewToggle';

type ActionState = 'scheduled' | 'in-progress' | 'completed';

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
  /** Show the "New plan" pill in the header (week 1, nothing started yet) */
  showNewPlan?: boolean;
}

function getActionState(
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
  showNewPlan,
}: TodayFocusViewProps) {
  const actionState = getActionState(todayCompletion);
  const completionPct = todayCompletion?.completionPct || 0;

  const showFeedbackSent = actionState === 'completed' && (feedbackSubmitted || !!todayCompletion?.effortRating);

  const showOverview = (actionState === 'scheduled' || actionState === 'in-progress') && todayWorkout?.workoutDay;

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className="animate-fade-in-up">
        <StatusHeader showNewPlan={showNewPlan} clientName={client.name} />
      </div>

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
          />
        </div>
      )}

      {/* Completed — one session report instead of a loose stack of cards */}
      {actionState === 'completed' && todayCompletion && (
        <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <SessionCompleteCard
            workoutDay={todayWorkout?.workoutDay}
            completion={todayCompletion}
            coachName={coachName}
            feedbackSubmitted={showFeedbackSent}
            isSendingFeedback={isSendingFeedback}
            onSendFeedback={onSendFeedback}
            onRestartWorkout={onRestartWorkout}
            isRestarting={isRestarting}
            onMessageCoach={onMessageCoach}
          />
        </div>
      )}

      {/* Coach Context Strip (only for completed, since overview handles it for scheduled) */}
      {actionState === 'completed' && coachNote && coachName && (
        <div className="animate-fade-in-up" style={{ animationDelay: '150ms' }}>
          <CoachContextStrip
            coachName={coachName}
            coachAvatar={coachAvatar}
            note={coachNote}
          />
        </div>
      )}

    </div>
  );
}
