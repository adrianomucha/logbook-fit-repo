import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Modal } from '@/components/ui/Modal';
import { ChevronDown, ChevronUp, History, CalendarCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckIn, CheckInSchedule } from '@/types';
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
  /** Optional: show check-in schedule toggle in footer */
  schedule?: CheckInSchedule;
  hasPlan?: boolean;
  onToggleSchedule?: (enabled: boolean) => void;
}

export function CheckInHistoryPanel({
  checkIns,
  clientId,
  clientName,
  initialCount = 5,
  schedule,
  hasPlan = false,
  onToggleSchedule,
}: CheckInHistoryPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckIn | null>(null);

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

  const firstName = clientName.split(' ')[0];
  const isScheduleActive = schedule?.status === 'ACTIVE';

  const scheduleToggle = hasPlan && onToggleSchedule ? (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium">Weekly check-ins</span>
          <p className="text-xs text-muted-foreground">
            {isScheduleActive
              ? 'Auto-sends every 7 days'
              : schedule?.status === 'PAUSED'
              ? 'Paused'
              : 'Not active'}
          </p>
        </div>
      </div>
      <Switch checked={isScheduleActive} onCheckedChange={onToggleSchedule} />
    </div>
  ) : null;

  // Empty state
  if (completedCheckIns.length === 0) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <History className="w-4 h-4" />
          Check-In History
        </div>
        <div className="text-center py-4 space-y-1">
          <p className="text-sm text-muted-foreground">No check-ins yet</p>
          <p className="text-xs text-muted-foreground/70">
            Check-ins will appear here once {firstName} responds
          </p>
        </div>
        {scheduleToggle}
      </div>
    );
  }

  const displayedCheckIns = showAll
    ? completedCheckIns
    : completedCheckIns.slice(0, initialCount);
  const hasMore = completedCheckIns.length > initialCount;

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="pb-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <History className="w-4 h-4" />
              Check-In History
            </div>
            <span className="text-xs text-muted-foreground">
              {completedCheckIns.length} total
            </span>
          </div>
        </div>
        <div className="space-y-1.5 flex-1 overflow-y-auto">
          {displayedCheckIns.map((checkIn) => {
            const checkInDate = new Date(checkIn.completedAt || checkIn.date);
            const workoutFeeling = checkIn.workoutFeeling
              ? WORKOUT_FEELING_DISPLAY[checkIn.workoutFeeling]
              : null;
            const bodyFeeling = checkIn.bodyFeeling
              ? BODY_FEELING_DISPLAY[checkIn.bodyFeeling]
              : null;

            return (
              <button
                key={checkIn.id}
                onClick={() => setSelectedCheckIn(checkIn)}
                aria-label={`View check-in from ${format(checkInDate, 'MMMM d, yyyy')}`}
                className="w-full text-left p-2.5 flex items-center justify-between gap-2 border rounded-lg hover:bg-muted/30 hover:translate-x-0.5 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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

                  <div className="flex gap-1" aria-hidden="true">
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

                  {checkIn.clientNotes && (
                    <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                      "{checkIn.clientNotes.slice(0, 40)}
                      {checkIn.clientNotes.length > 40 ? '...' : ''}"
                    </p>
                  )}
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
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
        </div>
        {scheduleToggle && (
          <div className="pt-2">
            {scheduleToggle}
          </div>
        )}
      </div>

      {/* Check-in detail modal */}
      {selectedCheckIn && (
        <CheckInDetailModal
          checkIn={selectedCheckIn}
          clientName={firstName}
          onClose={() => setSelectedCheckIn(null)}
        />
      )}
    </>
  );
}

function CheckInDetailModal({
  checkIn,
  clientName,
  onClose,
}: {
  checkIn: CheckIn;
  clientName: string;
  onClose: () => void;
}) {
  const checkInDate = new Date(checkIn.completedAt || checkIn.date);
  const workoutFeeling = checkIn.workoutFeeling
    ? WORKOUT_FEELING_DISPLAY[checkIn.workoutFeeling]
    : null;
  const bodyFeeling = checkIn.bodyFeeling
    ? BODY_FEELING_DISPLAY[checkIn.bodyFeeling]
    : null;

  const title = `Check-in · ${format(checkInDate, 'MMM d, yyyy')}`;

  return (
    <Modal isOpen onClose={onClose} title={title} maxWidth="lg">
      <div className="space-y-4">
        {/* Feeling cards */}
        {(workoutFeeling || bodyFeeling) && (
          <div className="grid grid-cols-2 gap-3">
            {workoutFeeling && (
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Workouts felt</p>
                <p className="text-sm font-medium">
                  {workoutFeeling.emoji} {workoutFeeling.label}
                </p>
              </div>
            )}
            {bodyFeeling && (
              <div className="bg-muted/40 rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-1">Body felt</p>
                <p className="text-sm font-medium">
                  {bodyFeeling.emoji} {bodyFeeling.label}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Client notes */}
        {checkIn.clientNotes && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              {clientName}'s notes
            </p>
            <p className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3">
              "{checkIn.clientNotes}"
            </p>
          </div>
        )}

        {/* Coach response */}
        {checkIn.coachResponse && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Your response</p>
            <div className="text-sm leading-relaxed bg-muted/40 rounded-lg p-3">
              {checkIn.coachResponse}
            </div>
          </div>
        )}

        {/* Plan adjustment badge */}
        {checkIn.planAdjustment && (
          <Badge variant="secondary" className="text-xs">
            Plan adjustment made
          </Badge>
        )}

        {/* Timestamp */}
        <p className="text-xs text-muted-foreground pt-1">
          {formatDistanceToNow(checkInDate, { addSuffix: true })}
        </p>
      </div>
    </Modal>
  );
}
