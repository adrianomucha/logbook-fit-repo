import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { ChevronDown, ChevronUp, CalendarCheck, ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckIn } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { WORKOUT_FEELING_DISPLAY, BODY_FEELING_DISPLAY } from '@/lib/checkin-display';

interface CheckInHistoryPanelProps {
  checkIns: CheckIn[];
  clientId: string;
  clientName: string;
  /** Number of check-ins to show initially (default: 5) */
  initialCount?: number;
  /** Optional: show the weekly auto check-in toggle in the footer */
  scheduleEnabled?: boolean;
  hasPlan?: boolean;
  onToggleSchedule?: (enabled: boolean) => void;
  /** Optional: let the coach fix typos in a sent response */
  onEditResponse?: (checkInId: string, coachFeedback: string) => Promise<void> | void;
}

export function CheckInHistoryPanel({
  checkIns,
  clientId,
  clientName,
  initialCount = 5,
  scheduleEnabled = false,
  hasPlan = false,
  onToggleSchedule,
  onEditResponse,
}: CheckInHistoryPanelProps) {
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const startEdit = (checkIn: CheckIn) => {
    setEditingId(checkIn.id);
    setDraft(checkIn.coachResponse ?? '');
  };

  const saveEdit = async (checkInId: string) => {
    if (!onEditResponse || !draft.trim() || isSavingEdit) return;
    setIsSavingEdit(true);
    try {
      await onEditResponse(checkInId, draft.trim());
      setEditingId(null);
    } finally {
      setIsSavingEdit(false);
    }
  };

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

  const firstName = clientName?.split(' ')[0] || clientName || 'Client';

  const scheduleToggle = hasPlan && onToggleSchedule ? (
    <div className="flex items-center justify-between px-3 py-2 bg-muted/30 rounded-lg">
      <div className="flex items-center gap-2">
        <CalendarCheck className="w-4 h-4 text-muted-foreground" />
        <div>
          <span className="text-sm font-medium">Weekly check-ins</span>
          <p className="text-xs text-muted-foreground">
            {scheduleEnabled ? 'Auto-sends every 7 days' : 'Not active'}
          </p>
        </div>
      </div>
      <Switch checked={scheduleEnabled} onCheckedChange={onToggleSchedule} />
    </div>
  ) : null;

  // Empty state
  if (completedCheckIns.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-center py-8 space-y-1.5">
          <div className="text-3xl select-none mb-2">💬</div>
          <p className="text-sm font-medium antialiased">No check-ins yet</p>
          <p className="text-xs text-muted-foreground antialiased">
            Completed check-ins with {firstName} will show up here.
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
    <div className="h-full flex flex-col">
      <div className="space-y-1.5 flex-1 overflow-y-auto">
        {displayedCheckIns.map((checkIn) => {
          const checkInDate = new Date(checkIn.completedAt || checkIn.date);
          const workoutFeeling = checkIn.workoutFeeling
            ? WORKOUT_FEELING_DISPLAY[checkIn.workoutFeeling]
            : null;
          const bodyFeeling = checkIn.bodyFeeling
            ? BODY_FEELING_DISPLAY[checkIn.bodyFeeling]
            : null;
          const isExpanded = expandedId === checkIn.id;

          return (
            <div
              key={checkIn.id}
              className={cn(
                'rounded-lg transition-colors duration-150',
                isExpanded && 'bg-muted/30'
              )}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : checkIn.id)}
                aria-expanded={isExpanded}
                aria-label={`Check-in from ${format(checkInDate, 'MMMM d, yyyy')}`}
                className={cn(
                  'w-full text-left p-2.5 flex items-center justify-between gap-2 rounded-lg transition-[background-color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  !isExpanded && 'hover:bg-muted/40 active:scale-[0.98]'
                )}
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

                  {!isExpanded && checkIn.clientNotes && (
                    <p className="text-xs text-muted-foreground truncate flex-1 min-w-0">
                      &ldquo;{checkIn.clientNotes.slice(0, 40)}
                      {checkIn.clientNotes.length > 40 ? '...' : ''}&rdquo;
                    </p>
                  )}
                </div>

                <ChevronRight
                  className={cn(
                    'w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200',
                    isExpanded && 'rotate-90'
                  )}
                />
              </button>

              {/* Inline detail — expands in place instead of opening a modal */}
              {isExpanded && (
                <div className="px-2.5 pb-3 space-y-3 animate-in fade-in-0 slide-in-from-top-1 duration-150">
                  {(workoutFeeling || bodyFeeling) && (
                    <div className="grid grid-cols-2 gap-2">
                      {workoutFeeling && (
                        <div className="bg-background/60 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground mb-0.5">Workouts felt</p>
                          <p className="text-sm font-medium">
                            {workoutFeeling.emoji} {workoutFeeling.label}
                          </p>
                        </div>
                      )}
                      {bodyFeeling && (
                        <div className="bg-background/60 rounded-lg p-2.5">
                          <p className="text-xs text-muted-foreground mb-0.5">Body felt</p>
                          <p className="text-sm font-medium">
                            {bodyFeeling.emoji} {bodyFeeling.label}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {checkIn.clientNotes && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        {firstName}&apos;s notes
                      </p>
                      <p className="text-sm leading-relaxed bg-background/60 rounded-lg p-2.5">
                        &ldquo;{checkIn.clientNotes}&rdquo;
                      </p>
                    </div>
                  )}

                  {checkIn.coachResponse && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs text-muted-foreground">Your response</p>
                        {onEditResponse && editingId !== checkIn.id && (
                          <button
                            onClick={() => startEdit(checkIn)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors tap-target"
                          >
                            <Pencil className="w-3 h-3" />
                            Edit
                          </button>
                        )}
                      </div>
                      {editingId === checkIn.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.slice(0, 1000))}
                            maxLength={1000}
                            rows={3}
                            className="bg-background/60"
                            autoFocus
                          />
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={isSavingEdit}
                              onClick={() => setEditingId(null)}
                            >
                              Cancel
                            </Button>
                            <Button
                              size="sm"
                              disabled={!draft.trim() || isSavingEdit}
                              onClick={() => saveEdit(checkIn.id)}
                            >
                              {isSavingEdit ? 'Saving…' : 'Save'}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-sm leading-relaxed bg-background/60 rounded-lg p-2.5">
                          {checkIn.coachResponse}
                        </div>
                      )}
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
      </div>
      {scheduleToggle && (
        <div className="pt-2">
          {scheduleToggle}
        </div>
      )}
    </div>
  );
}
