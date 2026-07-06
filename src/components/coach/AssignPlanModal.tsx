import { useState, useMemo } from 'react';
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
}

export function AssignPlanModal({
  isOpen,
  onClose,
  onAssign,
  onUnassign,
  plans,
  currentPlanId,
}: AssignPlanModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  // Filter to only show templates (not archived)
  const templatePlans = useMemo(() =>
    plans.filter(p => p.isTemplate && !p.archivedAt),
    [plans]
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

  if (templatePlans.length === 0) {
    return (
      <Modal isOpen={isOpen} onClose={handleClose} title="Assign Plan" maxWidth="md">
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
      title="Assign Plan"
      maxWidth="md"
      footer={
        <div className="flex gap-3 items-center">
          {currentPlanId && onUnassign && (
            <Button
              variant="ghost"
              onClick={handleRemove}
              disabled={isSubmitting}
              className="text-destructive hover:text-destructive mr-auto"
            >
              {confirmingRemove ? 'Confirm remove?' : 'Remove current plan'}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
            className="ml-auto active:scale-[0.96] transition-transform duration-150 tap-target"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedPlanId || isSubmitting}
            className="flex items-center gap-2 active:scale-[0.96] transition-transform duration-150 tap-target"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Assign Plan
          </Button>
        </div>
      }
    >
      <div className="space-y-2">
        {templatePlans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const isSelected = plan.id === selectedPlanId;

          return (
            <button
              key={plan.id}
              disabled={isCurrent}
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                'w-full text-left rounded-xl p-3 sm:p-3.5 bg-card transition-all duration-150',
                'shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isCurrent
                  ? 'opacity-50 cursor-not-allowed'
                  : isSelected
                    ? 'ring-2 ring-brand'
                    : 'cursor-pointer active:scale-[0.98] hover:shadow-[0_2px_4px_rgba(0,0,0,0.06),0_4px_16px_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.08)]'
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted/60 flex items-center justify-center text-xl leading-none select-none shrink-0">
                  {plan.emoji || '💪'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate antialiased">{plan.name}</div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium tabular-nums antialiased mt-0.5">
                    {plan.durationWeeks} {plan.durationWeeks === 1 ? 'week' : 'weeks'} · {plan.workoutsPerWeek}×/week
                  </p>
                </div>
                {isCurrent && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium antialiased shrink-0">
                    Current
                  </span>
                )}
                {isSelected && !isCurrent && (
                  <span className="w-5 h-5 rounded-full bg-brand flex items-center justify-center shrink-0" aria-hidden="true">
                    <Check className="w-3 h-3 text-brand-foreground" strokeWidth={3} />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
