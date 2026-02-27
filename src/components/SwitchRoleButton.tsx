'use client';

import { useRouter } from 'next/navigation';
import { useAppState } from '@/providers/AppStateProvider';
import { Button } from '@/components/ui/button';

export function SwitchRoleButton() {
  const router = useRouter();
  const { appState, showRoleSelector, setShowRoleSelector } = useAppState();

  if (!appState || showRoleSelector) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-50">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
        onClick={() => {
          setShowRoleSelector(true);
          router.push('/');
        }}
      >
        Switch Role
      </Button>
    </div>
  );
}
