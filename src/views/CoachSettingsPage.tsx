'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { CoachNav } from '@/components/coach/CoachNav';
import { PageHeader } from '@/components/coach/PageHeader';
import { NotificationToggle } from '@/components/notifications/NotificationToggle';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { FormError } from '@/components/ui/form-error';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { apiFetch } from '@/lib/api-client';
import { avatarColor } from '@/lib/avatar-colors';
import { passwordSchema, BIO_MAX_LENGTH } from '@/lib/validations/schemas';
import { cn } from '@/lib/utils';

const cardClass =
  'bg-card rounded-xl p-4 sm:p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_2px_8px_rgba(0,0,0,0.03),0_0_0_1px_rgba(0,0,0,0.04)] animate-enter';

/** Uppercase tracked mono label — the product's data voice */
function FieldLabel({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased"
    >
      {children}
    </label>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-mono text-[11px] uppercase tracking-[0.15em] font-semibold text-muted-foreground mb-4 antialiased">
      {children}
    </h2>
  );
}

const inputClass =
  'h-11 rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background';

/**
 * Profile section: name + bio, with a live preview of the invite signup
 * hero — the one place a client sees this before they commit.
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
    <section className={cardClass}>
      <SectionTitle>Profile</SectionTitle>
      <div className="space-y-4">
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
          <div className="flex-1 space-y-2">
            <FieldLabel htmlFor="settings-name">Name</FieldLabel>
            <Input
              id="settings-name"
              type="text"
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
                  'font-mono text-[10px] tracking-[0.08em]',
                  bio.length > BIO_MAX_LENGTH ? 'text-destructive' : 'text-muted-foreground/70'
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
            placeholder="A line or two about how you coach — new clients read this before signing up"
            maxLength={BIO_MAX_LENGTH}
            rows={3}
            className="rounded-lg border-border/60 bg-secondary/50 px-3.5 transition-colors focus-visible:bg-background resize-none"
          />
        </div>

        {/* Mirrors the invite signup hero, so "save" is never a leap of faith */}
        <div className="ps-3.5 border-s-2 border-brand">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-0.5">
            What an invited client sees
          </p>
          <p className="text-sm font-bold uppercase tracking-tight antialiased">
            {previewName} is expecting you
          </p>
          {bio.trim() && (
            <p className="text-sm text-muted-foreground leading-relaxed mt-1 text-pretty">
              {bio.trim()}
            </p>
          )}
        </div>

        <div className="flex justify-end">
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
    </section>
  );
}

/** Read-only account facts: email, timezone, membership date. */
function AccountSection() {
  const { user } = useCurrentUser();

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: 'Email', value: user?.email ?? '—' },
    {
      label: 'Timezone',
      value: user?.timezone ?? 'UTC',
      hint: 'Detected from your browser — check-in schedules follow it automatically',
    },
    {
      label: 'Member since',
      value: user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—',
    },
  ];

  return (
    <section className={cardClass}>
      <SectionTitle>Account</SectionTitle>
      <dl className="space-y-3.5">
        {rows.map(({ label, value, hint }) => (
          <div key={label}>
            <dt className="font-mono text-[10px] uppercase tracking-[0.14em] font-medium text-muted-foreground antialiased">
              {label}
            </dt>
            <dd className="text-sm text-foreground mt-0.5 break-all">{value}</dd>
            {hint && (
              <dd className="text-xs text-muted-foreground mt-0.5 text-pretty">{hint}</dd>
            )}
          </div>
        ))}
      </dl>
    </section>
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
    <section className={cardClass}>
      <SectionTitle>Password</SectionTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <FieldLabel htmlFor="settings-current-password">Current password</FieldLabel>
          <Input
            id="settings-current-password"
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
            required
          />
        </div>
        <div className="space-y-2">
          <FieldLabel htmlFor="settings-new-password">New password</FieldLabel>
          <Input
            id="settings-new-password"
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Make it a strong one"
            className={inputClass}
            required
          />
          {newPassword.length > 0 && <PasswordRules password={newPassword} />}
        </div>

        {error && <FormError>{error}</FormError>}

        <div className="flex justify-end">
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
    </section>
  );
}

function NotificationsSection() {
  return (
    <section className={cardClass}>
      <SectionTitle>Notifications</SectionTitle>
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground leading-relaxed text-pretty">
          Get a push notification on this device when a client messages you.
          Alerts are per device — turn them on wherever you coach from.
        </p>
        <NotificationToggle className="shrink-0" />
      </div>
    </section>
  );
}

export function CoachSettingsPage() {
  const router = useRouter();
  const { user, isLoading } = useCurrentUser();

  return (
    <div className="min-h-dvh bg-background pb-24 sm:pb-4">
      <CoachNav activeTab="settings" />

      <div className="max-w-2xl mx-auto space-y-4 sm:space-y-6 px-3 pt-3 sm:px-4 sm:pt-7">
        <div className="animate-enter mb-1.5 sm:mb-3">
          <PageHeader
            title="Settings"
            subtitle="Your profile and account"
            breadcrumb={{ label: 'Dashboard', onClick: () => router.push('/coach') }}
          />
        </div>

        {isLoading || !user ? (
          <div className="flex items-center justify-center py-12 animate-enter">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <ProfileSection />
            <AccountSection />
            <PasswordSection />
            <NotificationsSection />
          </>
        )}
      </div>
    </div>
  );
}
