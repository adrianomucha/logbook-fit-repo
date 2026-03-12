import { Client, WorkoutPlan, WorkoutCompletion } from '@/types';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { StatusHeader, StatusType } from './StatusHeader';
import { TodayActionCard, ActionState } from './TodayActionCard';
import { CoachContextStrip } from './CoachContextStrip';
import { QuickEffortFeedback } from './QuickEffortFeedback';
import { WorkoutOverview } from './WorkoutOverview';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, CheckCircle2, Play, RotateCcw } from 'lucide-react';

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
  isSendingFeedback?: boolean;
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
  isSendingFeedback,
  onStartWorkout,
  onResumeWorkout,
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
    <div className="space-y-4">
      {/* Status Header */}
      <StatusHeader status={statusType} />

      {/* Workout Overview (scheduled / in-progress) */}
      {showOverview && todayWorkout?.workoutDay && (
        <>
          <WorkoutOverview
            workoutDay={todayWorkout.workoutDay}
            coachName={coachName}
          />

          {/* In-progress: show progress bar */}
          {actionState === 'in-progress' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{completionPct}% complete</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
          )}

          {/* Start / Resume button */}
          <Button
            onClick={actionState === 'in-progress' ? onResumeWorkout : onStartWorkout}
            className="w-full"
            size="lg"
          >
            {actionState === 'in-progress' ? (
              <>
                <RotateCcw className="w-5 h-5 mr-2" />
                Resume Workout
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Start Workout
              </>
            )}
          </Button>
        </>
      )}

      {/* Fallback to action card for completed / rest states */}
      {(actionState === 'completed' || actionState === 'rest') && (
        <TodayActionCard
          state={actionState}
          workoutName={todayWorkout?.workoutDay?.name}
          exerciseCount={todayWorkout?.workoutDay?.exercises?.length}
          completionPct={completionPct}
          onAction={onMessageCoach}
        />
      )}

      {/* Coach Context Strip (only for completed/rest, since overview handles it for scheduled) */}
      {(actionState === 'completed' || actionState === 'rest') && coachNote && coachName && (
        <CoachContextStrip
          coachName={coachName}
          coachAvatar={coachAvatar}
          note={coachNote}
        />
      )}

      {/* Quick Effort Feedback */}
      {showFeedbackPrompt && (
        <QuickEffortFeedback onSubmit={onSendFeedback} isSubmitting={isSendingFeedback} />
      )}

      {/* Feedback sent confirmation */}
      {showFeedbackSent && (
        <Card className="border-success/20 bg-success/5">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              <p className="text-sm font-medium text-success">Feedback sent to your coach</p>
            </div>
          </CardContent>
        </Card>
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
