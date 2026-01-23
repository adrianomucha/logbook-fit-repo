import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AppState, Role } from '@/types';
import { storage } from '@/lib/storage';
import { sampleData } from '@/lib/sample-data';
import { migratePlansToV2, needsMigration } from '@/lib/migrations/plan-migration';
import { CoachDashboard } from '@/pages/CoachDashboard';
import { ClientDashboard } from '@/pages/ClientDashboard';
import ClientCheckIn from '@/pages/ClientCheckIn';
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

          <div className="grid md:grid-cols-2 gap-4">
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
        <div className="fixed bottom-4 right-4 z-50">
          <Button
            variant="outline"
            size="sm"
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
            path="/client"
            element={<ClientDashboard appState={appState} onUpdateState={handleUpdateState} />}
          />
          <Route
            path="/coach/client/:clientId/check-in"
            element={<ClientCheckIn />}
          />
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
