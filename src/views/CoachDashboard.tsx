'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlanSetupFormData } from '@/types';
import { WeeklyConfidenceStrip } from '@/components/coach/WeeklyConfidenceStrip';
import { ClientsRequiringAction } from '@/components/coach/ClientsRequiringAction';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { PlanTemplateCard } from '@/components/coach/plans/PlanTemplateCard';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle, Loader2 } from 'lucide-react';
import { CoachNav, CoachNavTab } from '@/components/coach/CoachNav';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import { useCoachPlans } from '@/hooks/api/useCoachPlans';
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import type { PlanDetail } from '@/hooks/api/usePlanDetail';
import type { WorkoutPlan } from '@/types';

type View = 'dashboard' | 'plans';

const viewToNavTab = (view: View): CoachNavTab => view;

// Adapt PlanSummary → WorkoutPlan for sub-components
function planSummaryToWorkoutPlan(p: { id: string; name: string; description: string | null; durationWeeks: number; createdAt: string; updatedAt: string; deletedAt: string | null; weeks: { id: string; weekNumber: number }[]; assignedTo: { id: string; user: { name: string | null } }[] }): WorkoutPlan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    durationWeeks: p.durationWeeks,
    weeks: p.weeks.map((w) => ({ id: w.id, weekNumber: w.weekNumber, days: [] })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    isTemplate: true,
  };
}

function planDetailToWorkoutPlan(p: PlanDetail): WorkoutPlan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    durationWeeks: p.durationWeeks,
    weeks: p.weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      days: w.days.map((d) => ({
        id: d.id,
        name: d.name ?? `Day ${d.dayNumber}`,
        isRestDay: d.isRestDay,
        exercises: d.exercises.map((e) => ({
          id: e.id,
          name: e.exercise.name,
          sets: e.sets,
          reps: e.reps ?? undefined,
          weight: e.weight ?? undefined,
          notes: e.coachNotes ?? undefined,
        })),
      })),
    })),
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    isTemplate: true,
  };
}

export function CoachDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [showPlanSetupModal, setShowPlanSetupModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);

  // --- API hooks ---
  const { clients: dashboardClients, isLoading: isDashboardLoading } = useCoachDashboard();
  const { plans: apiPlans, createPlan, deletePlan, refresh: refreshPlans, isLoading: isPlansLoading } = useCoachPlans();
  const { plan: editingPlanDetail } = usePlanDetail(editingPlanId);

  // Adapt plans for display
  const templates = useMemo(
    () => apiPlans.map(planSummaryToWorkoutPlan),
    [apiPlans]
  );

  // Editing plan adapted from full detail
  const editingPlan: WorkoutPlan | undefined = useMemo(
    () => (editingPlanDetail ? planDetailToWorkoutPlan(editingPlanDetail) : undefined),
    [editingPlanDetail]
  );

  // Count clients using each plan
  const getClientCountForTemplate = (planId: string) => {
    const plan = apiPlans.find((p) => p.id === planId);
    return plan?.assignedTo.length ?? 0;
  };

  // Plan name for delete confirmation
  const planToDeleteName = useMemo(() => {
    if (!planToDelete) return '';
    return apiPlans.find((p) => p.id === planToDelete)?.name || '';
  }, [apiPlans, planToDelete]);

  // Handle view query parameter
  useEffect(() => {
    const view = searchParams?.get('view');
    if (view === 'plans') {
      setCurrentView('plans');
    }
  }, [searchParams]);

  const handleUpdatePlan = (_updatedPlan: WorkoutPlan) => {
    refreshPlans();
  };

  const handleCreateNewPlan = () => {
    setShowPlanSetupModal(true);
  };

  const handlePlanCreated = async (formData: PlanSetupFormData) => {
    try {
      await createPlan({
        name: formData.name,
        description: formData.description,
        durationWeeks: formData.durationWeeks,
      });
      setShowPlanSetupModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch {
      // Error handled by apiFetch
    }
  };

  const handleDeleteTemplate = async () => {
    if (!planToDelete) return;
    try {
      await deletePlan(planToDelete);
      setPlanToDelete(null);
    } catch {
      // Error handled by apiFetch
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 pb-24 sm:pb-4">
      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-success text-success-foreground px-4 sm:px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <span className="font-medium text-sm sm:text-base">Plan created!</span>
        </div>
      )}

      {/* Plan Setup Modal */}
      <PlanSetupModal
        isOpen={showPlanSetupModal}
        onClose={() => setShowPlanSetupModal(false)}
        onSubmit={handlePlanCreated}
      />

      {/* Delete Template Confirmation */}
      <ConfirmationModal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Plan"
        message={`Are you sure you want to delete "${planToDeleteName}"?`}
        warningMessage="This action cannot be undone. Client plans created from this template will not be affected."
        confirmLabel="Delete"
        confirmVariant="destructive"
      />

      {/* Plan Editor Drawer */}
      {editingPlan && (
        <PlanEditorDrawer
          open={!!editingPlanId}
          onOpenChange={(open) => !open && setEditingPlanId(null)}
          plan={editingPlan}
          onUpdatePlan={handleUpdatePlan}
        />
      )}

      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        <CoachNav
          activeTab={viewToNavTab(currentView)}
          onTabChange={(tab) => {
            if (tab === 'clients') {
              router.push('/coach/clients');
            } else {
              setCurrentView(tab as View);
            }
          }}
        />

        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Dashboard</h1>
            {isDashboardLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <WeeklyConfidenceStrip clients={dashboardClients} />
                <ClientsRequiringAction clients={dashboardClients} />
              </>
            )}
          </div>
        )}

        {currentView === 'plans' && (
          <div className="space-y-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Plan Templates</h1>
            <section>
              <div className="flex items-center justify-between px-1 pb-2">
                <span className="text-[11px] sm:text-xs uppercase tracking-wider text-muted-foreground font-medium">
                  {templates.length} {templates.length === 1 ? 'template' : 'templates'}
                </span>
                <button
                  onClick={handleCreateNewPlan}
                  className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors font-medium uppercase tracking-wider"
                >
                  <Plus className="w-3.5 h-3.5" />
                  New
                </button>
              </div>

              {isPlansLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {templates.map((plan, i) => (
                    <div
                      key={plan.id}
                      className="animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${i * 75}ms`, animationFillMode: 'both' }}
                    >
                      <PlanTemplateCard
                        plan={plan}
                        clientCount={getClientCountForTemplate(plan.id)}
                        onEdit={() => setEditingPlanId(plan.id)}
                        onDelete={() => setPlanToDelete(plan.id)}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/30 text-center py-20 space-y-5">
                  <div className="text-5xl select-none">💪</div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-bold">No templates yet</h3>
                    <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                      Create your first workout plan template. Assign it to clients later.
                    </p>
                  </div>
                  <Button onClick={handleCreateNewPlan} size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Create Your First Template
                  </Button>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
