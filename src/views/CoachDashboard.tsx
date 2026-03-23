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
import { Plus, CheckCircle, Loader2, PartyPopper } from 'lucide-react';
import { CoachNav, CoachNavTab } from '@/components/coach/CoachNav';
import { InviteClientModal } from '@/components/coach/InviteClientModal';
import { PageHeader } from '@/components/coach/PageHeader';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import { useCoachPlans } from '@/hooks/api/useCoachPlans';
import { usePlanDetail } from '@/hooks/api/usePlanDetail';
import type { PlanDetail } from '@/hooks/api/usePlanDetail';
import type { WorkoutPlan } from '@/types';
import type { PlanSummary } from '@/types/api';

type View = 'dashboard' | 'plans';

const viewToNavTab = (view: View): CoachNavTab => view;

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// Adapt PlanSummary → WorkoutPlan for sub-components
function planSummaryToWorkoutPlan(p: PlanSummary): WorkoutPlan {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? undefined,
    emoji: p.emoji,
    durationWeeks: p.durationWeeks,
    workoutsPerWeek: p.workoutsPerWeek,
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
    emoji: p.emoji,
    durationWeeks: p.durationWeeks,
    workoutsPerWeek: p.workoutsPerWeek,
    weeks: p.weeks.map((w) => ({
      id: w.id,
      weekNumber: w.weekNumber,
      days: w.days.map((d) => ({
        id: d.id,
        orderIndex: d.orderIndex,
        name: d.name ?? `Day ${d.orderIndex}`,
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
  const [showInviteModal, setShowInviteModal] = useState(false);

  // --- API hooks ---
  const { clients: dashboardClients, isLoading: isDashboardLoading } = useCoachDashboard();
  const { plans: apiPlans, createPlan, deletePlan, refresh: refreshPlans, isLoading: isPlansLoading } = useCoachPlans();
  const { plan: editingPlanDetail, isLoading: isEditingPlanLoading, error: editingPlanError, refresh: refreshEditingPlan } = usePlanDetail(editingPlanId);

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
        emoji: formData.emoji,
        durationWeeks: formData.durationWeeks,
        workoutsPerWeek: formData.workoutsPerWeek,
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
      {/* Success Toast — checkmark draws in */}
      {showSuccessToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white px-5 py-3.5 rounded-xl shadow-[0_4px_24px_rgba(16,185,129,0.3)] flex items-center gap-2.5 animate-in slide-in-from-top duration-300">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.3" />
            <path
              d="M8 12.5l2.5 2.5 5.5-5.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-draw-check"
            />
          </svg>
          <span className="font-semibold text-sm tracking-tight">Plan created</span>
        </div>
      )}

      {/* Invite Client Modal */}
      <InviteClientModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
      />

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
      <PlanEditorDrawer
        open={!!editingPlanId}
        onOpenChange={(open) => !open && setEditingPlanId(null)}
        plan={editingPlan ?? null}
        isLoading={isEditingPlanLoading}
        error={editingPlanError ? 'Failed to load plan' : undefined}
        onUpdatePlan={handleUpdatePlan}
        onRefresh={() => { refreshEditingPlan(); refreshPlans(); }}
      />

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
            <div className="animate-enter">
              <PageHeader
                title={getGreeting()}
                subtitle={dashboardClients.length > 0 ? 'Here\u2019s your roster' : undefined}
              />
            </div>
            {isDashboardLoading ? (
              <div className="flex items-center justify-center py-12 animate-enter">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : dashboardClients.length === 0 ? (
              <div className="animate-enter flex flex-col items-center text-center pt-8 sm:pt-16 pb-8" style={{ animationDelay: '60ms' }}>
                <div className="text-5xl sm:text-6xl select-none mb-5 animate-bounce-once">🏋️</div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight mb-1.5 antialiased">
                  Your roster is empty
                </h2>
                <p className="text-sm text-muted-foreground max-w-[280px] mb-6 antialiased">
                  Invite your first client to get started.
                </p>
                <Button onClick={() => setShowInviteModal(true)} size="lg" className="text-sm tracking-wide px-8 active:scale-[0.96] transition-transform duration-150">
                  <Plus className="w-4 h-4 mr-2" />
                  Invite Client
                </Button>
              </div>
            ) : (
              <>
                <div className="animate-enter" style={{ animationDelay: '60ms' }}>
                  <WeeklyConfidenceStrip clients={dashboardClients} />
                </div>
                <div className="animate-enter" style={{ animationDelay: '120ms' }}>
                  <ClientsRequiringAction clients={dashboardClients} />
                </div>

                {/* All-clear celebration — only when every client is on track */}
                {dashboardClients.length > 0 && dashboardClients.every((c) => c.urgency === 'ON_TRACK') && (
                  <div className="animate-enter flex items-center gap-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3.5" style={{ animationDelay: '180ms' }}>
                    <PartyPopper className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 animate-bounce-once" />
                    <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 antialiased">
                      All clients on track — nice coaching.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentView === 'plans' && (
          <div className="space-y-6">
            <div className="animate-enter">
              <PageHeader
                title="Plans"
                subtitle={templates.length > 0 ? `${templates.length} ${templates.length === 1 ? 'template' : 'templates'}` : undefined}
                action={templates.length > 0 ? (
                  <Button onClick={handleCreateNewPlan} size="sm" variant="outline" className="active:scale-[0.96] transition-transform duration-150">
                    <Plus className="w-4 h-4 mr-1.5" />
                    New Plan
                  </Button>
                ) : undefined}
              />
            </div>

            <section>
              {isPlansLoading ? (
                <div className="flex items-center justify-center py-20">
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
                <div className="flex flex-col items-center text-center pt-8 sm:pt-16 pb-8 animate-enter">
                  <div className="text-6xl sm:text-7xl select-none mb-6 animate-bounce-once">📋</div>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 antialiased">
                    Your blank canvas
                  </h2>
                  <p className="text-sm text-muted-foreground max-w-[280px] mb-8 antialiased">
                    Design a workout template, then assign it to any client. One plan, many athletes.
                  </p>
                  <Button onClick={handleCreateNewPlan} size="lg" className="text-sm tracking-wide px-8 active:scale-[0.96] transition-transform duration-150">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Template
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
