import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { useSWRConfig } from 'swr';
import { passwordSchema } from '@logbook/shared/validations/schemas';
import { WEIGHT_UNITS, WEIGHT_UNIT_SETTING, weightUnitLabel, type WeightUnit } from '@logbook/shared/weight-units';
import { LEAVE_COACH_COPY } from '@logbook/shared/leave-coach';
import { SETTINGS_FIELD_COPY, SETTINGS_SECTION_COPY, type SettingsSectionId } from '@logbook/shared/settings-sections';
import { ApiError, apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { AVATAR_MAX_BYTES, removeAvatar, uploadAvatar } from '@/lib/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UserAvatar } from '@/components/UserAvatar';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { NotificationPreferenceTile } from '@/components/notifications/NotificationPreferenceTile';
import { DeleteAccountSheet } from '@/components/account/DeleteAccountSheet';

/**
 * The settings panes — the web's components/settings/sections.tsx for the
 * client role. Same three panes, same endpoints; the screen owns the chrome.
 * Which tabs exist and what they say lives in @logbook/shared/settings-sections.
 */

export {
  SETTINGS_SECTIONS,
  resolveSettingsSection,
  type SettingsSectionId,
} from '@logbook/shared/settings-sections';

const inputClass = 'h-11 rounded-lg border border-border/60 bg-secondary/50 px-3.5 font-sans text-base text-foreground';

/** Uppercase tracked mono label — the product's data voice */
function FieldLabel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`font-mono-medium text-[10px] uppercase tracking-[1.4px] text-muted-foreground ${className}`}>{children}</Text>
  );
}

/** Muted helper line under a field. */
function FieldHint({ children }: { children: ReactNode }) {
  return <Text className="font-sans text-xs leading-5 text-muted-foreground">{children}</Text>;
}

/** Pane heading: bold title + one muted sentence, over a hairline. */
function SectionHeader({ section }: { section: SettingsSectionId }) {
  const { title, description: descriptions } = SETTINGS_SECTION_COPY[section];
  const description = descriptions.client;
  return (
    <View className="mb-5">
      <Text className="font-sans-bold text-lg tracking-tight text-foreground">{title}</Text>
      <Text className="mt-0.5 font-sans text-sm text-muted-foreground">{description}</Text>
      <View className="mt-4 h-px bg-border" />
    </View>
  );
}

/** The primary action at the foot of a pane — the web's default Button, size sm. */
function SaveButton({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  const off = disabled || busy;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      className={`h-11 flex-row items-center justify-center gap-1.5 rounded-lg bg-primary px-5 active:scale-[0.96] ${off ? 'opacity-50' : ''}`}
    >
      {busy ? <ActivityIndicator size="small" color="#fafafa" /> : null}
      <Text className="font-sans-semibold text-sm text-primary-foreground">{label}</Text>
    </Pressable>
  );
}

/**
 * The web toasts its confirmations; here a mono status line beside the
 * button says it, and fades after a moment.
 */
function useFlash(): [string | null, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const flash = (next: string) => {
    setMessage(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 2500);
  };
  return [message, flash];
}

function Flash({ message }: { message: string | null }) {
  if (!message) return <View className="flex-1" />;
  return (
    <View className="flex-1 flex-row items-center gap-1.5" accessibilityLiveRegion="polite">
      <Feather name="check" size={12} color="#157f3c" />
      <Text className="font-mono-medium text-[10px] uppercase tracking-[1.4px] text-success-text">{message}</Text>
    </View>
  );
}

/** Profile pane: photo + name. */
export function ProfileSection() {
  const { user, refresh } = useCurrentUser();
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSeeded, setIsSeeded] = useState(false);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const [flash, setFlash] = useFlash();
  const avatarUrl = user?.avatarUrl ?? null;

  // Seed the form once the profile arrives; never clobber in-progress edits
  // on background revalidation.
  useEffect(() => {
    if (user && !isSeeded) {
      setName(user.name ?? '');
      setIsSeeded(true);
    }
  }, [user, isSeeded]);

  const savedName = user?.name ?? '';
  const isDirty = name.trim() !== savedName;

  const pickPhoto = async () => {
    if (isPhotoBusy) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access is off', 'Allow Logbook to access your photos in iOS Settings to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    if (asset.fileSize != null && asset.fileSize > AVATAR_MAX_BYTES) {
      Alert.alert('Choose an image under 4MB');
      return;
    }
    setIsPhotoBusy(true);
    try {
      await uploadAvatar(asset.uri);
      await refresh();
      setFlash('Photo updated');
    } catch (e) {
      Alert.alert("Couldn't upload the photo", e instanceof Error ? e.message : undefined);
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const handlePhotoRemove = async () => {
    if (isPhotoBusy) return;
    setIsPhotoBusy(true);
    try {
      await removeAvatar();
      await refresh();
      setFlash('Photo removed');
    } catch (e) {
      Alert.alert("Couldn't remove the photo", e instanceof Error ? e.message : undefined);
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Name is required');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch('/api/account/profile', { method: 'PUT', body: JSON.stringify({ name: name.trim() }) });
      await refresh();
      setFlash('Profile saved');
    } catch (e) {
      Alert.alert("Couldn't save your profile", e instanceof Error ? e.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View>
      <SectionHeader section="profile" />

      <View className="gap-5">
        <View className="gap-2">
          <FieldLabel>Photo & name</FieldLabel>
          <View className="flex-row items-center gap-3">
            <View className="relative">
              <Pressable
                onPress={() => void pickPhoto()}
                disabled={isPhotoBusy}
                accessibilityRole="button"
                accessibilityLabel={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
                className="overflow-hidden rounded-full active:scale-[0.96]"
              >
                <UserAvatar name={name.trim() || savedName || 'You'} avatarUrl={avatarUrl} size={44} textSize={16} />
                {isPhotoBusy ? (
                  <View className="absolute inset-0 items-center justify-center rounded-full bg-background/70">
                    <ActivityIndicator size="small" color="#0a0a0a" />
                  </View>
                ) : null}
              </Pressable>
              <View
                pointerEvents="none"
                className="absolute -bottom-0.5 -right-0.5 h-4 w-4 items-center justify-center rounded-full border-2 border-card bg-foreground"
              >
                <Feather name="camera" size={9} color="#ffffff" />
              </View>
            </View>
            <TextInput
              className={`flex-1 ${inputClass}`}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor="#737373"
              autoComplete="name"
              textContentType="name"
              maxLength={100}
              accessibilityLabel="Name"
            />
          </View>
          <View className="flex-row items-baseline justify-between gap-2">
            <FieldHint>JPG, PNG, or WebP, up to 4MB.</FieldHint>
            {avatarUrl ? (
              <Pressable onPress={() => void handlePhotoRemove()} disabled={isPhotoBusy} hitSlop={8} className="min-h-[32px] justify-center">
                <Text className="font-sans text-xs text-muted-foreground">Remove photo</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <View className="flex-row items-center justify-end gap-3 pt-1">
          <Flash message={flash} />
          <SaveButton label="Save profile" onPress={() => void handleSave()} disabled={!isDirty || !name.trim()} busy={isSaving} />
        </View>
      </View>
    </View>
  );
}

/**
 * kg / lb segmented switch — the web's WeightUnitField. Saves on tap and
 * paints the new unit optimistically.
 */
function WeightUnitField() {
  const { user, weightUnit, refresh } = useCurrentUser();
  const [isSaving, setIsSaving] = useState(false);
  const [flash, setFlash] = useFlash();

  const handleChange = async (next: WeightUnit) => {
    if (!user || next === weightUnit || isSaving) return;
    setIsSaving(true);
    try {
      await refresh(
        async () => {
          await apiFetch('/api/account/weight-unit', { method: 'PUT', body: JSON.stringify({ weightUnit: next }) });
          return { ...user, weightUnit: next };
        },
        { optimisticData: { ...user, weightUnit: next }, rollbackOnError: true }
      );
      setFlash(WEIGHT_UNIT_SETTING.saved(next));
    } catch (e) {
      Alert.alert("Couldn't change the unit", e instanceof Error ? e.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View className="gap-2 py-3.5">
      <FieldLabel>{WEIGHT_UNIT_SETTING.label}</FieldLabel>
      <View className="flex-row items-center gap-3">
        <View accessibilityRole="radiogroup" accessibilityLabel={WEIGHT_UNIT_SETTING.label} className="h-10 w-40 flex-row gap-1 rounded-xl bg-muted/60 p-1">
          {WEIGHT_UNITS.map((unit) => {
            const active = weightUnit === unit;
            return (
              <Pressable
                key={unit}
                accessibilityRole="radio"
                accessibilityState={{ checked: active, disabled: isSaving }}
                disabled={isSaving}
                onPress={() => void handleChange(unit)}
                className={`flex-1 items-center justify-center rounded-lg ${active ? 'border border-border bg-card' : ''}`}
              >
                <Text className={`font-mono-medium text-[11px] uppercase tracking-[1.3px] ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {weightUnitLabel(unit)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Flash message={flash} />
      </View>
      <FieldHint>{WEIGHT_UNIT_SETTING.hint.client}</FieldHint>
    </View>
  );
}

/** One read-only fact: mono label, the value, an optional hint. */
function FactRow({ label, value, hint, className = '' }: { label: string; value: string; hint?: string; className?: string }) {
  return (
    <View className={`py-3.5 ${className}`}>
      <FieldLabel>{label}</FieldLabel>
      <Text className="mt-1 font-sans-medium text-sm text-foreground">{value}</Text>
      {hint ? (
        <View className="mt-1">
          <FieldHint>{hint}</FieldHint>
        </View>
      ) : null}
    </View>
  );
}

/** How the app works for this person: alerts, weight unit, timezone. */
export function PreferencesSection() {
  const { user } = useCurrentUser();

  return (
    <View>
      <SectionHeader section="preferences" />

      <NotificationPreferenceTile />

      <View className="mt-2">
        <WeightUnitField />
        <View className="border-t border-border/60">
          <FactRow
            label={SETTINGS_FIELD_COPY.timezone.label}
            value={user?.timezone ?? 'UTC'}
            hint={SETTINGS_FIELD_COPY.timezone.hint.client}
          />
        </View>
      </View>
    </View>
  );
}

/**
 * Signed-in password change — current password proves it's really them.
 * Folded behind a button so the Account pane reads as facts first.
 */
function PasswordField() {
  const copy = SETTINGS_FIELD_COPY.password;
  const [isOpen, setIsOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  // Which field the error belongs to — drives focus, so the fix happens
  // where the mistake is. null = form-level (rate limit, 500).
  const [errorField, setErrorField] = useState<'current' | 'new' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [flash, setFlash] = useFlash();
  const currentRef = useRef<TextInput>(null);
  const newRef = useRef<TextInput>(null);

  const close = () => {
    setIsOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setError(null);
    setErrorField(null);
  };

  const failField = (field: 'current' | 'new' | null, message: string) => {
    setError(message);
    setErrorField(field);
    if (field === 'current') currentRef.current?.focus();
    if (field === 'new') newRef.current?.focus();
  };

  const handleSubmit = async () => {
    if (isSaving || !currentPassword || !newPassword) return;
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
      close();
      setFlash(copy.saved);
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

  if (!isOpen) {
    return (
      <View className="border-t border-border/60 py-3.5">
        <FieldLabel>{copy.label}</FieldLabel>
        <View className="mt-1 flex-row items-center gap-3">
          {flash ? (
            <Flash message={flash} />
          ) : (
            <Text className="flex-1 font-sans-medium text-sm tracking-[3px] text-foreground" accessibilityElementsHidden importantForAccessibility="no">
              ••••••••
            </Text>
          )}
          <Pressable
            onPress={() => setIsOpen(true)}
            accessibilityRole="button"
            className="h-9 items-center justify-center rounded-md border border-border bg-background px-3 active:scale-[0.96]"
          >
            <Text className="font-sans-medium text-sm text-foreground">{copy.open}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4 border-t border-border/60 py-3.5">
      <View className="gap-1">
        <FieldLabel>{copy.open}</FieldLabel>
        <FieldHint>{copy.hint}</FieldHint>
      </View>

      <View className="gap-2">
        <FieldLabel>Current password</FieldLabel>
        <TextInput
          ref={currentRef}
          autoFocus
          className={`${inputClass} ${errorField === 'current' ? 'border-destructive' : ''}`}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          textContentType="password"
          autoComplete="current-password"
          accessibilityLabel="Current password"
          returnKeyType="next"
          onSubmitEditing={() => newRef.current?.focus()}
        />
      </View>

      <View className="gap-2">
        <FieldLabel>New password</FieldLabel>
        <TextInput
          ref={newRef}
          className={`${inputClass} ${errorField === 'new' ? 'border-destructive' : ''}`}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Make it a strong one"
          placeholderTextColor="#737373"
          secureTextEntry
          textContentType="newPassword"
          autoComplete="new-password"
          accessibilityLabel="New password"
          returnKeyType="done"
          onSubmitEditing={() => void handleSubmit()}
        />
        {newPassword.length > 0 ? <PasswordRules password={newPassword} /> : null}
      </View>

      {error ? (
        <View className="flex-row items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5">
          <Feather name="alert-triangle" size={14} color="#c52020" style={{ marginTop: 2 }} />
          <Text className="flex-1 font-sans text-sm text-destructive">{error}</Text>
        </View>
      ) : null}

      <View className="flex-row items-center justify-end gap-2 pt-1">
        <Pressable
          onPress={close}
          disabled={isSaving}
          accessibilityRole="button"
          className={`h-11 items-center justify-center rounded-lg px-4 active:scale-[0.96] ${isSaving ? 'opacity-50' : ''}`}
        >
          <Text className="font-sans-medium text-sm text-foreground">{copy.cancel}</Text>
        </Pressable>
        <SaveButton label={copy.submit} onPress={() => void handleSubmit()} disabled={!currentPassword || !newPassword} busy={isSaving} />
      </View>
    </View>
  );
}

/** How they sign in — email and password — and the one destructive action. */
export function AccountSection() {
  const { user } = useCurrentUser();
  const { signOut } = useAuth();
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  return (
    <View>
      <SectionHeader section="account" />

      <FactRow
        label={SETTINGS_FIELD_COPY.email.label}
        value={user?.email ?? '—'}
        hint={SETTINGS_FIELD_COPY.email.hint}
        className="pt-0"
      />

      <PasswordField />

      <View className="border-t border-border/60">
        <FactRow
          label={SETTINGS_FIELD_COPY.memberSince.label}
          value={user?.createdAt ? format(new Date(user.createdAt), 'MMMM yyyy') : '—'}
        />
      </View>

      <CoachingRow />

      {/* The one destructive action, behind its own sheet (type DELETE + password) */}
      <View className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <View className="flex-row items-center gap-1.5">
          <Feather name="alert-triangle" size={12} color="#c52020" />
          <Text className="font-mono-medium text-[10px] uppercase tracking-[1.4px] text-destructive">Danger zone</Text>
        </View>
        <Text className="mt-1.5 font-sans text-xs leading-5 text-muted-foreground">
          Deleting your account removes your name and email everywhere. Your coach keeps their history under “Deleted account”. This can’t be undone.
        </Text>
        <Pressable
          onPress={() => setIsDeleteOpen(true)}
          accessibilityRole="button"
          className="mt-3 h-11 flex-row items-center justify-center gap-1.5 self-start rounded-lg border border-destructive/40 bg-background px-4 active:scale-[0.96]"
        >
          <Feather name="trash-2" size={14} color="#c52020" />
          <Text className="font-sans-semibold text-sm text-destructive">Delete account…</Text>
        </Pressable>
      </View>

      <DeleteAccountSheet
        visible={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        role={user?.role ?? 'CLIENT'}
        onDeleted={async () => {
          setIsDeleteOpen(false);
          await signOut();
        }}
      />
    </View>
  );
}

/**
 * The client's coaching relationship and the way out of it — the web's
 * CoachingRow. Here rather than on the Progress tab, whose job is the
 * client's training record.
 */
function CoachingRow() {
  const { coach } = useCurrentUser();
  const { mutate } = useSWRConfig();
  if (!coach) return null;

  const leave = () => {
    Alert.alert(LEAVE_COACH_COPY.title, `${LEAVE_COACH_COPY.message(coach.user.name)} ${LEAVE_COACH_COPY.warning}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: LEAVE_COACH_COPY.confirm,
        style: 'destructive',
        onPress: async () => {
          try {
            await apiFetch('/api/client/coach', { method: 'DELETE' });
            // Refetch the profile — this row disappears and the app drops to the no-coach state
            await mutate('/api/me');
          } catch {
            Alert.alert(LEAVE_COACH_COPY.failedTitle, LEAVE_COACH_COPY.failed);
          }
        },
      },
    ]);
  };

  return (
    <View className="flex-row items-start justify-between gap-4 border-t border-border/60 py-3.5">
      <View className="flex-1">
        <FieldLabel>{LEAVE_COACH_COPY.sectionLabel}</FieldLabel>
        <Text className="mt-1 font-sans-medium text-sm text-foreground" numberOfLines={1}>{LEAVE_COACH_COPY.coachedBy(coach.user.name)}</Text>
        <View className="mt-1">
          <FieldHint>{LEAVE_COACH_COPY.hint}</FieldHint>
        </View>
      </View>
      <Pressable
        onPress={leave}
        accessibilityRole="button"
        className="min-h-[36px] flex-row items-center gap-1.5 rounded-lg border border-border px-3 active:opacity-70"
      >
        <Feather name="user-minus" size={14} color="#737373" />
        <Text className="font-sans-medium text-sm text-muted-foreground">{LEAVE_COACH_COPY.action}</Text>
      </Pressable>
    </View>
  );
}
