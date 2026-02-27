'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Role } from '@/types';
import { storage } from '@/lib/storage';
import { sampleData } from '@/lib/sample-data';
import { migratePlansToV2, needsMigration } from '@/lib/migrations/plan-migration';
import { migratePlansToTemplateModel, needsTemplateMigration } from '@/lib/migrations/plan-template-migration';
import { detectDueCheckIns } from '@/lib/checkin-schedule-helpers';

interface AppStateContextType {
  appState: AppState | null;
  updateState: (updater: (state: AppState) => AppState) => void;
  switchRole: (role: Role, userId: string) => void;
  showRoleSelector: boolean;
  setShowRoleSelector: (show: boolean) => void;
}

const AppStateContext = createContext<AppStateContextType | null>(null);

export function useAppState(): AppStateContextType {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
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

          storedData.completedWorkouts = storedData.completedWorkouts.filter(w => w.clientId !== 'client-3');
          storedData.completedWorkouts = [
            ...storedData.completedWorkouts,
            {
              id: 'completed-alex-1',
              clientId: 'client-3',
              planId: 'plan-1',
              weekId: 'week-1',
              dayId: 'day-1',
              completedAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
              exercises: [{ id: 'ex-1', name: 'Barbell Bench Press', sets: 4, reps: '8-10', weight: '155 lbs', completed: true }]
            },
            {
              id: 'completed-alex-2',
              clientId: 'client-3',
              planId: 'plan-1',
              weekId: 'week-1',
              dayId: 'day-2',
              completedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
              exercises: [{ id: 'ex-1', name: 'Deadlift', sets: 4, reps: '6-8', weight: '225 lbs', completed: true }]
            },
            {
              id: 'completed-alex-3',
              clientId: 'client-3',
              planId: 'plan-1',
              weekId: 'week-1',
              dayId: 'day-3',
              completedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
              exercises: [{ id: 'ex-1', name: 'Squat', sets: 4, reps: '8-10', weight: '185 lbs', completed: true }]
            }
          ];

          storedData.alexMigrationV4 = true;
          storage.set(storedData);
          console.log('Alex Rodriguez V4 update successful - all 3 workouts LAST week');
        }
      }

      // Migration: add checkInSchedules array
      if (!storedData.checkInSchedules || !storedData.checkInSchedulesMigrationV1) {
        console.log('Adding checkInSchedules...');
        storedData.checkInSchedules = storedData.clients
          .filter((client) => client.currentPlanId)
          .map((client) => ({
            id: `schedule-${client.id}`,
            coachId: storedData!.coaches[0]?.id || 'coach-1',
            clientId: client.id,
            status: 'ACTIVE' as const,
            cadence: 'WEEKLY' as const,
            anchorDate: client.planStartDate || new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }));
        storedData.checkInSchedulesMigrationV1 = true;
        storage.set(storedData);
        console.log('checkInSchedules migration complete');
      }

      // ALWAYS refresh client check-in dates on page load to keep demo data fresh
      console.log('Refreshing client check-in dates for demo freshness...');
      storedData.clients = storedData.clients.map(client => {
        switch (client.id) {
          case 'client-1':
            return { ...client, lastCheckInDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString() };
          case 'client-2':
            return { ...client, lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() };
          case 'client-3':
            return { ...client, lastCheckInDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() };
          case 'client-4':
            return { ...client, lastCheckInDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString() };
          default:
            return client;
        }
      });
      storage.set(storedData);

      // Auto-enrollment: detect and create due check-ins on app load ("frontend cron")
      if (storedData.checkInSchedules?.length > 0) {
        const dueCheckIns = detectDueCheckIns(
          storedData.checkInSchedules,
          storedData.clients,
          storedData.checkIns
        );
        if (dueCheckIns.length > 0) {
          console.log(`Auto-creating ${dueCheckIns.length} due check-in(s)...`);
          storedData.checkIns = [...storedData.checkIns, ...dueCheckIns];
          storage.set(storedData);
        }
      }
    }
    setAppState(storedData);

    if (isFirstLoad) {
      setShowRoleSelector(true);
    } else if (storedData.currentRole && storedData.currentUserId) {
      setShowRoleSelector(false);
    }
  }, []);

  const updateState = (updater: (state: AppState) => AppState) => {
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
      currentUserId: userId,
    };
    setAppState(newState);
    storage.set(newState);
    setShowRoleSelector(false);
    // Navigation is handled by the caller via router.push()
  };

  return (
    <AppStateContext.Provider
      value={{
        appState,
        updateState,
        switchRole: handleSwitchRole,
        showRoleSelector,
        setShowRoleSelector,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}
