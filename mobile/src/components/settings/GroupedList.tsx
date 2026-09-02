import { Children, forwardRef, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View, type TextInputProps } from 'react-native';
import { Feather } from '@expo/vector-icons';

/**
 * The iOS inset-grouped list, in the brand's type: a grouped background,
 * white groups with 10pt corners, 44pt rows with inset separators, an
 * uppercase mono header above and a footnote below. Everything on the
 * Account screens is built from these so the pages read as native settings.
 */

/** Grouped-background scroll view; `automatic` inset lets a large title collapse. */
export function GroupedScreen({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      className="flex-1 bg-secondary"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ paddingTop: 8, paddingBottom: 48 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="gap-7">{children}</View>
    </ScrollView>
  );
}

export function Group({ header, footer, children }: { header?: string; footer?: ReactNode; children: ReactNode }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View className="px-4">
      {header ? (
        <Text className="mb-2 px-4 font-mono-medium text-[13px] uppercase tracking-[1px] text-muted-foreground">{header}</Text>
      ) : null}
      <View className="overflow-hidden rounded-[10px] bg-card">
        {rows.map((row, i) => (
          <View key={i}>
            {i > 0 ? <View className="ml-4 h-px bg-border" /> : null}
            {row}
          </View>
        ))}
      </View>
      {footer ? (
        typeof footer === 'string' ? (
          <Text className="mt-2 px-4 font-sans text-[13px] leading-[18px] text-muted-foreground">{footer}</Text>
        ) : (
          <View className="mt-2 px-4">{footer}</View>
        )
      ) : null}
    </View>
  );
}

interface RowProps {
  label: string;
  /** Trailing value, secondary colour (Email · you@…) */
  value?: string;
  /** Second line under the label */
  detail?: string;
  onPress?: () => void;
  disabled?: boolean;
  /** Disclosure chevron — the row pushes a screen */
  chevron?: boolean;
  tone?: 'default' | 'destructive';
  /** Centred label, the iOS idiom for a lone action row (Sign Out) */
  centered?: boolean;
  /** Trailing accessory, e.g. a Switch */
  accessory?: ReactNode;
}

export function Row({ label, value, detail, onPress, disabled, chevron, tone = 'default', centered, accessory }: RowProps) {
  const interactive = !!onPress && !disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole={onPress ? 'button' : undefined}
      className={`min-h-[44px] flex-row items-center gap-3 px-4 py-2.5 ${interactive ? 'active:bg-muted' : ''} ${centered ? 'justify-center' : ''} ${
        disabled ? 'opacity-50' : ''
      }`}
    >
      <View className={centered ? '' : 'flex-1'}>
        <Text
          className={`font-sans text-[17px] leading-[22px] ${tone === 'destructive' ? 'text-destructive' : 'text-foreground'}`}
          numberOfLines={1}
        >
          {label}
        </Text>
        {detail ? <Text className="mt-0.5 font-sans text-[13px] leading-[18px] text-muted-foreground">{detail}</Text> : null}
      </View>
      {value ? (
        <Text className="max-w-[60%] font-sans text-[17px] leading-[22px] text-muted-foreground" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {accessory}
      {chevron ? <Feather name="chevron-right" size={18} color="#c7c7cc" /> : null}
    </Pressable>
  );
}

/** Label on the left, the field on the right — the Contacts/Settings form row. */
export const RowInput = forwardRef<TextInput, { label: string } & TextInputProps>(function RowInput({ label, ...input }, ref) {
  return (
    <View className="min-h-[44px] flex-row items-center gap-3 px-4">
      <Text className="w-28 font-sans text-[17px] leading-[22px] text-foreground" numberOfLines={1}>
        {label}
      </Text>
      <TextInput
        ref={ref}
        className="flex-1 py-2.5 font-sans text-[17px] leading-[22px] text-foreground"
        placeholderTextColor="#a3a3a3"
        accessibilityLabel={label}
        {...input}
      />
    </View>
  );
});

/** Navigation-bar text action (Save, Done) — 17pt semibold, dimmed when disabled. */
export function HeaderButton({ label, onPress, disabled, busy }: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  if (busy) return <ActivityIndicator size="small" color="#0a0a0a" />;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={10} accessibilityRole="button" className={disabled ? 'opacity-30' : 'active:opacity-60'}>
      <Text className="font-sans-semibold text-[17px] text-foreground">{label}</Text>
    </Pressable>
  );
}

/** Navigation-bar back for a stack root reached from a tab (no native back exists). */
export function HeaderBack({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back" className="-ml-2 flex-row items-center active:opacity-60">
      <Feather name="chevron-left" size={28} color="#0a0a0a" />
    </Pressable>
  );
}
