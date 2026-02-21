import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppState, Role } from '@/types';
import { storage } from '@/lib/storage';
import { sampleData } from '@/lib/sample-data';
import { migratePlansToV2, needsMigration } from '@/lib/migrations/plan-migration';
import { migratePlansToTemplateModel, needsTemplateMigration } from '@/lib/migrations/plan-template-migration';
import { CoachDashboard } from '@/pages/CoachDashboard';
import { ClientDashboard } from '@/pages/ClientDashboard';
import { ClientWorkoutExecution } from '@/pages/ClientWorkoutExecution';
import { ClientCheckIn } from '@/pages/ClientCheckIn';
import { ClientCheckInForm } from '@/pages/ClientCheckInForm';
import { UnifiedClientProfile } from '@/pages/UnifiedClientProfile';
import { AllClientsPage } from '@/pages/AllClientsPage';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, User } from 'lucide-react';

function AppContent() {
  const navigate = useNavigate();
  const [appState, setAppState] = useState<AppState | null>(null);
  const [showRoleSelector, setShowRoleSelector] = useState(false);

  useEffect(() => {
    let storedData = storage.get();
    const isFirstLoad = !storedData;

    if (!storedData) {
      storedData = sampleData;
      storage.set(storedData);
    } else {
      // Migration: add measurements field if it doesn't exist
      if (!storedData.measurements) {
        storedData.measurements = sampleData.measurements;
        storage.set(storedData);
      }
      // Migration: add checkIns field if it doesn't exist
      if (!storedData.checkIns) {
        storedData.checkIns = sampleData.checkIns;
        // Update clients with lastCheckInDate
        storedData.clients = storedData.clients.map((client, idx) => ({
          ...client,
          lastCheckInDate: sampleData.clients[idx]?.lastCheckInDate
        }));
        storage.set(storedData);
      }
      // Migration: upgrade plans to v2 (add emoji, durationWeeks, workoutsPerWeek, isRestDay)
      if (needsMigration(storedData.plans)) {
        console.log('Migrating plans to v2...');
        storedData.plans = migratePlansToV2(storedData.plans);
        storage.set(storedData);
        console.log('Plan migration complete');
      }
      // Migration: add isTemplate field to plans (template/instance model)
      if (needsTemplateMigration(storedData.plans)) {
        console.log('Migrating plans to template model...');
        storedData.plans = migratePlansToTemplateModel(storedData.plans);
        storage.set(storedData);
        console.log('Template migration complete');
      }
      // Migration: add coachExercises field if it doesn't exist or is empty
      if (!storedData.coachExercises || storedData.coachExercises.length === 0) {
        console.log('Adding default coach exercises...');
        storedData.coachExercises = sampleData.coachExercises;
        storage.set(storedData);
        console.log('Coach exercises added');
      }
      // Migration: add workoutCompletions and setCompletions arrays
      // Force refresh if empty or missing version flag (critical for mobile bug fix)
      if (!storedData.workoutCompletions || storedData.workoutCompletions.length === 0 || !storedData.workoutCompletionsMigrationV2) {
        console.log('Adding workoutCompletions and setCompletions arrays with sample data...');
        storedData.workoutCompletions = sampleData.workoutCompletions;
        storedData.setCompletions = sampleData.setCompletions || [];
        storedData.workoutCompletionsMigrationV2 = true;
        storage.set(storedData);
        console.log('Workout completion arrays added with sample data');
      }
      // Migration: add exerciseFlags array
      if (!storedData.exerciseFlags) {
        console.log('Adding exerciseFlags array...');
        storedData.exerciseFlags = [];
        storage.set(storedData);
        console.log('Exercise flags array added');
      }
      // Migration: add clientId to messages that are missing it (data isolation fix)
      // Also force-refresh messages if any are missing clientId (critical for mobile bug fix)
      const messagesNeedClientId = storedData.messages.some(msg => !msg.clientId);
      if (messagesNeedClientId || !storedData.messagesMigrationV2) {
        console.log('Adding clientId to messages for data isolation...');
        // Replace with fresh sample messages that have proper clientId
        storedData.messages = sampleData.messages;
        storedData.messagesMigrationV2 = true;
        storage.set(storedData);
        console.log('Messages clientId migration complete');
      }
      // Migration: add planStartDate to clients
      if (storedData.clients.some(c => !c.planStartDate)) {
        console.log('Adding planStartDate to clients...');
        storedData.clients = storedData.clients.map((client, idx) => ({
          ...client,
          planStartDate: client.planStartDate || sampleData.clients[idx]?.planStartDate || '2026-01-27'
        }));
        storage.set(storedData);
        console.log('planStartDate added to clients');
      }
      // Migration: Force Mike Chen to have today's workout (planStartDate = today)
      if (!storedData.mikeWorkoutTodayMigration) {
        console.log('Setting Mike Chen planStartDate to today so he has a workout...');
        const today = new Date().toISOString().split('T')[0];
        storedData.clients = storedData.clients.map(client =>
          client.id === 'client-1'
            ? { ...client, planStartDate: today }
            : client
        );
        storedData.mikeWorkoutTodayMigration = true;
        storage.set(storedData);
        console.log('Mike Chen now has a workout scheduled for today');
      }
      // Migration: Update Alex Rodriguez to be "all caught up" example - FORCE UPDATE V4
      const alexClient = storedData.clients.find(c => c.id === 'client-3');
      if (alexClient) {
        // Check if we need to update (using a version flag)
        if (!storedData.alexMigrationV4) {
          console.log('Forcing Alex Rodriguez update to be caught up (V4 - all workouts LAST week)...');
          storedData.clients = storedData.clients.map(client =>
            client.id === 'client-3'
              ? {
                  ...client,
                  lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                  lastWorkoutDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                  adherenceRate: 85
                }
              : client
          );

          // Remove old Alex workouts and add new ones (all within LAST WEEK)
          storedData.completedWorkouts = storedData.completedWorkouts.filter(w => w.clientId !== 'client-3');
          storedData.completedWorkouts = [
            ...storedData.completedWorkouts,
            {
              id: 'completed-alex-1',
              clientId: 'client-3',
              planId: 'plan-1',
              weekId: 'week-1',
              dayId: 'day-1',
              completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(), // 12 days ago (Monday of last week)
              exercises: [{ id: 'ex-1', name: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '155 lbs', completed: true }]
            },
            {
              id: 'completed-alex-2',
              clientId: 'client-3',
              planId: 'plan-1',
              weekId: 'week-1',
              dayId: 'day-2',
              completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago (Wednesday of last week)
              exercises: [{ id: 'ex-1', name: 'Deadlift', sets: 4, reps: '6-8', weight: '225 lbs', completed: true }]
            },
            {
              id: 'completed-alex-3',
              clientId: 'client-3',
              planId: 'plan-1',
              weekId: 'week-1',
              dayId: 'day-3',
              completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago (Friday of last week)
              exercises: [{ id: 'ex-1', name: 'Squat', sets: 4, reps: '8-10', weight: '185 lbs', completed: true }]
            }
          ];

          // Mark migration as complete
          storedData.alexMigrationV4 = true;
          storage.set(storedData);
          console.log('Alex Rodriguez V4 update successful - all 3 workouts LAST week');
        }
      }

      // ALWAYS refresh client check-in dates on page load to keep demo data fresh
      // This ensures clients never become stale/at-risk due to time passing
      console.log('Refreshing client check-in dates for demo freshness...');
      storedData.clients = storedData.clients.map(client => {
        switch (client.id) {
          case 'client-1': // Mike Chen - 3 days ago (normal, has responded check-in)
            return { ...client, lastCheckInDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() };
          case 'client-2': // Emma Wilson - 2 days ago (has unread message)
            return { ...client, lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() };
          case 'client-3': // Alex Rodriguez - 2 days ago (all caught up)
            return { ...client, lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() };
          case 'client-4': // Jordan Lee - 6 days ago (at-risk, intentional demo)
            return { ...client, lastCheckInDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() };
          default:
            return client;
        }
      });
      storage.set(storedData);
    }
    setAppState(storedData);

    // Show role selector on first load, hide it if user has already selected a role
    if (isFirstLoad) {
      setShowRoleSelector(true);
    } else if (storedData.currentRole && storedData.currentUserId) {
      setShowRoleSelector(false);
    }
  }, []);

  const handleUpdateState = (updater: (state: AppState) => AppState) => {
    if (!appState) return;
    const newState = updater(appState);
    setAppState(newState);
    storage.set(newState);
  };

  const handleSwitchRole = (role: Role, userId: string) => {
    if (!appState) return;
    const newState = {
      ...appState,
      currentRole: role,
      currentUserId: userId
    };
    setAppState(newState);
    storage.set(newState);
    setShowRoleSelector(false);

    // Navigate to the correct route
    navigate(role === 'coach' ? '/coach' : '/client');
  };

  if (!appState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showRoleSelector) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="max-w-4xl w-full space-y-4">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-2">LogBook.fit</h1>
            <p className="text-muted-foreground">Demo Mode - Select a role to continue</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <UserCog className="w-8 h-8" />
                  <CardTitle>Coach View</CardTitle>
                </div>
                <CardDescription>
                  Create workout plans, manage clients, and track progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {appState.coaches.map((coach) => (
                    <Button
                      key={coach.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSwitchRole('coach', coach.id)}
                    >
                      Login as {coach.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:border-primary transition-colors">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <User className="w-8 h-8" />
                  <CardTitle>Client View</CardTitle>
                </div>
                <CardDescription>
                  View workouts, track exercises, and chat with your coach
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {appState.clients.slice(0, 3).map((client) => (
                    <Button
                      key={client.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleSwitchRole('client', client.id)}
                    >
                      <span className="mr-2">{client.avatar}</span>
                      Login as {client.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
        <div className="fixed bottom-20 sm:bottom-4 right-4 z-50">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
            onClick={() => setShowRoleSelector(true)}
          >
            Switch Role
          </Button>
        </div>

        <Routes>
          <Route
            path="/"
            element={
              appState.currentRole === 'coach' ? (
                <Navigate to="/coach" replace />
              ) : (
                <Navigate to="/client" replace />
              )
            }
          />
          <Route
            path="/coach"
            element={<CoachDashboard appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/coach/clients"
            element={<AllClientsPage appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/coach/clients/:clientId"
            element={<UnifiedClientProfile appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/client"
            element={<ClientDashboard appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/client/workout/:weekId/:dayId"
            element={<ClientWorkoutExecution appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/client/checkin/:checkinId"
            element={<ClientCheckInForm appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/coach/client/:clientId/check-in"
            element={<ClientCheckIn appState={appState} onUpdateState={handleUpdateState} />}
          />
          {/* Catch-all routes - redirect unknown paths */}
          <Route path="/client/*" element={<Navigate to="/client" replace />} />
          <Route path="/coach/*" element={<Navigate to="/coach" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
