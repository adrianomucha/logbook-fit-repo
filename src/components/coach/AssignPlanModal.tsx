import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dumbbell, Loader2 } from 'lucide-react';
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
        <div className="text-center py-8">
          <Dumbbell className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Templates Available</h3>
          <p className="text-muted-foreground">
            Create a plan template first before assigning one to a client.
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
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting} className="ml-auto">
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedPlanId || isSubmitting} className="flex items-center gap-2">
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
              className={`w-full text-left p-3 rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isCurrent
                  ? 'bg-muted border-border opacity-60 cursor-not-allowed'
                  : isSelected
                  ? 'bg-primary/5 border-primary ring-1 ring-primary'
                  : 'bg-card border-border hover:border-input hover:bg-muted cursor-pointer'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{plan.emoji || '💪'}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{plan.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {plan.durationWeeks} {plan.durationWeeks === 1 ? 'week' : 'weeks'} · {plan.workoutsPerWeek} workouts/week
                    </div>
                  </div>
                </div>
                {isCurrent && (
                  <Badge variant="secondary">Current</Badge>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Modal>
  );
}
