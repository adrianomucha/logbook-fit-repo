import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FIRST_PLAN_COPY } from '@logbook/shared/client-profile';
import type { PlanSummary } from '@/types/api';

// Enough to pick from at a glance; the full list lives in the assign modal
const PREVIEW = 5;

interface FirstPlanPickerProps {
  firstName: string;
  plans: PlanSummary[];
  isLoading?: boolean;
  onAssign: (planId: string) => Promise<void>;
  onCreate: () => void;
  /** Opens the full, searchable list */
  onShowAll: () => void;
}

/**
 * A client with no plan: the coach's own templates, one click from
 * assigned. Replaces a generic "needs a plan" empty state with the thing
 * the coach is actually going to choose from.
 */
export function FirstPlanPicker({
  firstName,
  plans,
  isLoading,
  onAssign,
  onCreate,
  onShowAll,
}: FirstPlanPickerProps) {
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Most-used first: the plan a coach reaches for most is the likeliest pick
  const ranked = useMemo(
    () =>
      plans
        .filter((p) => !p.deletedAt)
        .sort(
          (a, b) =>
            b.assignedTo.length - a.assignedTo.length ||
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        ),
    [plans]
  );
  const visible = ranked.slice(0, PREVIEW);

  const handleAssign = async (planId: string) => {
    if (assigningId) return;
    setAssigningId(planId);
    try {
      await onAssign(planId);
    } finally {
      setAssigningId(null);
    }
  };

  const hasMore = ranked.length > PREVIEW;

  return (
    <div className="flex flex-col lg:flex-1 lg:min-h-0">
      <div className="pb-3">
        <h3 className="text-base font-semibold antialiased">{FIRST_PLAN_COPY.title(firstName)}</h3>
        <p className="text-sm text-muted-foreground mt-0.5 antialiased">{FIRST_PLAN_COPY.subtitle}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 antialiased">{FIRST_PLAN_COPY.noPlans}</p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border lg:min-h-0 lg:overflow-y-auto">
          {visible.map((plan) => {
            const onIt = plan.assignedTo.length;
            return (
              <li key={plan.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate antialiased">{plan.name}</p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground tabular-nums mt-1 antialiased">
                    {plan.durationWeeks} {plan.durationWeeks === 1 ? 'week' : 'weeks'} · {plan.workoutsPerWeek}×/week
                    {onIt > 0 && ` · ${onIt} ${onIt === 1 ? 'client' : 'clients'} on it`}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!!assigningId}
                  onClick={() => handleAssign(plan.id)}
                  className="shrink-0 active:scale-[0.96] transition-transform duration-150"
                >
                  {assigningId === plan.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Assign'}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* The other ways in, as tiles pinned to the card's bottom edge — level
          with the chat's composer beside it, so spare height sits above them
          instead of trailing off below two small links */}
      <div className={cn('grid gap-2 pt-4 lg:mt-auto', hasMore && 'sm:grid-cols-2')}>
        <ActionTile
          icon={<Plus className="w-4 h-4" />}
          title={FIRST_PLAN_COPY.build}
          hint={FIRST_PLAN_COPY.buildHint(firstName)}
          onClick={onCreate}
          dashed
        />
        {hasMore && (
          <ActionTile
            icon={<Search className="w-4 h-4" />}
            title={FIRST_PLAN_COPY.showAll(ranked.length)}
            hint={FIRST_PLAN_COPY.showAllHint}
            onClick={onShowAll}
          />
        )}
      </div>
    </div>
  );
}

function ActionTile({
  icon,
  title,
  hint,
  onClick,
  dashed,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  onClick: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-lg border px-3 py-3 text-start',
        'hover:bg-muted/50 active:scale-[0.98] transition-[background-color,border-color,transform] duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        dashed ? 'border-dashed border-foreground/20 hover:border-foreground/40' : 'border-border'
      )}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:bg-foreground group-hover:text-background transition-colors duration-150">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium truncate antialiased">{title}</span>
        <span className="block text-xs text-muted-foreground truncate mt-0.5 antialiased">{hint}</span>
      </span>
    </button>
  );
}
