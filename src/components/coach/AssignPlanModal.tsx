import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Dumbbell, Loader2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkoutPlan } from '@/types';

interface AssignPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (planId: string) => void | Promise<void>;
  /** Optional: offered when a plan is currently assigned, to clear the assignment */
  onUnassign?: () => void | Promise<void>;
  plans: WorkoutPlan[];
  currentPlanId?: string;
  /** Client receiving the plan — named in the header and the confirm button */
  clientName?: string;
}

const cardShadow =
  'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

const statClass =
  'font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground font-medium tabular-nums antialiased';

/** Search appears once the list is long enough that scanning stops being enough */
const SEARCH_THRESHOLD = 6;

const weeksLabel = (plan: WorkoutPlan) =>
  `${plan.durationWeeks} ${plan.durationWeeks === 1 ? 'week' : 'weeks'}`;
const perWeekLabel = (plan: WorkoutPlan) => `${plan.workoutsPerWeek}×/week`;

/**
 * Assign / switch a client's plan.
 * One grouped list in the Plans page's voice — rows, not cards: the current
 * plan pinned on top and tagged, templates below with aligned stat columns.
 * Tap a row to pick it; the footer names what will happen.
 */
export function AssignPlanModal({
  isOpen,
  onClose,
  onAssign,
  onUnassign,
  plans,
  currentPlanId,
  clientName,
}: AssignPlanModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);
  const [query, setQuery] = useState('');

  // Assignable templates (not archived), excluding whatever is already assigned
  const templatePlans = useMemo(
    () => plans.filter((p) => p.isTemplate && !p.archivedAt),
    [plans]
  );
  const currentPlan = useMemo(
    () => plans.find((p) => p.id === currentPlanId) ?? null,
    [plans, currentPlanId]
  );
  const selectablePlans = useMemo(
    () => templatePlans.filter((p) => p.id !== currentPlanId),
    [templatePlans, currentPlanId]
  );

  const q = query.trim().toLowerCase();
  const visiblePlans = q
    ? selectablePlans.filter((p) => p.name.toLowerCase().includes(q))
    : selectablePlans;
  const showSearch = selectablePlans.length > SEARCH_THRESHOLD || q.length > 0;

  const selectedPlan = selectablePlans.find((p) => p.id === selectedPlanId) ?? null;
  const firstName = clientName?.trim().split(/\s+/)[0];

  const title = (
    <>
      <span className="block font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
        {currentPlan ? 'Change plan' : 'Assign plan'}
      </span>
      <span className="block text-lg sm:text-xl font-bold tracking-tight">
        {clientName ?? 'Choose a plan'}
      </span>
    </>
  );

  const reset = () => {
    setSelectedPlanId(null);
    setConfirmingRemove(false);
    setQuery('');
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  const handleAssign = async () => {
    if (!selectedPlanId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAssign(selectedPlanId);
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Two-tap remove: first tap arms the confirmation, second executes
  const handleRemove = async () => {
    if (!onUnassign || isSubmitting) return;
    if (!confirmingRemove) {
      setConfirmingRemove(true);
      return;
    }
    setIsSubmitting(true);
    try {
      await onUnassign();
      reset();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Nothing assigned and nothing to assign — a single quiet empty state
  if (selectablePlans.length === 0 && !currentPlan) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title={title} maxWidth="md">
        <div className="text-center py-10">
          <div className="w-11 h-11 rounded-lg bg-muted/60 flex items-center justify-center mx-auto mb-3">
            <Dumbbell className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold antialiased mb-1">No templates yet</p>
          <p className="text-[13px] text-muted-foreground antialiased">
            Create a plan template first, then assign it to a client.
          </p>
        </div>
      </Modal>
    );
  }

  const confirmLabel = selectedPlan
    ? currentPlan
      ? 'Switch plan'
      : firstName
        ? `Assign to ${firstName}`
        : 'Assign plan'
    : currentPlan
      ? 'Switch plan'
      : 'Assign plan';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="lg"
      footer={
        <div className="flex items-center gap-1.5">
          {/* Removal lives with the other actions, quiet until armed */}
          {currentPlan && onUnassign && (
            <button
              onClick={handleRemove}
              onBlur={() => setConfirmingRemove(false)}
              disabled={isSubmitting}
              className={cn(
                'mr-auto text-sm font-medium antialiased rounded-md px-2 py-1.5 -ml-2 transition-colors tap-target',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                confirmingRemove
                  ? 'text-destructive bg-destructive/10'
                  : 'text-muted-foreground hover:text-destructive'
              )}
            >
              {confirmingRemove ? 'Tap again to remove' : 'Remove plan'}
            </button>
          )}
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="ml-auto text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedPlanId || isSubmitting}
            className="flex items-center gap-2 active:scale-[0.96] transition-transform duration-150 tap-target"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {showSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search plans..."
              aria-label="Search plans"
              className="pl-9"
            />
          </div>
        )}

        <div className={cn('bg-card rounded-xl divide-y divide-border overflow-hidden', cardShadow)}>
          {/* Current plan — pinned first, tagged rather than selectable */}
          {currentPlan && !q && (
            <div className="flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 bg-muted/40">
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-[15px] font-black tracking-tight leading-tight truncate antialiased">
                  {currentPlan.name}
                </p>
                <p className="flex items-center gap-1.5 mt-1 font-mono text-[10px] uppercase tracking-[0.12em] font-medium tabular-nums antialiased truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand ring-2 ring-brand/25 shrink-0" aria-hidden="true" />
                  <span className="text-foreground">Current</span>
                  <span className="sm:hidden text-muted-foreground">
                    · {weeksLabel(currentPlan)} · {perWeekLabel(currentPlan)}
                  </span>
                </p>
              </div>
              <span className={cn(statClass, 'hidden sm:block w-[64px] text-right shrink-0')}>
                {weeksLabel(currentPlan)}
              </span>
              <span className={cn(statClass, 'hidden sm:block w-[64px] text-right shrink-0')}>
                {perWeekLabel(currentPlan)}
              </span>
              <span className="w-5 shrink-0" aria-hidden="true" />
            </div>
          )}

          {visiblePlans.length > 0 ? (
            <div role="radiogroup" aria-label="Plan templates" className="divide-y divide-border">
              {visiblePlans.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => {
                      setConfirmingRemove(false);
                      setSelectedPlanId(isSelected ? null : plan.id);
                    }}
                    className={cn(
                      'group relative w-full text-start flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring',
                      isSelected ? 'bg-brand/10' : 'hover:bg-muted/50 active:bg-muted/70'
                    )}
                  >
                    {/* Volt edge marks the pick */}
                    <span
                      className={cn(
                        'absolute left-0 inset-y-0 w-[3px] bg-brand transition-opacity duration-150',
                        isSelected ? 'opacity-100' : 'opacity-0'
                      )}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm sm:text-[15px] font-black tracking-tight leading-tight truncate antialiased group-hover:translate-x-0.5 transition-transform duration-150">
                        {plan.name}
                      </p>
                      <p className={cn(statClass, 'sm:hidden mt-0.5 truncate')}>
                        {weeksLabel(plan)} · {perWeekLabel(plan)}
                      </p>
                    </div>
                    <span className={cn(statClass, 'hidden sm:block w-[64px] text-right shrink-0')}>
                      {weeksLabel(plan)}
                    </span>
                    <span className={cn(statClass, 'hidden sm:block w-[64px] text-right shrink-0')}>
                      {perWeekLabel(plan)}
                    </span>
                    <span className="w-5 flex justify-end shrink-0" aria-hidden="true">
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full bg-brand flex items-center justify-center transition-[opacity,transform] duration-150',
                          isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
                        )}
                      >
                        <Check className="w-3 h-3 text-brand-foreground" strokeWidth={3} />
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground antialiased px-4 py-6 text-center">
              {q
                ? <>No plans match &ldquo;{query.trim()}&rdquo;</>
                : 'No other templates yet. Create one on the Plans page first.'}
            </p>
          )}
        </div>

        {/* Say what a switch does before it happens */}
        {selectedPlan && currentPlan && (
          <p className="text-[13px] text-muted-foreground antialiased px-1">
            {firstName ?? 'Your client'} starts week 1 of{' '}
            <span className="font-semibold text-foreground">{selectedPlan.name}</span>.
            Past workouts stay in their history.
          </p>
        )}
      </div>
    </Modal>
  );
}
