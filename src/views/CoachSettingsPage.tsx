'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Bell, KeyRound, Loader2, UserRound, Wrench, type LucideIcon } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
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

type SettingsSection = 'profile' | 'account' | 'password' | 'notifications';

const SECTIONS: { id: SettingsSection; label: string; icon: LucideIcon }[] = [
  { id: 'profile', label: 'Profile', icon: UserRound },
  { id: 'account', label: 'Account', icon: Wrench },
  { id: 'password', label: 'Password', icon: KeyRound },
  { id: 'notifications', label: 'Alerts', icon: Bell },
];

const cardClass =
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
        description="How clients see you — on invites and around the app."
      />

      <div className="space-y-5">
        <div className="space-y-2">
          <FieldLabel htmlFor="settings-name">Name</FieldLabel>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'w-11 h-11 rounded-full flex items-center justify-center select-none text-base font-bold shrink-0',
                avatarColor(previewName)
              )}
              aria-hidden="true"
            >
              {previewName.charAt(0).toUpperCase()}
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
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <FieldLabel htmlFor="settings-bio">Bio</FieldLabel>
            {bio.length > 0 && (
              <span
                className={cn(
                  'font-mono text-[10px] tracking-[0.08em] tabular-nums',
                  bio.length >= BIO_MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground'
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
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            What an invited client sees
          </p>
          <p className="text-base font-black uppercase tracking-tight antialiased">
            {previewName} is expecting you
          </p>
          {bio.trim() && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-1 text-pretty">
              {bio.trim()}
            </p>
          )}
        </div>

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

/** Read-only account facts: email, timezone, membership date. */
function AccountSection() {
  const { user } = useCurrentUser();

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: 'Email', value: user?.email ?? '—', hint: 'The address you sign in with.' },
    {
      label: 'Timezone',
      value: user?.timezone ?? 'UTC',
      hint: 'Detected from your browser — check-in schedules follow it automatically, even when you travel.',
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
    </div>
  );
}

/** Signed-in password change — current password proves it's really them. */
function PasswordSection() {
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

function NotificationsSection() {
  return (
    <div>
      <SectionHeader
        title="Alerts"
        description="How the app reaches you when you’re not looking at it."
      />

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Message alerts</p>
          <p className="text-xs text-muted-foreground leading-relaxed mt-1 text-pretty">
            A push notification on this device when a client messages you.
            Alerts are per device — turn them on wherever you coach from.
          </p>
        </div>
        <NotificationToggle className="shrink-0" showUnavailable />
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
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="settings" />

      {/* Narrower measure than the roster pages: the rail plus one form
          column is all this page is, and centering it keeps a wide screen
          balanced instead of stranding the content on the left */}
      <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
        <div className="animate-enter mb-1.5 sm:mb-3">
          <PageHeader
            title="Settings"
            subtitle="Your account · How clients see you"
            breadcrumb={{ label: 'Dashboard', onClick: () => router.push('/coach') }}
          />
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-5 lg:gap-8 animate-enter">
          {/* Section rail: underline tabs on mobile (the nav's idiom), a
              side-rail list on desktop. Same voice as the header tabs. */}
          <nav aria-label="Settings sections" className="lg:w-44 shrink-0">
            <ul
              className={cn(
                'flex gap-5 overflow-x-auto scrollbar-hide -mx-3 px-3 border-b border-border',
                'lg:flex-col lg:gap-1 lg:overflow-visible lg:mx-0 lg:px-0 lg:border-b-0'
              )}
            >
              {SECTIONS.map(({ id, label, icon: Icon }) => (
                <li key={id} className="shrink-0">
                  {/* Real links: the sections are deep-linkable URLs, so they
                      earn cmd-click and copy-link for free */}
                  <Link
                    href={`/coach/settings?section=${id}`}
                    replace
                    scroll={false}
                    aria-current={section === id ? 'page' : undefined}
                    className={cn(
                      'inline-flex w-full items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em]',
                      'transition-colors touch-manipulation tap-target focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      'border-b-2 px-0.5 pb-2.5 pt-1',
                      'lg:border-b-0 lg:border-s-2 lg:px-3 lg:py-2',
                      section === id
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <main className="flex-1 min-w-0">
            {isLoading || !user ? (
              <div className="flex items-center justify-center py-12" role="status">
                <Loader2
                  className="w-6 h-6 animate-spin text-muted-foreground"
                  aria-hidden="true"
                />
                <span className="sr-only">Loading settings</span>
              </div>
            ) : (
              // The page wrapper already animates in once; section switches
              // swap instantly — repeated interactions get instant feedback
              <div className={cardClass}>
                <Pane />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
