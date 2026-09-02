'use client';

import { useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Bell,
  Camera,
  KeyRound,
  Loader2,
  Trash2,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
import { DeleteAccountDialog } from '@/components/account/DeleteAccountDialog';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormError } from '@/components/ui/form-error';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch, ApiError } from '@/lib/api-client';
import { avatarColor } from '@/lib/avatar-colors';
import { passwordSchema, BIO_MAX_LENGTH } from '@/lib/validations/schemas';
import { cn } from '@/lib/utils';

/**
 * The settings panes, shared between the coach page (/coach/settings) and
 * the client page (/client/settings). Each pane takes the role as a variant:
 * the API endpoints underneath are role-agnostic, so the differences are
 * copy and which fields exist (bio and the invite preview are coach-only).
 * The page shells own the chrome — nav, rail and card surface.
 */

export type SettingsRole = 'coach' | 'client';

export type SettingsSectionId = 'profile' | 'account' | 'password' | 'notifications';

export const SETTINGS_SECTIONS: {
  id: SettingsSectionId;
  label: string;
  icon: LucideIcon;
}[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'account', label: 'Account', icon: Wrench },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'notifications', label: 'Alerts', icon: Bell },
];

export const settingsCardClass =
  'bg-card rounded-xl p-4 sm:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)]';

const inputClass =
  'h-11 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background';

/** Uppercase tracked mono label — the product's data voice */
function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
    >
      {children}
    </label>
  );
}

/** Muted helper line under a field. */
function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground leading-relaxed text-pretty">{children}</p>;
}

/** Pane heading: bold title + one muted sentence, over a hairline. */
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold tracking-tight antialiased">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5 text-pretty">{description}</p>
      <div className="h-px bg-border mt-4" aria-hidden="true" />
    </div>
  );
}

/**
 * Profile pane: photo + name for everyone; coaches also edit the bio and see
 * a live preview of the invite signup hero — the one place a prospective
 * client reads it before they commit.
 */
export function ProfileSection({ role }: { role: SettingsRole }) {
  const { user, refresh } = useCurrentUser();
  const isCoach = role === 'coach';
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const avatarUrl = user?.avatarUrl ?? null;

  // Seed the form once the profile arrives; never clobber in-progress edits
  // on background revalidation.
  useEffect(() => {
    if (user && !isSeeded) {
      setName(user.name ?? '');
      setBio(user.coachProfile?.bio ?? '');
      setIsSeeded(true);
    }
  }, [user, isSeeded]);

  const savedName = user?.name ?? '';
  const savedBio = user?.coachProfile?.bio ?? '';
  const isDirty =
    name.trim() !== savedName || (isCoach && bio.trim() !== savedBio);
  const previewName = name.trim() || 'Your coach';

  const handlePhotoFile = async (file: File | undefined) => {
    if (!file || isPhotoBusy) return;
    if (file.size > 4 * 1024 * 1024) {
      toast.error('Choose an image under 4MB');
      return;
    }
    setIsPhotoBusy(true);
    try {
      // Raw bytes, not JSON — the server sniffs the real type from them
      const res = await fetch('/api/account/avatar', {
        method: 'PUT',
        body: file,
        cache: 'no-store',
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || 'Upload failed');
      }
      await refresh();
      toast.success('Photo updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t upload the photo.');
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (isPhotoBusy) return;
    setIsPhotoBusy(true);
    try {
      await apiFetch('/api/account/avatar', { method: 'DELETE' });
      await refresh();
      toast.success('Photo removed');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t remove the photo.');
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: name.trim(),
          ...(isCoach ? { bio: bio.trim() } : {}),
        }),
      });
      await refresh();
      toast.success('Profile saved');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Profile"
        description={
          isCoach
            ? 'How clients see you — on invites and around the app.'
            : 'How your coach sees you — on your card in their app.'
        }
      />

      <div className="space-y-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="settings-name">Photo &amp; name</FieldLabel>
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={isPhotoBusy}
                aria-label={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
                className="block w-11 h-11 rounded-full overflow-hidden touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.96] transition-transform duration-150"
              >
                {avatarUrl ? (
                  // Storage URLs are remote; next/image would need a
                  // remotePatterns allowlist (same call as SignupClient)
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span
                    className={cn(
                      'w-full h-full flex items-center justify-center select-none text-base font-bold',
                      avatarColor(name.trim() || savedName || 'You')
                    )}
                  >
                    {(name.trim() || savedName || 'Y').charAt(0).toUpperCase()}
                  </span>
                )}
                {isPhotoBusy && (
                  <span className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  </span>
                )}
              </button>
              <span
                className="absolute -bottom-0.5 -end-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background ring-2 ring-card pointer-events-none"
                aria-hidden="true"
              >
                <Camera className="h-2.5 w-2.5" />
              </span>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  void handlePhotoFile(e.target.files?.[0]);
                  // Same file picked twice still fires onChange
                  e.target.value = '';
                }}
              />
            </div>
            <Input
              id="settings-name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
              className={inputClass}
            />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <FieldHint>JPG, PNG, or WebP, up to 4MB.</FieldHint>
            {avatarUrl && (
              <button
                type="button"
                onClick={() => void handlePhotoRemove()}
                disabled={isPhotoBusy}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation tap-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm disabled:opacity-50"
              >
                Remove photo
              </button>
            )}
          </div>
        </div>

        {isCoach && (
          <>
            <div className="space-y-2">
              <div className="flex items-baseline justify-between gap-2">
                <FieldLabel htmlFor="settings-bio">Bio</FieldLabel>
                {bio.length > 0 && (
                  <span
                    className={cn(
                      'font-mono text-[10px] tracking-[0.08em] tabular-nums',
                      bio.length >= BIO_MAX_LENGTH
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                    )}
                  >
                    {bio.length}/{BIO_MAX_LENGTH}
                  </span>
                )}
              </div>
              <Textarea
                id="settings-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="A line or two about how you coach"
                maxLength={BIO_MAX_LENGTH}
                rows={3}
                className="rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background resize-none"
              />
              <FieldHint>New clients read this on the invite signup page.</FieldHint>
            </div>

            {/* Mirrors the invite signup hero, so "save" is never a leap of faith */}
            <div className="ps-3.5 border-s-2 border-brand">
              <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
                What an invited client sees
              </p>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0',
                    avatarUrl ? 'bg-muted' : avatarColor(previewName)
                  )}
                  aria-hidden="true"
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[9px] font-bold uppercase">
                      {previewName.charAt(0)}
                    </span>
                  )}
                </div>
                <p className="text-base font-black uppercase tracking-tight antialiased">
                  {previewName} is expecting you
                </p>
              </div>
              {bio.trim() && (
                <p className="text-sm text-muted-foreground leading-relaxed mt-1 text-pretty">
                  {bio.trim()}
                </p>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving || !name.trim()}
            className="active:scale-[0.96] transition-transform duration-150"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
            Save profile
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Read-only account facts, plus the one destructive action. */
export function AccountSection({ role }: { role: SettingsRole }) {
  const { user } = useCurrentUser();
  const isCoach = role === 'coach';
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: 'Email', value: user?.email ?? '—', hint: 'The address you sign in with.' },
    {
      label: 'Timezone',
      value: user?.timezone ?? 'UTC',
      hint: isCoach
        ? 'Detected from your browser — check-in schedules follow it automatically, even when you travel.'
        : 'Detected from your browser — your check-in schedule follows it, even when you travel.',
    },
    {
      label: 'Member since',
      value: user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—',
    },
  ];

  return (
    <div>
      <SectionHeader
        title="Account"
        description="The basics behind your login. These keep themselves up to date."
      />

      <dl>
        {rows.map(({ label, value, hint }, index) => (
          <div key={label} className={cn('py-3.5', index > 0 && 'border-t border-border/60')}>
            <dt>
              <FieldLabel>{label}</FieldLabel>
            </dt>
            <dd className="text-sm font-medium text-foreground mt-1 break-words">{value}</dd>
            {hint && (
              <dd className="mt-1">
                <FieldHint>{hint}</FieldHint>
              </dd>
            )}
          </div>
        ))}
      </dl>

      {/* The one destructive action, kept out of the account menu and behind
          its own dialog (type DELETE + password). The dark: overrides match
          FormError — dark-scope --destructive is a fill shade, unreadable
          as text on black. */}
      <div className="pt-4 border-t border-border/60">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-destructive antialiased dark:text-red-300">
          Danger zone
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5 text-pretty">
          {isCoach
            ? 'Deleting your account ends every client relationship, takes your plans and exercise library with it, and can’t be undone.'
            : 'Deleting your account removes your name and email everywhere. Your coach keeps their history under “Deleted account”. This can’t be undone.'}
        </p>
        <Button
          variant="outline"
          onClick={() => setIsDeleteOpen(true)}
          className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive dark:border-red-400/30 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-300 active:scale-[0.96] transition-transform duration-150"
        >
          <Trash2 className="w-3.5 h-3.5 me-1.5" aria-hidden="true" />
          Delete account…
        </Button>
      </div>

      <DeleteAccountDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        role={user?.role}
      />
    </div>
  );
}

/** Signed-in password change — current password proves it's really them. */
export function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which field the error belongs to — drives aria-invalid and focus, so the
  // fix happens where the mistake is. null = form-level (rate limit, 500).
  const [errorField, setErrorField] = useState<'current' | 'new' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);

  const failField = (field: 'current' | 'new' | null, message: string) => {
    setError(message);
    setErrorField(field);
    if (field === 'current') currentRef.current?.focus();
    if (field === 'new') newRef.current?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorField(null);

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      failField('new', parsed.error.issues[0]?.message ?? 'Pick a stronger password.');
      return;
    }

    setIsSaving(true);
    try {
      await apiFetch('/api/account/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password changed');
    } catch (e) {
      // A 400 is the wrong current password; anything else (429, 500) is
      // the form's problem, not a field's
      failField(
        e instanceof ApiError && e.status === 400 ? 'current' : null,
        e instanceof Error ? e.message : 'Couldn’t change your password.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div>
      <SectionHeader
        title="Password"
        description="Change the password you sign in with. You’ll stay signed in here."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
          <Input
            ref={currentRef}
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            aria-invalid={errorField === 'current' || undefined}
            aria-describedby={errorField === 'current' ? 'settings-password-error' : undefined}
            className={inputClass}
            required
          />
        </div>

        <div className="space-y-2">
          <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
          <Input
            ref={newRef}
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Make it a strong one"
            aria-invalid={errorField === 'new' || undefined}
            aria-describedby={errorField === 'new' ? 'settings-password-error' : undefined}
            className={inputClass}
            required
          />
          {newPassword.length > 0 && <PasswordRules password={newPassword} />}
        </div>

        {error && (
          <div id="settings-password-error">
            <FormError>{error}</FormError>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            disabled={isSaving || !currentPassword || !newPassword}
            className="active:scale-[0.96] transition-transform duration-150"
          >
            {isSaving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
            Change password
          </Button>
        </div>
      </form>
    </div>
  );
}

export function NotificationsSection({ role }: { role: SettingsRole }) {
  return (
    <div>
      <SectionHeader
        title="Alerts"
        description="How the app reaches you when you’re not looking at it."
      />

      {/* Stacked on phones: side-by-side, the toggle's status line would
          squeeze the description into a one-word column */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 sm:flex-1">
          <p className="text-sm font-semibold leading-tight">Message alerts</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 text-pretty">
            {role === 'coach'
              ? 'A push notification on this device when a client messages you.'
              : 'A push notification on this device when your coach messages you.'}{' '}
            Alerts are per device — turn them on wherever you {role === 'coach' ? 'coach' : 'train'} from.
          </p>
        </div>
        <NotificationToggle className="shrink-0 self-start" variant="settings" />
      </div>
    </div>
  );
}
