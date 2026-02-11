import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, History, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckIn } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';

const WORKOUT_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  TOO_EASY: { label: 'Too Easy', emoji: '😴' },
  ABOUT_RIGHT: { label: 'About Right', emoji: '💪' },
  TOO_HARD: { label: 'Too Hard', emoji: '😰' },
};

const BODY_FEELING_DISPLAY: Record<string, { label: string; emoji: string }> = {
  FRESH: { label: 'Fresh', emoji: '✨' },
  NORMAL: { label: 'Normal', emoji: '👍' },
  TIRED: { label: 'Tired', emoji: '😓' },
  RUN_DOWN: { label: 'Run Down', emoji: '🥴' },
};

interface CheckInHistoryPanelProps {
  checkIns: CheckIn[];
  clientId: string;
  clientName: string;
  /** Number of check-ins to show initially (default: 5) */
  initialCount?: number;
  /** Whether the panel starts collapsed (default: true) */
  defaultCollapsed?: boolean;
}

export function CheckInHistoryPanel({
  checkIns,
  clientId,
  clientName,
  initialCount = 5,
  defaultCollapsed = true,
}: CheckInHistoryPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter completed check-ins for this client, sorted by date descending
  const completedCheckIns = useMemo(() => {
    return checkIns
      .filter((c) => c.clientId === clientId && c.status === 'completed')
      .sort(
        (a, b) =>
          new Date(b.completedAt || b.date).getTime() -
          new Date(a.completedAt || a.date).getTime()
      );
  }, [checkIns, clientId]);

  // Empty state - show muted collapsed row
  if (completedCheckIns.length === 0) {
    return (
      <div className="flex items-center gap-2 p-3 border rounded-lg text-muted-foreground/70">
        <History className="w-4 h-4" />
        <span className="text-sm">Check-In History</span>
        <span className="text-xs">· No check-ins yet</span>
      </div>
    );
  }

  // Collapsed state - single muted row
  if (isCollapsed) {
    return (
      <button
        onClick={() => setIsCollapsed(false)}
        className={cn(
          'w-full flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors',
          'text-muted-foreground/70 hover:text-muted-foreground hover:bg-muted/30'
        )}
      >
        <History className="w-4 h-4" />
        <span className="text-sm">Check-In History</span>
        <span className="text-xs">· {completedCheckIns.length} total</span>
        <ChevronDown className="w-4 h-4 ml-auto" />
      </button>
    );
  }

  const displayedCheckIns = showAll
    ? completedCheckIns
    : completedCheckIns.slice(0, initialCount);
  const hasMore = completedCheckIns.length > initialCount;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-2 shrink-0">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setIsCollapsed(true)}
            className="flex items-center gap-2 text-base font-semibold hover:text-muted-foreground transition-colors"
          >
            <History className="w-4 h-4" />
            Check-In History
            <ChevronUp className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">
            {completedCheckIns.length} total
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 flex-1 overflow-y-auto">
        {displayedCheckIns.map((checkIn) => {
          const isExpanded = expandedId === checkIn.id;
          const checkInDate = new Date(checkIn.completedAt || checkIn.date);
          const workoutFeeling = checkIn.workoutFeeling
            ? WORKOUT_FEELING_DISPLAY[checkIn.workoutFeeling]
            : null;
          const bodyFeeling = checkIn.bodyFeeling
            ? BODY_FEELING_DISPLAY[checkIn.bodyFeeling]
            : null;

          return (
            <div
              key={checkIn.id}
              className={cn(
                'border rounded-lg transition-colors',
                isExpanded ? 'bg-muted/50' : 'hover:bg-muted/30'
              )}
            >
              {/* Collapsed View */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : checkIn.id)}
                className="w-full text-left p-3 flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium">
                      {format(checkInDate, 'MMM d, yyyy')}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(checkInDate, { addSuffix: true })}
                    </span>
                  </div>

                  {/* Quick feeling badges */}
                  <div className="flex gap-1">
                    {workoutFeeling && (
                      <span className="text-sm" title={workoutFeeling.label}>
                        {workoutFeeling.emoji}
                      </span>
                    )}
                    {bodyFeeling && (
                      <span className="text-sm" title={bodyFeeling.label}>
                        {bodyFeeling.emoji}
                      </span>
                    )}
                  </div>

                  {/* Truncated client note preview */}
                  {checkIn.clientNotes && (
                    <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                      "{checkIn.clientNotes.slice(0, 40)}
                      {checkIn.clientNotes.length > 40 ? '...' : ''}"
                    </p>
                  )}
                </div>

                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
              </button>

              {/* Expanded View */}
              {isExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t">
                  <div className="pt-3 grid grid-cols-2 gap-2">
                    {workoutFeeling && (
                      <div className="bg-background rounded p-2 border">
                        <p className="text-xs text-muted-foreground">Workouts felt</p>
                        <p className="text-sm font-medium">
                          {workoutFeeling.emoji} {workoutFeeling.label}
                        </p>
                      </div>
                    )}
                    {bodyFeeling && (
                      <div className="bg-background rounded p-2 border">
                        <p className="text-xs text-muted-foreground">Body felt</p>
                        <p className="text-sm font-medium">
                          {bodyFeeling.emoji} {bodyFeeling.label}
                        </p>
                      </div>
                    )}
                  </div>

                  {checkIn.clientNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {clientName.split(' ')[0]}'s notes
                      </p>
                      <p className="text-sm bg-background rounded p-2 border">
                        "{checkIn.clientNotes}"
                      </p>
                    </div>
                  )}

                  {checkIn.coachResponse && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Your response</p>
                      <div className="text-sm bg-background rounded p-2 border border-l-2 border-l-primary">
                        {checkIn.coachResponse}
                      </div>
                    </div>
                  )}

                  {checkIn.planAdjustment && (
                    <Badge variant="secondary" className="text-xs">
                      Plan adjustment made
                    </Badge>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Show more/less toggle */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" />
                Show less
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" />
                Show all ({completedCheckIns.length - initialCount} more)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
