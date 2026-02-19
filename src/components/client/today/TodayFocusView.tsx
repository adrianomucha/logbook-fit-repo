import { Client, WorkoutPlan, WorkoutCompletion } from '@/types';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { StatusHeader, StatusType } from './StatusHeader';
import { TodayActionCard, ActionState } from './TodayActionCard';
import { CoachContextStrip } from './CoachContextStrip';
import { QuickEffortFeedback } from './QuickEffortFeedback';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';

interface TodayFocusViewProps {
  client: Client;
  plan: WorkoutPlan;
  todayWorkout: WeekDayInfo | null;
  todayCompletion: WorkoutCompletion | null;
  /** Coach's instruction note from today's workout exercises */
  coachNote?: string;
  coachName?: string;
  coachAvatar?: string;
  feedbackSubmitted?: boolean;
  onStartWorkout: () => void;
  onResumeWorkout: () => void;
  onSendFeedback: (rating: 'EASY' | 'MEDIUM' | 'HARD', notes?: string) => void;
  onMessageCoach: () => void;
  onViewWeekly: () => void;
}

function getStatusType(
  todayWorkout: WeekDayInfo | null,
  todayCompletion: WorkoutCompletion | null
): StatusType {
  if (!todayWorkout || todayWorkout.status === 'REST') return 'rest-day';
  if (todayCompletion?.status === 'COMPLETED') return 'completed';
  if (todayCompletion?.status === 'IN_PROGRESS') return 'in-progress';
  return 'workout-scheduled';
}

function getActionState(
  todayWorkout: WeekDayInfo | null,
  todayCompletion: WorkoutCompletion | null
): ActionState {
  if (!todayWorkout || todayWorkout.status === 'REST') return 'rest';
  if (todayCompletion?.status === 'COMPLETED') return 'completed';
  if (todayCompletion?.status === 'IN_PROGRESS') return 'in-progress';
  return 'scheduled';
}

export function TodayFocusView({
  plan,
  todayWorkout,
  todayCompletion,
  coachNote,
  coachName,
  coachAvatar,
  feedbackSubmitted,
  onStartWorkout,
  onResumeWorkout,
  onSendFeedback,
  onMessageCoach,
  onViewWeekly,
}: TodayFocusViewProps) {
  const statusType = getStatusType(todayWorkout, todayCompletion);
  const actionState = getActionState(todayWorkout, todayCompletion);

  const handleAction = () => {
    switch (actionState) {
      case 'scheduled':
        onStartWorkout();
        break;
      case 'in-progress':
        onResumeWorkout();
        break;
      case 'completed':
        onMessageCoach();
        break;
      case 'rest':
        onMessageCoach();
        break;
    }
  };

  const workoutName = todayWorkout?.workoutDay?.name;
  const exerciseCount = todayWorkout?.workoutDay?.exercises?.length;
  const completionPct = todayCompletion?.completionPct || 0;

  // Show feedback prompt only if workout completed and not yet submitted feedback
  const showFeedbackPrompt = actionState === 'completed' && !feedbackSubmitted && !todayCompletion?.effortRating;

  return (
    <div className="space-y-4">
      {/* Status Header */}
      <StatusHeader date={new Date()} status={statusType} />

      {/* Primary Action Card */}
      <TodayActionCard
        state={actionState}
        workoutName={workoutName}
        exerciseCount={exerciseCount}
        completionPct={completionPct}
        onAction={handleAction}
      />

      {/* Coach Context Strip (only if coach note exists) */}
      {coachNote && coachName && (
        <CoachContextStrip
          coachName={coachName}
          coachAvatar={coachAvatar}
          note={coachNote}
        />
      )}

      {/* Quick Effort Feedback (only if workout completed and no rating yet) */}
      {showFeedbackPrompt && (
        <QuickEffortFeedback onSubmit={onSendFeedback} />
      )}

      {/* View Week Link */}
      <div className="pt-2 text-center">
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewWeekly}
          className="text-muted-foreground hover:text-foreground"
        >
          <Calendar className="w-4 h-4 mr-2" />
          View full week
        </Button>
      </div>
    </div>
  );
}
