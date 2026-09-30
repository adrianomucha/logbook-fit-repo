import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { AppHeader } from '@/components/nav/AppHeader';
import {
  AccountSection,
  PreferencesSection,
  ProfileSection,
  SETTINGS_SECTIONS,
  resolveSettingsSection,
  type SettingsSectionId,
} from '@/components/settings/sections';

/**
 * The client's settings — the web's /client/settings: one column under the
 * app header, volt-underlined section tabs, the pane in a card. Deep-links
 * as /client/settings?section=… so the photo nudge can land on Profile.
 */
export default function SettingsScreen() {
  const router = useRouter();
  const { section: requested } = useLocalSearchParams<{ section?: string }>();
  const { user, isLoading } = useCurrentUser();
  // Old ?section=password / =notifications links land on the tab that now holds them
  const [section, setSection] = useState<SettingsSectionId>(resolveSettingsSection(requested));

  useEffect(() => {
    if (requested !== undefined) setSection(resolveSettingsSection(requested));
  }, [requested]);

  return (
    <View className="flex-1 bg-background">
      <AppHeader />
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          <View className="gap-4">
            <View>
              <Pressable
                onPress={() => router.push('/client')}
                hitSlop={8}
                accessibilityRole="button"
                className="-ml-1 mb-1 min-h-[36px] flex-row items-center gap-0.5 self-start active:opacity-70"
              >
                <Feather name="chevron-left" size={14} color="#737373" />
                <Text className="font-mono-medium text-[11px] uppercase tracking-[1.3px] text-muted-foreground">Today</Text>
              </Pressable>
              <Text className="font-sans-bold text-2xl tracking-tight text-foreground">Settings</Text>
            </View>

            {/* Section tabs — brand underline, matching the nav's own tabs.
                Fixed segments, never a scroller: three tabs share the row. */}
            <View className="flex-row border-b border-border" accessibilityRole="tablist">
              {SETTINGS_SECTIONS.map(({ id, label }) => {
                const active = section === id;
                return (
                  <Pressable
                    key={id}
                    onPress={() => setSection(id)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected: active }}
                    style={{ marginBottom: -1 }}
                    className={`min-h-[44px] flex-1 items-center justify-end border-b-2 px-1 pb-2.5 pt-1 ${
                      active ? 'border-brand' : 'border-transparent'
                    }`}
                  >
                    <Text className={`font-mono-medium text-[11px] uppercase tracking-[1.3px] ${active ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {isLoading || !user ? (
              <View className="items-center py-12" accessibilityLabel="Loading settings">
                <ActivityIndicator color="#737373" />
              </View>
            ) : (
              <View className="rounded-xl border border-border/70 bg-card p-4">
                {section === 'profile' ? (
                  <ProfileSection />
                ) : section === 'preferences' ? (
                  <PreferencesSection />
                ) : (
                  <AccountSection />
                )}
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
