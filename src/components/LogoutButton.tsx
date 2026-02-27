'use client';

import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export function LogoutButton() {
  const { status } = useSession();

  if (status !== 'authenticated') return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-50">
      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground opacity-60 hover:opacity-100 transition-opacity"
        onClick={() => signOut({ callbackUrl: '/login' })}
      >
        Switch Account
      </Button>
    </div>
  );
}
