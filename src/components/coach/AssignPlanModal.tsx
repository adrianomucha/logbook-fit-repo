import { useState, useMemo } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dumbbell } from 'lucide-react';
import type { WorkoutPlan } from '@/types';

interface AssignPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (planId: string) => void;
  plans: WorkoutPlan[];
  currentPlanId?: string;
}

export function AssignPlanModal({
  isOpen,
  onClose,
  onAssign,
  plans,
  currentPlanId,
}: AssignPlanModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // Filter to only show templates (not archived)
  const templatePlans = useMemo(() =>
    plans.filter(p => p.isTemplate && !p.archivedAt),
    [plans]
  );

  const handleClose = () => {
    setSelectedPlanId(null);
    onClose();
  };

  const handleAssign = () => {
    if (selectedPlanId) {
      onAssign(selectedPlanId);
      setSelectedPlanId(null);
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
        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={!selectedPlanId}>
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
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
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
                  <div>
                    <div className="font-medium">{plan.name}</div>
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
