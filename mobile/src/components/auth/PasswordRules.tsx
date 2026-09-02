import { Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  isCommonPassword,
  passwordByteLength,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_BYTES,
} from '@logbook/shared/validations/schemas';

const RULES = [
  { id: 'length', label: '8+ chars', met: (password: string) => password.length >= PASSWORD_MIN_LENGTH },
  { id: 'letter', label: 'A letter', met: (password: string) => /[a-zA-Z]/.test(password) },
  { id: 'number', label: 'A number', met: (password: string) => /[0-9]/.test(password) },
] as const;

/**
 * Live checklist under the password field — the web's PasswordRules: each
 * rule ticks green as the person satisfies it, so nobody meets the
 * requirements for the first time via a rejected submit. Renders the same
 * rules passwordSchema enforces.
 */
export function PasswordRules({ password }: { password: string }) {
  // Edge cases stay hidden until they actually happen — the happy path is
  // three checkmarks, not a wall of warnings.
  const tooCommon = password.length >= PASSWORD_MIN_LENGTH && isCommonPassword(password);
  const tooLong = passwordByteLength(password) > PASSWORD_MAX_BYTES;

  return (
    <View className="gap-1.5" accessibilityLiveRegion="polite">
      <View className="flex-row flex-wrap gap-x-4 gap-y-1">
        {RULES.map((rule) => {
          const met = rule.met(password);
          return (
            <View key={rule.id} className="flex-row items-center gap-1.5" accessibilityLabel={`${rule.label}, ${met ? 'done' : 'missing'}`}>
              <View
                className={`h-3.5 w-3.5 items-center justify-center rounded-full border ${
                  met ? 'border-success bg-success' : 'border-border/80'
                }`}
              >
                {met ? <Feather name="check" size={9} color="#fafafa" /> : null}
              </View>
              <Text className={`font-mono text-[11px] uppercase tracking-[1.54px] ${met ? 'text-success-text' : 'text-muted-foreground'}`}>
                {rule.label}
              </Text>
            </View>
          );
        })}
      </View>
      {tooCommon || tooLong ? (
        <View className="flex-row items-start gap-1.5">
          <Feather name="alert-triangle" size={12} color="#c52020" style={{ marginTop: 2 }} />
          <Text className="flex-1 font-sans text-[13px] leading-[19px] text-destructive">
            {tooCommon ? 'This one tops the most-hacked lists — pick something harder to guess' : 'Passwords max out at 72 characters'}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
