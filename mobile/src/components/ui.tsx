import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, useWindowDimensions, View, type PressableProps } from 'react-native';
import type { StateArtId } from '@logbook/shared/state-art';
import { StateArt } from './StateArt';

/** Mono, uppercase, tracked — the brand's eyebrow/label voice. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`font-mono text-[10px] uppercase tracking-[1.6px] text-muted-foreground ${className}`}>
      {children}
    </Text>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-border/70 bg-card p-5 ${className}`}>{children}</View>;
}

interface ButtonProps extends Omit<PressableProps, 'children'> {
  children: ReactNode;
  variant?: 'brand' | 'primary' | 'ghost';
  loading?: boolean;
}

export function Button({ children, variant = 'primary', loading, disabled, className = '', ...rest }: ButtonProps) {
  const shell =
    variant === 'brand'
      ? 'bg-brand'
      : variant === 'primary'
        ? 'bg-primary'
        : 'bg-transparent';
  const text =
    variant === 'brand'
      ? 'text-brand-foreground'
      : variant === 'primary'
        ? 'text-primary-foreground'
        : 'text-muted-foreground';
  const isDisabled = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`h-14 flex-row items-center justify-center rounded-xl active:opacity-80 ${shell} ${isDisabled ? 'opacity-60' : ''} ${className}`}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'brand' ? '#1e2702' : variant === 'primary' ? '#fafafa' : '#737373'} />
      ) : (
        <Text className={`font-sans-bold text-sm uppercase tracking-[0.7px] ${text}`}>{children}</Text>
      )}
    </Pressable>
  );
}

/**
 * The one layout for every empty, error and not-found state, the same
 * anatomy as the web's StateView: a looping isometric illustration, a
 * two-tone headline (what's true in ink, what happens next in grey), at most
 * one short line under it, then actions.
 */
export function EmptyState({
  art,
  title,
  tail,
  body,
  children,
  size = 'md',
  fill = false,
}: {
  art?: StateArtId;
  title: string;
  tail?: string;
  /** One short line under the headline */
  body?: string;
  /** Actions */
  children?: ReactNode;
  size?: 'sm' | 'md';
  /**
   * The state is the screen's content: center it in the height left below
   * the screen title instead of hugging the top. The web's `fill`.
   */
  fill?: boolean;
}) {
  const small = size === 'sm';
  const { height } = useWindowDimensions();
  return (
    <View
      className={`items-center justify-center px-4 ${small ? 'py-6' : 'py-8'}`}
      // Roughly the screen less its header, title and tab bar, as on the web
      style={fill ? { minHeight: Math.max(320, height - 340) } : undefined}
    >
      {art ? (
        <View className={small ? 'mb-3' : 'mb-5'}>
          <StateArt art={art} size={small ? 'sm' : 'md'} />
        </View>
      ) : null}
      <Text
        accessibilityRole="header"
        className={`text-center font-sans-semibold tracking-tight text-foreground ${small ? 'text-base leading-snug' : 'text-xl leading-7'}`}
      >
        {title}
        {tail ? <Text className="text-muted-foreground">{`\n${tail}`}</Text> : null}
      </Text>
      {body ? (
        <Text className={`text-center font-sans text-muted-foreground ${small ? 'mt-1.5 text-[13px]' : 'mt-2 text-sm leading-5'}`}>{body}</Text>
      ) : null}
      {children ? <View className={`w-full items-center gap-2.5 ${small ? 'mt-4' : 'mt-6'}`}>{children}</View> : null}
    </View>
  );
}

export function LoadingScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <ActivityIndicator color="#0a0a0a" />
    </View>
  );
}
