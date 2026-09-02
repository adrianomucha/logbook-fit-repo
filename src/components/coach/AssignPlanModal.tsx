import { useState, useMemo, type ReactNode } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Check, Dumbbell, Loader2 } from 'lucide-react';
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

const metaLine = (plan: WorkoutPlan) =>
  `${plan.durationWeeks} ${plan.durationWeeks === 1 ? 'week' : 'weeks'} · ${plan.workoutsPerWeek}×/week`;

const GroupLabel = ({ children }: { children: ReactNode }) => (
  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium antialiased mb-2 px-1">
    {children}
  </p>
);

const PlanMeta = ({ plan }: { plan: WorkoutPlan }) => (
  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium tabular-nums antialiased mt-0.5">
    {metaLine(plan)}
  </p>
);

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

  const firstName = clientName?.trim().split(/\s+/)[0];

  const title = (
    <>
      <span className="block font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
        Assign plan
      </span>
      <span className="block text-lg sm:text-xl font-bold tracking-tight">
        {clientName ?? 'Choose a plan'}
      </span>
    </>
  );

  const handleClose = () => {
    if (isSubmitting) return;
    setSelectedPlanId(null);
    setConfirmingRemove(false);
    onClose();
  };

  const handleAssign = async () => {
    if (!selectedPlanId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAssign(selectedPlanId);
      setSelectedPlanId(null);
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
      setConfirmingRemove(false);
      setSelectedPlanId(null);
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      maxWidth="md"
      footer={
        <div className="flex items-center justify-end gap-1.5">
          <Button
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-muted-foreground hover:text-foreground active:scale-[0.96] transition-transform duration-150 tap-target"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedPlanId || isSubmitting}
            className="flex items-center gap-2 active:scale-[0.96] transition-transform duration-150 tap-target"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {selectedPlanId && firstName ? `Assign to ${firstName}` : 'Assign plan'}
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* What's assigned now, with its removal action in context */}
        {currentPlan && (
          <div>
            <GroupLabel>Current plan</GroupLabel>
            <div className="flex items-center gap-3 rounded-xl bg-muted/40 p-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate antialiased">{currentPlan.name}</p>
                <PlanMeta plan={currentPlan} />
              </div>
              {onUnassign && (
                <button
                  onClick={handleRemove}
                  disabled={isSubmitting}
                  className={cn(
                    'shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] font-medium antialiased',
                    'underline underline-offset-2 transition-colors tap-target disabled:opacity-50',
                    confirmingRemove
                      ? 'text-destructive'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {confirmingRemove ? 'Confirm remove?' : 'Remove'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Picker */}
        <div>
          {currentPlan && <GroupLabel>Switch to</GroupLabel>}
          {selectablePlans.length > 0 ? (
            <div className="space-y-2" role="radiogroup" aria-label="Plan templates">
              {selectablePlans.map((plan) => {
                const isSelected = plan.id === selectedPlanId;
                return (
                  <button
                    key={plan.id}
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedPlanId(isSelected ? null : plan.id)}
                    className={cn(
                      'w-full text-start rounded-xl p-3 bg-card transition-[box-shadow,transform] duration-150',
                      'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      'cursor-pointer active:scale-[0.98]',
                      isSelected
                        ? 'ring-2 ring-brand'
                        : 'hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.08)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate antialiased">{plan.name}</p>
                        <PlanMeta plan={plan} />
                      </div>
                      {/* Radio affordance — hairline circle, filled lime when picked */}
                      <span
                        className={cn(
                          'w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors',
                          isSelected
                            ? 'bg-brand'
                            : 'shadow-[inset_0_0_0_1.5px_hsl(var(--border))]'
                        )}
                        aria-hidden="true"
                      >
                        {isSelected && (
                          <Check className="w-3 h-3 text-brand-foreground" strokeWidth={3} />
                        )}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-muted-foreground antialiased px-1">
              No other templates yet. Create one on the Plans page first.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
