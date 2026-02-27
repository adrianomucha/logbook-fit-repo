'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppState } from '@/providers/AppStateProvider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCog, User } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { appState, switchRole, showRoleSelector } = useAppState();

  useEffect(() => {
    if (!appState) return;
    if (!showRoleSelector && appState.currentRole) {
      router.replace(appState.currentRole === 'coach' ? '/coach' : '/client');
    }
  }, [appState, showRoleSelector, router]);

  if (!appState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!showRoleSelector) return null;

  const handleSwitchRole = (role: 'coach' | 'client', userId: string) => {
    switchRole(role, userId);
    router.push(role === 'coach' ? '/coach' : '/client');
  };

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
