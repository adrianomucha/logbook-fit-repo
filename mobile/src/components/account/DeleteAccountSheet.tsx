import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { ApiError, apiFetch } from '@/lib/api';
import { Button, Eyebrow } from '@/components/ui';

/**
 * "Delete account" — the web's DeleteAccountDialog. The password is the
 * confirmation; on success the caller ends the session.
 */
export function DeleteAccountSheet({ visible, onClose, role, onDeleted }: { visible: boolean; onClose: () => void; role: 'COACH' | 'CLIENT'; onDeleted: () => Promise<void> }) {
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setPassword('');
    setIsDeleting(false);
    setError(null);
  }, [visible]);

  const remove = async () => {
    if (!password || isDeleting) return;
    setIsDeleting(true);
    setError(null);
    try {
      await apiFetch('/api/me', { method: 'DELETE', body: JSON.stringify({ password }) });
      await onDeleted();
    } catch (e) {
      setError(e instanceof ApiError && (e.status === 403 || e.status === 429) ? e.message : 'Couldn’t delete the account. Nothing was changed — try again.');
      setIsDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View className="flex-1 px-5" style={{ paddingTop: 20, paddingBottom: insets.bottom + 16 }}>
          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-sans-bold text-lg tracking-tight text-foreground">Delete your account</Text>
            <Pressable onPress={onClose} hitSlop={12} disabled={isDeleting}>
              <Feather name="x" size={20} color="#737373" />
            </Pressable>
          </View>
          <Text className="mb-5 font-sans text-sm text-muted-foreground">This can’t be undone. Confirm with your password.</Text>

          <View className="gap-2">
            <Text className="font-sans text-sm leading-5 text-muted-foreground">You’ll be signed out everywhere and won’t be able to sign in again.</Text>
            <Text className="font-sans text-sm leading-5 text-muted-foreground">
              {role === 'COACH'
                ? 'Your clients lose their assigned plans and the chat with you, and any open invite links stop working. Your plans and exercise library go with the account.'
                : 'Your coach loses their plan assignment and the chat with you. Your name and email are removed; the workouts and check-ins you completed stay in your coach’s history under “Deleted account”.'}
            </Text>
          </View>

          <View className="mt-5">
            <Eyebrow className="mb-2">Your password</Eyebrow>
            <TextInput
              className="h-12 rounded-lg border border-input bg-background px-3.5 font-sans text-base text-foreground"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="password"
              autoComplete="current-password"
              autoFocus
              editable={!isDeleting}
            />
          </View>
          {error ? <Text className="mt-3 font-sans text-sm text-destructive">{error}</Text> : null}

          <View className="mt-6 flex-row items-center justify-end gap-2">
            <Button variant="ghost" className="h-11 px-4" onPress={onClose} disabled={isDeleting}>Keep my account</Button>
            <Pressable
              onPress={remove}
              disabled={isDeleting || !password}
              accessibilityRole="button"
              className={`h-11 flex-row items-center justify-center gap-2 rounded-xl bg-destructive px-5 active:opacity-80 ${isDeleting || !password ? 'opacity-60' : ''}`}
            >
              <Feather name="trash-2" size={16} color="#fafafa" />
              <Text className="font-sans-bold text-sm uppercase tracking-[0.7px] text-destructive-foreground">Delete account</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
