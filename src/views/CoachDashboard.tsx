'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { PlanSetupFormData } from '@/types';
import { formatReps } from '@/lib/reps';
import { WeeklyConfidenceStrip } from '@/components/coach/WeeklyConfidenceStrip';
import { ClientsRequiringAction } from '@/components/coach/ClientsRequiringAction';
import { PlanSetupModal } from '@/components/coach/PlanSetupModal';
import { ImportPlanModal } from '@/components/coach/ImportPlanModal';
import { ConfirmationModal } from '@/components/coach/ConfirmationModal';
import { PlanTemplateList } from '@/components/coach/plans/PlanTemplateList';
import { PlanEditorDrawer } from '@/components/coach/workspace/PlanEditorDrawer';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, PartyPopper, FlaskConical, Trash2, FileSpreadsheet } from 'lucide-react';
import { apiFetch, ApiError } from '@/lib/api-client';
import { toast } from 'sonner';
import { CoachNav, CoachNavTab } from '@/components/coach/CoachNav';
import { InviteClientModal } from '@/components/coach/InviteClientModal';
import { GettingStartedCard } from '@/components/coach/GettingStartedCard';
import { EmptyStateNoPlans, LoadErrorState } from '@/components/coach/EmptyStates';
import { PageHeader } from '@/components/coach/PageHeader';
import { useCoachDashboard } from '@/hooks/api/useCoachDashboard';
import { useCoachInvites } from '@/hooks/api/useCoachInvites';
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
          trackingType: e.trackingType,
          sets: e.sets,
          reps: formatReps(e.reps, e.repsMax, e.trackingType),
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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [isAddingSample, setIsAddingSample] = useState(false);
  const [showRemoveSampleConfirm, setShowRemoveSampleConfirm] = useState(false);

  // --- API hooks ---
  const { clients: dashboardClients, isLoading: isDashboardLoading, error: dashboardError, refresh: refreshDashboard } = useCoachDashboard();
  const { plans: apiPlans, createPlan, deletePlan, refresh: refreshPlans, isLoading: isPlansLoading } = useCoachPlans();
  const { invites, isLoading: isInvitesLoading, refresh: refreshInvites } = useCoachInvites();
  const { plan: editingPlanDetail, isLoading: isEditingPlanLoading, error: editingPlanError, refresh: refreshEditingPlan } = usePlanDetail(editingPlanId);

  // Set when plan creation starts from the getting-started guide, so the new
  // plan opens straight in the editor instead of just landing in the list
  const openEditorAfterCreate = useRef(false);

  // Latest still-shareable invite feeds the getting-started guide
  const pendingInvite = useMemo(
    () => invites.find((inv) => inv.status === 'PENDING') ?? null,
    [invites]
  );
  const lastInviteExpired = !pendingInvite && invites.some((inv) => inv.status === 'EXPIRED');

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

  // Names of clients on each plan — feeds the avatar stack on live rows
  const getClientNamesForTemplate = (planId: string) => {
    const plan = apiPlans.find((p) => p.id === planId);
    return plan?.assignedTo.map((a) => a.user.name || 'Client') ?? [];
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

  const handleUpdatePlan = () => {
    refreshPlans();
  };

  const handleCreateNewPlan = () => {
    setShowPlanSetupModal(true);
  };

  const handlePlanCreated = async (formData: PlanSetupFormData) => {
    try {
      const newPlan = await createPlan({
        name: formData.name,
        description: formData.description,
        durationWeeks: formData.durationWeeks,
        workoutsPerWeek: formData.workoutsPerWeek,
      });
      setShowPlanSetupModal(false);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      if (openEditorAfterCreate.current) {
        openEditorAfterCreate.current = false;
        setEditingPlanId(newPlan.id);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Failed to create plan. Please try again.');
    }
  };

  // Imported plans open straight in the editor so the coach can verify the
  // sheet came through the way they meant it
  const handlePlanImported = (plan: PlanSummary) => {
    setShowImportModal(false);
    toast.success(`"${plan.name}" imported`);
    refreshPlans();
    setEditingPlanId(plan.id);
  };

  const hasSampleClient = dashboardClients.some((c) => c.isSample);

  // Which of the dashboard's three empty-ish states is on screen. Derived once
  // so the page header and the body below it can never disagree about it.
  const isDashboardBootstrapping =
    isDashboardLoading ||
    (!dashboardError && dashboardClients.length === 0 && (isPlansLoading || isInvitesLoading));
  const showGettingStarted =
    !isDashboardBootstrapping && !dashboardError && dashboardClients.length === 0;

  const handleAddSampleClient = async () => {
    if (isAddingSample) return;
    setIsAddingSample(true);
    try {
      await apiFetch('/api/coach/sample-client', { method: 'POST' });
      await Promise.all([refreshDashboard(), refreshPlans()]);
    } catch {
      toast.error('Failed to add the sample client. Please try again.');
    } finally {
      setIsAddingSample(false);
    }
  };

  const handleRemoveSampleClient = async () => {
    try {
      await apiFetch('/api/coach/sample-client', { method: 'DELETE' });
      setShowRemoveSampleConfirm(false);
      await Promise.all([refreshDashboard(), refreshPlans()]);
    } catch {
      toast.error('Failed to remove the sample client. Please try again.');
    }
  };

  const handleDeleteTemplate = async () => {
    if (!planToDelete) return;
    try {
      await deletePlan(planToDelete);
      setPlanToDelete(null);
    } catch (err) {
      setPlanToDelete(null);
      toast.error(err instanceof ApiError ? err.message : 'Failed to delete plan. Please try again.');
    }
  };

  return (
    // No min-h-dvh or mobile bottom padding here: CoachLayout already supplies
    // both, and stacking a second full-viewport box inside the first pushed the
    // page ~76px past the fold on mobile no matter how little content it held.
    <div className="pb-0 sm:pb-4">
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
        onClose={() => {
          setShowInviteModal(false);
          // The modal generates a link on open — reflect it in the guide
          refreshInvites();
        }}
      />

      {/* Import from Excel Modal */}
      <ImportPlanModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImported={handlePlanImported}
      />

      {/* Plan Setup Modal */}
      <PlanSetupModal
        isOpen={showPlanSetupModal}
        onClose={() => {
          setShowPlanSetupModal(false);
          openEditorAfterCreate.current = false;
        }}
        onSubmit={handlePlanCreated}
      />

      {/* Remove Sample Client Confirmation */}
      <ConfirmationModal
        isOpen={showRemoveSampleConfirm}
        onClose={() => setShowRemoveSampleConfirm(false)}
        onConfirm={handleRemoveSampleClient}
        title="Remove Sample Client"
        message="Remove Riley Chen and all their generated data?"
        warningMessage="The sample plan, workouts, check-ins, and messages will be deleted. Your own plans and exercises stay untouched."
        confirmLabel="Remove"
        confirmVariant="destructive"
        icon={FlaskConical}
      />

      {/* Delete Template Confirmation */}
      <ConfirmationModal
        isOpen={!!planToDelete}
        onClose={() => setPlanToDelete(null)}
        onConfirm={handleDeleteTemplate}
        title="Delete Plan"
        message={`Are you sure you want to delete "${planToDeleteName}"?`}
        warningMessage="This action cannot be undone. Clients keep their own copy of any plan you've assigned them."
        confirmLabel="Delete"
        confirmVariant="destructive"
        icon={Trash2}
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

      <div className="max-w-7xl mx-auto px-4 pt-5 sm:px-6 sm:pt-10 lg:px-8">

        {currentView === 'dashboard' && (
          <div className="space-y-6 sm:space-y-8">
            {/* The getting-started screen carries the greeting itself as its
                brand kicker, so the standalone header would only repeat it.
                Held back while loading too, so it doesn't flash in and out. */}
            {!isDashboardBootstrapping && !showGettingStarted && (
              <div className="animate-enter">
                <PageHeader
                  title={getGreeting()}
                  subtitle={dashboardClients.length > 0 ? 'Here\u2019s your roster' : undefined}
                />
              </div>
            )}
            {isDashboardBootstrapping ? (
              // Same box the getting-started composition centres in, so the
              // spinner doesn't hand off to a screen that jumps
              <div className="flex items-center justify-center py-12 sm:min-h-[calc(100dvh-6.5rem-1px)] sm:py-0 animate-enter">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : dashboardError && dashboardClients.length === 0 ? (
              // A failed fetch must never masquerade as the "no clients yet"
              // onboarding state — a coach with a full roster would see it
              <LoadErrorState
                kicker="Roster · Signal lost"
                title="Couldn't load your roster"
                onRetry={() => refreshDashboard()}
              />
            ) : showGettingStarted ? (
              <div className="animate-enter" style={{ animationDelay: '60ms' }}>
                <GettingStartedCard
                  greeting={getGreeting()}
                  hasPlan={apiPlans.length > 0}
                  planName={apiPlans[0]?.name}
                  pendingInvite={pendingInvite}
                  lastInviteExpired={lastInviteExpired}
                  onCreatePlan={() => {
                    openEditorAfterCreate.current = true;
                    setShowPlanSetupModal(true);
                  }}
                  onInviteClient={() => setShowInviteModal(true)}
                  onAddSampleClient={handleAddSampleClient}
                  isAddingSample={isAddingSample}
                />
              </div>
            ) : (
              <>
                {/* Sample-mode strip — persistent reminder + exit while exploring */}
                {hasSampleClient && (
                  <div className="animate-enter flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-3">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <FlaskConical className="w-4 h-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-muted-foreground antialiased">
                        You&apos;re exploring with a sample client. The history is
                        generated, everything else is the real product.
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="sm" onClick={() => setShowInviteModal(true)} className="active:scale-[0.96] transition-transform duration-150">
                        Invite real client
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={() => setShowRemoveSampleConfirm(true)}>
                        Remove sample
                      </Button>
                    </div>
                  </div>
                )}
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
                      All clients on track. Nice coaching.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {currentView === 'plans' && (
          <div className="space-y-6 sm:space-y-8">
            <div className="animate-enter">
              <PageHeader
                title="Plans"
                subtitle={templates.length > 0 ? `${templates.length} ${templates.length === 1 ? 'template' : 'templates'}` : undefined}
                action={templates.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <Button onClick={() => setShowImportModal(true)} size="sm" variant="outline" className="active:scale-[0.96] transition-transform duration-150 tap-target">
                      <FileSpreadsheet className="w-4 h-4 mr-1.5" />
                      Import
                    </Button>
                    <Button onClick={handleCreateNewPlan} size="sm" className="active:scale-[0.96] transition-transform duration-150 tap-target">
                      <Plus className="w-4 h-4 mr-1.5" />
                      New Plan
                    </Button>
                  </div>
                ) : undefined}
              />
            </div>

            <section>
              {isPlansLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : templates.length > 0 ? (
                <PlanTemplateList
                  templates={templates}
                  getClientCount={getClientCountForTemplate}
                  getClientNames={getClientNamesForTemplate}
                  onEdit={setEditingPlanId}
                  onDelete={setPlanToDelete}
                />
              ) : (
                <EmptyStateNoPlans onCreate={handleCreateNewPlan} onImport={() => setShowImportModal(true)} />
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
