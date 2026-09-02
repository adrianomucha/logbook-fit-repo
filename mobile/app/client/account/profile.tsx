import { useEffect, useState } from 'react';
import { ActionSheetIOS, ActivityIndicator, Alert, Platform, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { apiFetch } from '@/lib/api';
import { AVATAR_MAX_BYTES, removeAvatar, uploadAvatar } from '@/lib/avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { UserAvatar } from '@/components/UserAvatar';
import { Group, GroupedScreen, HeaderButton, RowInput } from '@/components/settings/GroupedList';

/**
 * Edit Profile — the Contacts idiom: the photo large and centred with its
 * actions beneath, the name in a form row, Save in the navigation bar.
 */
export default function ProfileScreen() {
  const router = useRouter();
  const { user, refresh } = useCurrentUser();
  const [name, setName] = useState('');
  const [isSeeded, setIsSeeded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPhotoBusy, setIsPhotoBusy] = useState(false);
  const avatarUrl = user?.avatarUrl ?? null;

  // Seed once the profile arrives; never clobber in-progress edits on revalidation
  useEffect(() => {
    if (user && !isSeeded) {
      setName(user.name ?? '');
      setIsSeeded(true);
    }
  }, [user, isSeeded]);

  const savedName = user?.name ?? '';
  const isDirty = name.trim() !== savedName;
  const canSave = isDirty && name.trim().length > 0 && !isSaving;

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photos access is off', 'Allow Logbook to access your photos in iOS Settings to add a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
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
    } catch (e) {
      Alert.alert('Couldn’t upload the photo', e instanceof Error ? e.message : undefined);
    } finally {
      setIsPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    setIsPhotoBusy(true);
    try {
      await removeAvatar();
      await refresh();
    } catch (e) {
      Alert.alert('Couldn’t remove the photo', e instanceof Error ? e.message : undefined);
    } finally {
      setIsPhotoBusy(false);
    }
  };

  // The photo's actions as an action sheet — the native choice for a
  // "which of these" on a single object; the destructive one is marked
  const changePhoto = () => {
    if (isPhotoBusy) return;
    if (Platform.OS === 'ios') {
      const options = avatarUrl ? ['Choose from Library', 'Remove Photo', 'Cancel'] : ['Choose from Library', 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options, cancelButtonIndex: options.length - 1, destructiveButtonIndex: avatarUrl ? 1 : undefined },
        (index) => {
          if (index === 0) void chooseFromLibrary();
          if (avatarUrl && index === 1) void removePhoto();
        }
      );
      return;
    }
    Alert.alert('Profile photo', undefined, [
      { text: 'Choose from library', onPress: () => void chooseFromLibrary() },
      ...(avatarUrl ? [{ text: 'Remove photo', style: 'destructive' as const, onPress: () => void removePhoto() }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    try {
      await apiFetch('/api/account/profile', { method: 'PUT', body: JSON.stringify({ name: name.trim() }) });
      await refresh();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save your profile', e instanceof Error ? e.message : undefined);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderButton label="Save" onPress={() => void save()} disabled={!canSave} busy={isSaving} /> }} />
      <GroupedScreen>
        <View className="items-center gap-3 pt-2">
          <Pressable
            onPress={changePhoto}
            disabled={isPhotoBusy}
            accessibilityRole="button"
            accessibilityLabel={avatarUrl ? 'Change profile photo' : 'Add profile photo'}
            className="overflow-hidden rounded-full active:opacity-80"
          >
            <UserAvatar name={name.trim() || savedName || 'You'} avatarUrl={avatarUrl} size={96} textSize={36} />
            {isPhotoBusy ? (
              <View className="absolute inset-0 items-center justify-center rounded-full bg-background/70">
                <ActivityIndicator color="#0a0a0a" />
              </View>
            ) : null}
          </Pressable>
          <Pressable onPress={changePhoto} disabled={isPhotoBusy} hitSlop={8} accessibilityRole="button" className="min-h-[44px] justify-center active:opacity-60">
            <Text className="font-sans-medium text-[17px] text-foreground">{avatarUrl ? 'Change Photo' : 'Add Photo'}</Text>
          </Pressable>
        </View>

        <Group header="Name" footer="How your coach sees you — on your card in their app.">
          <RowInput
            label="Name"
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            autoComplete="name"
            textContentType="name"
            autoCapitalize="words"
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={() => void save()}
          />
        </Group>
      </GroupedScreen>
    </>
  );
}
