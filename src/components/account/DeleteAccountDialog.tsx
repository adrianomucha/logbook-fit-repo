'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { signOut } from 'next-auth/react';
import { Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/ui/form-error';
import { apiFetch, ApiError } from '@/lib/api-client';

interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'COACH' | 'CLIENT' | undefined;
}

/**
 * "Delete account", opened from the account menu. The password is the
 * confirmation — typing it is deliberate in a way a second "Are you sure?"
 * button never is. On success the session is ended client-side too; the
 * server already refuses it, so this is just not leaving a dead screen up.
 */
export function DeleteAccountDialog({ isOpen, onClose, role }: DeleteAccountDialogProps) {
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setPassword('');
    setIsDeleting(false);
    setError(null);
  }, [isOpen]);

  const remove = async () => {
    if (!password || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiFetch('/api/me', {
        method: 'DELETE',
        body: JSON.stringify({ password }),
      });
      // Hard navigation on purpose: every cached bit of this account's data
      // must go with it.
      await signOut({ callbackUrl: '/' });
    } catch (e) {
      setError(
        e instanceof ApiError && (e.status === 403 || e.status === 429)
          ? e.message
          : 'Couldn’t delete the account. Nothing was changed — try again.'
      );
      setIsDeleting(false);
    }
  };

  if (!isOpen) return null;

  // Portal to <body>, same reason as FeedbackDialog: the sticky header's
  // backdrop-blur would otherwise become the containing block for the overlay.
  return createPortal(
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete your account"
      description="This can’t be undone. Confirm with your password."
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
            Keep my account
          </Button>
          <Button
            variant="destructive"
            onClick={remove}
            disabled={isDeleting || !password}
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            )}
            Delete account
          </Button>
        </div>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          void remove();
        }}
      >
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            You’ll be signed out everywhere and won’t be able to sign in
            again.
          </p>
          {role === 'COACH' ? (
            <p>
              Your clients lose their assigned plans and the chat with you, and
              any open invite links stop working. Your plans and exercise
              library go with the account.
            </p>
          ) : (
            <p>
              Your coach loses their plan assignment and the chat with you.
              Your name and email are removed; the workouts and check-ins you
              completed stay in your coach’s history under “Deleted account”.
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="delete-account-password"
            className="mb-2 block text-sm font-medium text-foreground"
          >
            Your password
          </label>
          <Input
            id="delete-account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            disabled={isDeleting}
          />
        </div>

        {error && <FormError>{error}</FormError>}
      </form>
    </Modal>,
    document.body
  );
}
