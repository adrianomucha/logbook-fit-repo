import { useRef, useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { passwordSchema } from '@logbook/shared/validations/schemas';
import { ApiError, apiFetch } from '@/lib/api';
import { PasswordRules } from '@/components/auth/PasswordRules';
import { Group, GroupedScreen, HeaderButton, RowInput } from '@/components/settings/GroupedList';

/**
 * Change Password — two form rows, the live rules under the new one, the
 * error as a group footer at the field it belongs to, Save in the bar.
 * The current password proves it's really them; sessions stay signed in.
 */
export default function PasswordScreen() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<{ field: 'current' | 'new' | null; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const currentRef = useRef<TextInput>(null);
  const newRef = useRef<TextInput>(null);

  const canSave = currentPassword.length > 0 && newPassword.length > 0 && !isSaving;

  const fail = (field: 'current' | 'new' | null, message: string) => {
    setError({ field, message });
    if (field === 'current') currentRef.current?.focus();
    if (field === 'new') newRef.current?.focus();
  };

  const save = async () => {
    if (!canSave) return;
    setError(null);
    const parsed = passwordSchema.safeParse(newPassword);
    if (!parsed.success) {
      fail('new', parsed.error.issues[0]?.message ?? 'Pick a stronger password.');
      return;
    }
    setIsSaving(true);
    try {
      await apiFetch('/api/account/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) });
      Alert.alert('Password changed', 'You’re still signed in here.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (e) {
      // A 400 is the wrong current password; anything else (429, 500) is the form's problem
      fail(e instanceof ApiError && e.status === 400 ? 'current' : null, e instanceof Error ? e.message : 'Couldn’t change your password.');
    } finally {
      setIsSaving(false);
    }
  };

  const errorText = (field: 'current' | 'new' | null) =>
    error && error.field === field ? <Text className="font-sans text-[13px] leading-[18px] text-destructive">{error.message}</Text> : null;

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderButton label="Save" onPress={() => void save()} disabled={!canSave} busy={isSaving} /> }} />
      <GroupedScreen>
        <Group header="Current password" footer={errorText('current') ?? undefined}>
          <RowInput
            ref={currentRef}
            label="Current"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            textContentType="password"
            autoComplete="current-password"
            autoFocus
            returnKeyType="next"
            onSubmitEditing={() => newRef.current?.focus()}
          />
        </Group>

        <Group
          header="New password"
          footer={
            errorText('new') ??
            (newPassword.length > 0 ? <PasswordRules password={newPassword} /> : 'At least 8 characters, with a letter and a number.')
          }
        >
          <RowInput
            ref={newRef}
            label="New"
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Make it a strong one"
            secureTextEntry
            textContentType="newPassword"
            autoComplete="new-password"
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
        </Group>

        {error && error.field === null ? (
          <View className="px-8">
            <Text className="font-sans text-[13px] leading-[18px] text-destructive">{error.message}</Text>
          </View>
        ) : null}
      </GroupedScreen>
    </>
  );
}
