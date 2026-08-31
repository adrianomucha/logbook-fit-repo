import { useState, useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ChevronDown, ChevronUp, CalendarCheck, ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CheckIn } from '@/types';
import { format, formatDistanceToNow } from 'date-fns';
import { WORKOUT_FEELING_DISPLAY, BODY_FEELING_DISPLAY } from '@/lib/checkin-display';

export interface CheckInScheduleSettings {
  enabled: boolean;
  /** Cadence in days (3, 7, 14 or 28) */
  intervalDays: number;
  /** 0 = Sunday … 6 = Saturday; null = whenever the interval elapses */
  dayOfWeek: number | null;
}

/** Cadence choices — must stay in sync with checkInScheduleSchema.
 *  Lowercase labels: they complete the sentence "Sends [every week] on [Mondays]". */
const INTERVAL_OPTIONS: { value: number; label: string }[] = [
  { value: 3, label: 'every 3 days' },
  { value: 7, label: 'every week' },
  { value: 14, label: 'every 2 weeks' },
  { value: 28, label: 'every 4 weeks' },
];

// Coach-facing order Monday-first; values follow JS getDay() (0 = Sunday)
const DAY_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: 'Mondays' },
  { value: 2, label: 'Tuesdays' },
  { value: 3, label: 'Wednesdays' },
  { value: 4, label: 'Thursdays' },
  { value: 5, label: 'Fridays' },
  { value: 6, label: 'Saturdays' },
  { value: 0, label: 'Sundays' },
];

interface CheckInHistoryPanelProps {
  checkIns: CheckIn[];
  clientId: string;
  clientName: string;
  /** Number of check-ins to show initially (default: 5) */
  initialCount?: number;
  /** Optional: show the auto check-in schedule settings in the footer */
  schedule?: CheckInScheduleSettings;
  hasPlan?: boolean;
  onUpdateSchedule?: (update: Partial<CheckInScheduleSettings>) => void;
  /** Optional: let the coach fix typos in a sent response */
  onEditResponse?: (checkInId: string, coachFeedback: string) => Promise<void> | void;
}

export function CheckInHistoryPanel({
  checkIns,
  clientId,
  clientName,
  initialCount = 5,
  schedule,
  hasPlan = false,
  onUpdateSchedule,
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

  // The whole setting reads as one sentence — "Sends every week on Mondays" —
  // with the variable words as compact inline selects, so nothing has to line
  // up against a grid it doesn't share.
  // Compact inline triggers: the default focus treatment (2px ring + 2px
  // offset) reads as a heavy outline that collides with the words beside it,
  // so focus is shown on the border instead.
  const selectTriggerClasses =
    'h-8 w-auto gap-1 rounded-md border-border/60 bg-background/60 px-2.5 text-sm font-medium text-foreground hover:border-border transition-colors focus:ring-0 focus:ring-offset-0 focus:border-foreground/40';
  // The widget sits at the bottom edge of an overflow-hidden card, so the
  // menus open upward — downward they'd be clipped mid-list.
  const selectContentClasses = 'top-auto bottom-full mt-0 mb-1';

  const scheduleToggle = hasPlan && schedule && onUpdateSchedule ? (
    <div className="px-3 py-2.5 bg-muted/30 rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarCheck className="w-4 h-4 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-medium">Automatic check-ins</span>
            {!schedule.enabled && (
              <p className="text-xs text-muted-foreground">
                Off — send check-ins by hand
              </p>
            )}
          </div>
        </div>
        <Switch
          checked={schedule.enabled}
          onCheckedChange={(enabled) => onUpdateSchedule({ enabled })}
        />
      </div>
      {schedule.enabled && (
        <div className="mt-2.5 pt-2.5 pl-6 border-t border-border/50 animate-in fade-in-0 slide-in-from-top-1 duration-150">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-muted-foreground">
            <span>Sends</span>
            <Select
              value={String(schedule.intervalDays)}
              onValueChange={(v) => onUpdateSchedule({ intervalDays: Number(v) })}
            >
              <SelectTrigger aria-label="Frequency" className={selectTriggerClasses}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className={selectContentClasses}>
                {INTERVAL_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Anchoring to a weekday only makes sense at a week or longer */}
            {schedule.intervalDays >= 7 && (
              <>
                <span>on</span>
                <Select
                  value={schedule.dayOfWeek === null ? 'any' : String(schedule.dayOfWeek)}
                  onValueChange={(v) =>
                    onUpdateSchedule({ dayOfWeek: v === 'any' ? null : Number(v) })
                  }
                >
                  <SelectTrigger aria-label="Day of week" className={selectTriggerClasses}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className={selectContentClasses}>
                    <SelectItem value="any">any day</SelectItem>
                    {DAY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={String(option.value)}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {schedule.dayOfWeek !== null && (
                  <span className="text-xs text-muted-foreground/70">
                    ({firstName}&apos;s local day)
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      )}
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
