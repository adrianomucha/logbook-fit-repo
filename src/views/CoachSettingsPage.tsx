'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Bell, KeyRound, Loader2, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { FormError } from '@/components/ui/form-error';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch } from '@/lib/api-client';
import { avatarColor } from '@/lib/avatar-colors';
import { passwordSchema, BIO_MAX_LENGTH } from '@/lib/validations/schemas';
import { cn } from '@/lib/utils';

type SettingsSection = 'profile' | 'account' | 'password' | 'notifications';

const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'account', label: 'Account', icon: Wrench },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'notifications', label: 'Notifications', icon: Bell },
];

function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium leading-none">
      {children}
    </label>
  );
}

/** Muted helper line under a field — the layout's explanatory voice. */
function FieldHint({ children }: { children: React.ReactNode }) {
  return <p className="text-[0.8rem] text-muted-foreground text-pretty">{children}</p>;
}

/** Section heading + description + rule, shared by every pane. */
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Separator />
    </div>
  );
}

/**
 * Profile pane: name + bio, with a live preview of the invite signup hero —
 * the one place a client sees this before they commit.
 */
function ProfileSection() {
  const { user, refresh } = useCurrentUser();
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);

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
  const isDirty = name.trim() !== savedName || bio.trim() !== savedBio;
  const previewName = name.trim() || 'Your coach';

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch('/api/account/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() }),
      });
      await refresh();
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Couldn’t save your profile.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Profile"
        description="This is how clients see you on invites and around the app."
      />

      <div className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="settings-name">Name</Label>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center select-none text-sm font-bold shrink-0',
                avatarColor(previewName)
              )}
              aria-hidden="true"
            >
              {previewName.charAt(0).toUpperCase()}
            </div>
            <Input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              maxLength={100}
            />
          </div>
          <FieldHint>
            Your public display name — it headlines every invite you send.
          </FieldHint>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-bio">Bio</Label>
          <Textarea
            id="settings-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="A line or two about how you coach"
            maxLength={BIO_MAX_LENGTH}
            rows={3}
            className="resize-none"
          />
          <div className="flex items-baseline justify-between gap-2">
            <FieldHint>New clients read this on the invite signup page.</FieldHint>
            {bio.length > 0 && (
              <span className="text-[0.8rem] tabular-nums text-muted-foreground shrink-0">
                {bio.length}/{BIO_MAX_LENGTH}
              </span>
            )}
          </div>
        </div>

        {/* Mirrors the invite signup hero, so "save" is never a leap of faith */}
        <div className="space-y-2">
          <Label>Invite preview</Label>
          <div className="rounded-lg border border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-1">
              Your coach
            </p>
            <p className="text-base font-black uppercase tracking-tight antialiased">
              {previewName} is expecting you
            </p>
            {bio.trim() && (
              <p className="text-sm text-muted-foreground leading-relaxed mt-1.5 text-pretty">
                {bio.trim()}
              </p>
            )}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={!isDirty || isSaving || !name.trim()}
          className="active:scale-[0.96] transition-transform duration-150"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
          Update profile
        </Button>
      </div>
    </div>
  );
}

/** Read-only account facts: email, timezone, membership date. */
function AccountSection() {
  const { user } = useCurrentUser();

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Account"
        description="The basics behind your login. These update on their own."
      />

      <div className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="settings-email">Email</Label>
          <Input id="settings-email" type="email" value={user?.email ?? ''} readOnly disabled />
          <FieldHint>The address you sign in with.</FieldHint>
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-timezone">Timezone</Label>
          <Input id="settings-timezone" type="text" value={user?.timezone ?? 'UTC'} readOnly disabled />
          <FieldHint>
            Detected from your browser — check-in schedules follow it automatically,
            even when you travel.
          </FieldHint>
        </div>

        <div className="space-y-2">
          <Label>Member since</Label>
          <p className="text-sm text-muted-foreground">
            {user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Signed-in password change — current password proves it's really them. */
function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Pick a stronger password.');
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
      setError(e instanceof Error ? e.message : 'Couldn’t change your password.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Password"
        description="Change the password you sign in with. You'll stay signed in on this device."
      />

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-2">
          <Label htmlFor="settings-current-password">Current password</Label>
          <Input
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="settings-new-password">New password</Label>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Make it a strong one"
            required
          />
          {newPassword.length > 0 && <PasswordRules password={newPassword} />}
        </div>

        {error && <FormError>{error}</FormError>}

        <Button
          type="submit"
          disabled={isSaving || !currentPassword || !newPassword}
          className="active:scale-[0.96] transition-transform duration-150"
        >
          {isSaving && <Loader2 className="w-3.5 h-3.5 me-1.5 animate-spin" />}
          Change password
        </Button>
      </form>
    </div>
  );
}

function NotificationsSection() {
  return (
    <div className="space-y-6">
      <SectionHeader
        title="Notifications"
        description="Decide how the app reaches you when you're not looking at it."
      />

      <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium leading-none">Message alerts</p>
          <FieldHint>
            A push notification on this device when a client messages you.
            Alerts are per device — turn them on wherever you coach from.
          </FieldHint>
        </div>
        <NotificationToggle className="shrink-0" />
      </div>
    </div>
  );
}

const SECTION_PANES: Record<SettingsSection, () => React.JSX.Element> = {
  profile: ProfileSection,
  account: AccountSection,
  password: PasswordSection,
  notifications: NotificationsSection,
};

export function CoachSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoading } = useCurrentUser();

  const requested = searchParams?.get('section');
  const section: SettingsSection = SECTIONS.some((s) => s.id === requested)
    ? (requested as SettingsSection)
    : 'profile';

  const Pane = SECTION_PANES[section];

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-10">
      <CoachNav activeTab="settings" />

      <div className="max-w-5xl mx-auto px-4 pt-5 sm:pt-8 space-y-6 animate-enter">
        <div className="space-y-0.5">
          <h1 className="text-2xl font-bold tracking-tight antialiased">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account and how clients see you.
          </p>
        </div>

        <Separator />

        <div className="flex flex-col gap-6 lg:flex-row lg:gap-12">
          {/* Sidebar collapses to a scrollable row on small screens */}
          <nav
            aria-label="Settings sections"
            className="-mx-4 px-4 lg:mx-0 lg:px-0 lg:w-1/5 lg:shrink-0"
          >
            <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  <button
                    onClick={() =>
                      router.replace(`/coach/settings?section=${id}`, { scroll: false })
                    }
                    aria-current={section === id ? 'page' : undefined}
                    className={cn(
                      'inline-flex w-full items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium',
                      'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 touch-manipulation',
                      section === id
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                    {label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <main className="flex-1 lg:max-w-2xl">
            {isLoading || !user ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Pane />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
