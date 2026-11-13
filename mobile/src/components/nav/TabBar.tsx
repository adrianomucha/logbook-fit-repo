import { useEffect, useRef, useState } from 'react';
import { Keyboard, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DURATION } from '@logbook/shared/motion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// expo-router 57 ships its own copy of react-navigation's tab bar types
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { EASE_IN_OUT, TabIconPop } from '@/components/motion';

export const TAB_BAR_HEIGHT = 56;
const PILL_WIDTH = 64;
const PILL_HEIGHT = 32;

const TABS: { name: string; label: string; icon: (color: string, active: boolean) => React.ReactNode }[] = [
  {
    name: 'index',
    label: 'Workout',
    icon: (color) => <MaterialCommunityIcons name="dumbbell" size={22} color={color} />,
  },
  {
    name: 'chat',
    label: 'Chat',
    icon: (color) => <Feather name="message-square" size={22} color={color} />,
  },
  {
    name: 'progress',
    label: 'Progress',
    icon: (color) => <Feather name="trending-up" size={22} color={color} />,
  },
];

/**
 * The web's MobileBottomNav, native: a hairline-topped bar with a single volt
 * pill that slides to the active tab, the icon settling as it lands (TabIconPop), labels
 * in sentence case beneath. Hidden while the keyboard is up — a tab bar
 * behind the keys is unreachable chrome, and chat apps drop theirs too.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { total: unread } = useUnreadMessages();

  // Only routes that are real tabs (workout/[dayId] is hidden with href: null)
  const routes = state.routes.filter((r) => TABS.some((t) => t.name === r.name));
  // Settings is pushed from the account menu but lives under Workout, the
  // way the web's /client/settings keeps the nav's Workout tab lit.
  const currentName = state.routes[state.index]?.name;
  const activeName = currentName === 'settings' ? 'index' : currentName;
  const activeIndex = routes.findIndex((r) => r.name === activeName);
  const columnWidth = width / routes.length;

  const pillX = useSharedValue(0);
  const isPillPlaced = useRef(false);
  useEffect(() => {
    if (activeIndex < 0) return;
    const target = activeIndex * columnWidth + (columnWidth - PILL_WIDTH) / 2;
    if (!isPillPlaced.current) {
      // First appearance: sit under the active tab at once. Animating here
      // made the pill slide in from the screen edge every time the app opened.
      isPillPlaced.current = true;
      pillX.value = target;
      return;
    }
    // Timing, not a spring: a tap carries no momentum, so the pill should not
    // overshoot. It eases away and eases in, like anything moving on screen.
    pillX.value = withTiming(target, { duration: DURATION.tabSlide, easing: EASE_IN_OUT });
  }, [activeIndex, columnWidth, pillX]);
  const pillStyle = useAnimatedStyle(() => ({ transform: [{ translateX: pillX.value }] }));

  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardWillShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // The workout screen is a tab route but has its own chrome and finish bar
  if (keyboardOpen || activeIndex < 0) return null;

  return (
    <View className="border-t border-border/60 bg-background/95" style={{ paddingBottom: insets.bottom }}>
      <View className="flex-row" style={{ height: TAB_BAR_HEIGHT }}>
        <Animated.View
          pointerEvents="none"
          className="absolute rounded-full bg-brand"
          style={[{ top: 5, left: 0, width: PILL_WIDTH, height: PILL_HEIGHT }, pillStyle]}
        />
        {routes.map((route) => {
          const tab = TABS.find((t) => t.name === route.name)!;
          const isActive = route.name === activeName;
          // Sitting in the chat marks it read within a poll — a badge on the
          // tab you're already reading is noise.
          const badge = tab.name === 'chat' && !isActive ? unread : 0;
          const color = isActive ? '#1e2702' : '#737373';
          return (
            <TabButton
              key={route.key}
              label={tab.label}
              badge={badge}
              isActive={isActive}
              icon={tab.icon(color, isActive)}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isActive && !event.defaultPrevented) {
                  // A tick on the tap itself, not when the pill lands
                  void Haptics.selectionAsync();
                  navigation.navigate(route.name);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function TabButton({
  label,
  badge,
  isActive,
  icon,
  onPress,
}: {
  label: string;
  badge: number;
  isActive: boolean;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  // Drives the icon's dip under the thumb. Two renders per tap, not per frame.
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={badge > 0 ? `${label}, ${badge} unread` : label}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className="flex-1 items-center pt-[5px]"
    >
      <View className="items-center justify-center" style={{ width: PILL_WIDTH, height: PILL_HEIGHT }}>
        <TabIconPop active={isActive} pressed={pressed}>
          {icon}
          {badge > 0 ? (
            <View className="absolute -right-2.5 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full border-2 border-background bg-destructive px-1">
              <Text className="font-sans-semibold text-[10px] leading-none text-destructive-foreground">
                {badge > 9 ? '9+' : badge}
              </Text>
            </View>
          ) : null}
        </TabIconPop>
      </View>
      <Text
        className={`mt-1 text-[10px] leading-none ${isActive ? 'font-sans-semibold text-foreground' : 'font-sans-medium text-muted-foreground'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
