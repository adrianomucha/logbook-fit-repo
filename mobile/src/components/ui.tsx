import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, Text, View, type PressableProps } from 'react-native';
import Svg, { Polyline } from 'react-native-svg';

/** Mono, uppercase, tracked — the brand's eyebrow/label voice. */
export function Eyebrow({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <Text className={`font-mono text-[11px] uppercase tracking-[1.76px] text-muted-foreground ${className}`}>
      {children}
    </Text>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <View className={`rounded-2xl border border-border bg-card p-5 ${className}`}>{children}</View>;
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

export function EmptyState({ eyebrow, title, body }: { eyebrow?: string; title: string; body?: string }) {
  return (
    <View className="items-center py-12">
      {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
      <Text className="font-sans-bold text-lg text-foreground">{title}</Text>
      {body ? <Text className="mt-1 text-center font-sans text-sm text-muted-foreground">{body}</Text> : null}
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

/** The web's lucide check at a heavy stroke — the celebration mark. Feather's is fixed at 2. */
export function BoldCheck({ size, color, strokeWidth = 3.5 }: { size: number; color: string; strokeWidth?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Polyline points="20 6 9 17 4 12" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
