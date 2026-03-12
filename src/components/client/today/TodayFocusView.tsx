import { Client, WorkoutCompletion } from '@/types';
import { WeekDayInfo } from '@/lib/workout-week-helpers';
import { StatusHeader, StatusType } from './StatusHeader';
import { TodayActionCard, ActionState } from './TodayActionCard';
import { CoachContextStrip } from './CoachContextStrip';
import { QuickEffortFeedback } from './QuickEffortFeedback';
import { WorkoutOverview } from './WorkoutOverview';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, Play, RotateCcw } from 'lucide-react';

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
    <div className="space-y-4">
      {/* Status Header */}
      <div className="animate-fade-in-up">
        <StatusHeader status={statusType} clientName={client.name} />
      </div>

      {/* Workout Overview (scheduled / in-progress) */}
      {showOverview && todayWorkout?.workoutDay && (
        <>
          <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
            <WorkoutOverview
              workoutDay={todayWorkout.workoutDay}
              coachName={coachName}
            />
          </div>

          {/* In-progress: show progress bar (only when there's actual progress) */}
          {actionState === 'in-progress' && completionPct > 0 && (
            <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '120ms' }}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{completionPct}% complete</span>
              </div>
              <Progress value={completionPct} className="h-2" />
            </div>
          )}

          {/* Start / Resume button */}
          <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
            <Button
              onClick={actionState === 'in-progress' ? onResumeWorkout : onStartWorkout}
              className="w-full"
              size="lg"
            >
              {actionState === 'in-progress' ? (
                <>
                  <RotateCcw className="w-5 h-5 mr-2" />
                  {completionPct > 0 ? 'Resume Workout' : 'Continue Workout'}
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Start Workout
                </>
              )}
            </Button>
          </div>
        </>
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
        <Button
          variant="outline"
          className="w-full gap-2"
          onClick={onRestartWorkout}
          disabled={isRestarting}
        >
          <RotateCcw className="w-4 h-4" />
          {isRestarting ? 'Restarting...' : 'Restart Workout'}
        </Button>
      )}

      {/* Coach Context Strip (only for completed/rest, since overview handles it for scheduled) */}
      {(actionState === 'completed' || actionState === 'rest') && coachNote && coachName && (
        <div className="animate-fade-in-up" style={{ animationDelay: '120ms' }}>
          <CoachContextStrip
            coachName={coachName}
            coachAvatar={coachAvatar}
            note={coachNote}
          />
        </div>
      )}

      {/* Quick Effort Feedback */}
      {showFeedbackPrompt && (
        <div className="animate-fade-in-up" style={{ animationDelay: '180ms' }}>
          <QuickEffortFeedback onSubmit={onSendFeedback} isSubmitting={isSendingFeedback} />
        </div>
      )}


      {/* View Week — more prominent placement */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50">
        <span className="text-xs text-muted-foreground">
          {todayWorkout?.workoutDay ? 'See the rest of your week' : 'View your schedule'}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onViewWeekly}
          className="text-muted-foreground hover:text-foreground -mr-2"
        >
          <Calendar className="w-4 h-4 mr-1.5" />
          Full week
        </Button>
      </div>
    </div>
  );
}
