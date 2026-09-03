import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { SignInError, useAuth } from '@/lib/auth';
import { WEB_URL } from '@/lib/config';

const inputClass =
  'h-12 rounded-lg border border-border/60 bg-secondary/50 px-3.5 font-sans text-base text-foreground';

/** Uppercase tracked mono field label — the web's AuthFieldLabel. */
function FieldLabel({ children }: { children: string }) {
  return <Text className="font-mono-medium text-[11px] uppercase tracking-[1.54px] text-muted-foreground">{children}</Text>;
}

/** Mono footer/link voice — the web's auth footer and "Forgot password?" */
function MonoLink({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="link" className="min-h-[32px] justify-center active:opacity-60">
      <Text className="font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground">{children}</Text>
    </Pressable>
  );
}

const openWeb = (path: string) => WebBrowser.openBrowserAsync(`${WEB_URL}${path}`);

/**
 * Sign in — the web's /login at phone width: the headline block over a
 * volt-tick divider, the form, the volt arrow button, and the © / Privacy /
 * Terms footer. No app bar: the app is the brand, and accounts are created
 * from a coach's invite link on the web, so there is no "Create account".
 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { status, session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'signed-in') {
    return <Redirect href={session?.user.role === 'COACH' ? '/coach' : '/client'} />;
  }

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e) {
      setError(e instanceof SignInError ? e.message : 'Something went wrong. Try again.');
      setBusy(false);
    }
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20 }}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Centred when there's room, normal flow when the keyboard is up */}
          <View className="w-full max-w-sm flex-1 justify-center self-center py-10">
            <View>
              <View className="mb-2 flex-row items-center gap-1.5">
                <View className="h-1.5 w-1.5 rounded-full bg-brand" />
                <Text className="font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground">Welcome back</Text>
              </View>
              <Text className="font-sans-bold text-4xl uppercase leading-[34px] text-foreground" style={{ letterSpacing: -0.9 }}>
                Sign in
              </Text>
              <Text className="mt-3 font-sans text-sm leading-[22px] text-muted-foreground">Pick up where you left off.</Text>
            </View>

            {/* Volt-tick divider */}
            <View className="my-7 flex-row items-center gap-3">
              <View className="h-0.5 w-8 bg-brand" />
              <View className="h-px flex-1 bg-border" />
            </View>

            <View className="gap-5">
              <View className="gap-2">
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  className={inputClass}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#737373"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  returnKeyType="next"
                  accessibilityLabel="Email"
                />
              </View>
              <View className="gap-2">
                <View className="flex-row items-baseline justify-between">
                  <FieldLabel>Password</FieldLabel>
                  <Pressable onPress={() => void openWeb('/forgot-password')} hitSlop={8} accessibilityRole="link" className="active:opacity-60">
                    <Text className="font-mono text-[11px] uppercase tracking-[1.54px] text-muted-foreground">Forgot password?</Text>
                  </Pressable>
                </View>
                <TextInput
                  className={inputClass}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Your password"
                  placeholderTextColor="#737373"
                  secureTextEntry
                  textContentType="password"
                  autoComplete="current-password"
                  returnKeyType="go"
                  onSubmitEditing={() => void submit()}
                  accessibilityLabel="Password"
                />
              </View>

              {error ? (
                <View className="border-l-2 border-destructive pl-3" accessibilityLiveRegion="polite">
                  <Text className="font-sans text-sm leading-5 text-destructive">{error}</Text>
                </View>
              ) : null}

              <Pressable
                onPress={() => void submit()}
                disabled={!canSubmit}
                accessibilityRole="button"
                className={`h-12 w-full flex-row items-center justify-center rounded-lg bg-brand active:scale-[0.98] ${busy ? '' : !canSubmit ? 'opacity-60' : ''}`}
              >
                {busy ? (
                  <ActivityIndicator size="small" color="#1e2702" style={{ marginRight: 8 }} />
                ) : null}
                <Text className="font-sans-bold text-sm uppercase tracking-[0.7px] text-brand-foreground">Sign in</Text>
                {!busy ? <Feather name="arrow-right" size={16} color="#1e2702" style={{ marginLeft: 8 }} /> : null}
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer — © line and the legal links, mono and quiet */}
      <View className="flex-row items-center justify-between gap-3 px-5 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 20) }}>
        <Text className="font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground">© 2026 Logbook.fit</Text>
        <View className="flex-row items-center gap-4">
          <MonoLink onPress={() => void openWeb('/privacy')}>Privacy</MonoLink>
          <MonoLink onPress={() => void openWeb('/terms')}>Terms</MonoLink>
        </View>
      </View>
    </View>
  );
}
