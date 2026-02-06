import { useState } from 'react';
import { CheckIn, CompletedWorkout } from '@/types';
import { getRecentCheckIns, getOlderCheckInsCount, truncateText, getWorkoutCompletionForCheckIn } from '@/lib/checkin-context-helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Pin, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';

const FEELING_LABELS: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

interface RecentContextPanelProps {
  clientId: string;
  clientName: string;
  checkIns: CheckIn[];
  completedWorkouts: CompletedWorkout[];
  currentCheckInId?: string;
  workoutsPerWeek?: number;
}

export function RecentContextPanel({
  clientId,
  clientName,
  checkIns,
  completedWorkouts,
  currentCheckInId,
  workoutsPerWeek,
}: RecentContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showOlder, setShowOlder] = useState(false);

  const recentLimit = showOlder ? 6 : 3;
  const recentCheckIns = getRecentCheckIns(clientId, checkIns, currentCheckInId, recentLimit);
  const olderCount = getOlderCheckInsCount(clientId, checkIns, currentCheckInId, 3);
  const hasOlder = olderCount > 0 && !showOlder;
  const canShowLess = showOlder && recentCheckIns.length > 3;

  // Empty state - first check-in
  if (recentCheckIns.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Pin className="w-4 h-4" />
            Recent Context
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This is {clientName}'s first check-in!
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Set the tone for future check-ins.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-muted/30">
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
            <Pin className="w-4 h-4" />
            Recent Context ({recentCheckIns.length})
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-3">
          {recentCheckIns.map((checkIn, index) => {
            const workoutCompletion = getWorkoutCompletionForCheckIn(
              checkIn,
              completedWorkouts,
              workoutsPerWeek
            );
            const effortLabel = checkIn.workoutFeeling
              ? FEELING_LABELS[checkIn.workoutFeeling]
              : null;

            return (
              <div
                key={checkIn.id}
                className={`text-sm space-y-1.5 ${
                  index < recentCheckIns.length - 1 ? 'pb-3 border-b' : ''
                }`}
              >
                {/* Date */}
                <p className="font-medium text-foreground">
                  {format(new Date(checkIn.completedAt || checkIn.date), 'MMM d')}
                </p>

                {/* Effort */}
                {effortLabel && (
                  <p className="text-muted-foreground">
                    <span className="mr-1">{effortLabel.emoji}</span>
                    {effortLabel.label}
                  </p>
                )}

                {/* Workouts */}
                <p className="text-muted-foreground">
                  Workouts: {workoutCompletion.completed}/{workoutCompletion.total}
                  {workoutCompletion.completed >= workoutCompletion.total ? (
                    <span className="text-green-600 ml-1">✓</span>
                  ) : (
                    <span className="text-amber-600 ml-1">⚠</span>
                  )}
                </p>

                {/* Coach response preview */}
                {checkIn.coachResponse && (
                  <p className="text-muted-foreground italic line-clamp-2">
                    You said: "{truncateText(checkIn.coachResponse, 60)}"
                  </p>
                )}

                {/* Plan adjusted */}
                {checkIn.planAdjustment && (
                  <p className="text-green-600 flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Plan adjusted
                  </p>
                )}
              </div>
            );
          })}

          {/* Show Older / Show Less buttons */}
          {hasOlder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOlder(true)}
              className="w-full text-muted-foreground"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Show Older ({Math.min(olderCount, 3)} more)
            </Button>
          )}
          {canShowLess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOlder(false)}
              className="w-full text-muted-foreground"
            >
              <ChevronUp className="w-4 h-4 mr-1" />
              Show Less
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Mobile version - collapsed by default, shows inline content when expanded
 */
export function RecentContextPanelMobile({
  clientId,
  clientName,
  checkIns,
  completedWorkouts,
  currentCheckInId,
  workoutsPerWeek,
}: RecentContextPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showOlder, setShowOlder] = useState(false);

  const recentLimit = showOlder ? 6 : 3;
  const recentCheckIns = getRecentCheckIns(clientId, checkIns, currentCheckInId, recentLimit);
  const olderCount = getOlderCheckInsCount(clientId, checkIns, currentCheckInId, 3);
  const hasOlder = olderCount > 0 && !showOlder;
  const canShowLess = showOlder && recentCheckIns.length > 3;

  if (recentCheckIns.length === 0) {
    return null; // Don't show on mobile if first check-in
  }

  return (
    <Card className="bg-muted/30 lg:hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between"
      >
        <span className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
          <Pin className="w-4 h-4" />
          Previous Check-ins ({recentCheckIns.length})
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {isExpanded && (
        <CardContent className="pt-0 space-y-3">
          {recentCheckIns.map((checkIn, index) => {
            const workoutCompletion = getWorkoutCompletionForCheckIn(
              checkIn,
              completedWorkouts,
              workoutsPerWeek
            );
            const effortLabel = checkIn.workoutFeeling
              ? FEELING_LABELS[checkIn.workoutFeeling]
              : null;

            return (
              <div
                key={checkIn.id}
                className={`text-sm space-y-1.5 ${
                  index < recentCheckIns.length - 1 ? 'pb-3 border-b' : ''
                }`}
              >
                <p className="font-medium text-foreground">
                  {format(new Date(checkIn.completedAt || checkIn.date), 'MMM d')}
                </p>
                {effortLabel && (
                  <p className="text-muted-foreground">
                    <span className="mr-1">{effortLabel.emoji}</span>
                    {effortLabel.label}
                  </p>
                )}
                <p className="text-muted-foreground">
                  Workouts: {workoutCompletion.completed}/{workoutCompletion.total}
                  {workoutCompletion.completed >= workoutCompletion.total ? (
                    <span className="text-green-600 ml-1">✓</span>
                  ) : (
                    <span className="text-amber-600 ml-1">⚠</span>
                  )}
                </p>
                {checkIn.coachResponse && (
                  <p className="text-muted-foreground italic line-clamp-2">
                    You said: "{truncateText(checkIn.coachResponse, 60)}"
                  </p>
                )}
                {checkIn.planAdjustment && (
                  <p className="text-green-600 flex items-center gap-1 text-xs">
                    <CheckCircle2 className="w-3 h-3" />
                    Plan adjusted
                  </p>
                )}
              </div>
            );
          })}

          {hasOlder && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOlder(true)}
              className="w-full text-muted-foreground"
            >
              <ChevronDown className="w-4 h-4 mr-1" />
              Show Older ({Math.min(olderCount, 3)} more)
            </Button>
          )}
          {canShowLess && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowOlder(false)}
              className="w-full text-muted-foreground"
            >
              <ChevronUp className="w-4 h-4 mr-1" />
              Show Less
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
