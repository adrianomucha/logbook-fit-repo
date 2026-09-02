import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Redirect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SignInError, useAuth } from '@/lib/auth';
import { WEB_URL } from '@/lib/config';
import { Button, Eyebrow } from '@/components/ui';

const inputClass =
  'h-12 rounded-lg border border-border/60 bg-secondary/50 px-3.5 font-sans text-base text-foreground';

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

  const submit = async () => {
    if (busy || !email.trim() || !password) return;
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
    <KeyboardAvoidingView className="flex-1 bg-background" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24, paddingHorizontal: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-8">
          <View className="mb-2 flex-row items-center gap-1.5">
            <View className="h-1.5 w-1.5 rounded-full bg-brand" />
            <Eyebrow>Welcome back</Eyebrow>
          </View>
          <Text className="font-sans-bold text-4xl uppercase leading-[38px] tracking-tight text-foreground">
            Sign in
          </Text>
          <Text className="mt-3 font-sans text-sm leading-5 text-muted-foreground">Pick up where you left off.</Text>
        </View>

        <View className="gap-5">
          <View className="gap-2">
            <Eyebrow>Email</Eyebrow>
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
            />
          </View>
          <View className="gap-2">
            <View className="flex-row items-baseline justify-between">
              <Eyebrow>Password</Eyebrow>
              <Pressable onPress={() => WebBrowser.openBrowserAsync(`${WEB_URL}/forgot-password`)}>
                <Eyebrow>Forgot password?</Eyebrow>
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
              onSubmitEditing={submit}
            />
          </View>

          {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}

          <Button variant="primary" onPress={submit} loading={busy} disabled={!email.trim() || !password}>
            Sign in
          </Button>
        </View>

        <Text className="mt-10 text-center font-sans text-xs leading-5 text-muted-foreground">
          New to Logbook? Ask your coach for their invite link — that's how accounts are created.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
