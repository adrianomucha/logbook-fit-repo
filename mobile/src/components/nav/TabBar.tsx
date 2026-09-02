import { useEffect, useState } from 'react';
import { Keyboard, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// expo-router 57 ships its own copy of react-navigation's tab bar types
import type { BottomTabBarProps } from 'expo-router/build/layouts/Tabs';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';

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
 * pill that slides to the active tab, the icon popping as it lands, labels
 * in sentence case beneath. Hidden while the keyboard is up — a tab bar
 * behind the keys is unreachable chrome, and chat apps drop theirs too.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { total: unread } = useUnreadMessages();

  // Only routes that are real tabs (workout/[dayId] is hidden with href: null)
  const routes = state.routes.filter((r) => TABS.some((t) => t.name === r.name));
  // Account and Settings open from the header but live under Workout, the
  // way the web's /client/settings keeps the nav's Workout tab lit.
  const currentName = state.routes[state.index]?.name;
  const activeName = currentName === 'settings' || currentName === 'account' ? 'index' : currentName;
  const activeIndex = routes.findIndex((r) => r.name === activeName);
  const columnWidth = width / routes.length;

  const pillX = useSharedValue(0);
  useEffect(() => {
    if (activeIndex >= 0) {
      pillX.value = withSpring(activeIndex * columnWidth + (columnWidth - PILL_WIDTH) / 2, {
        damping: 16,
        stiffness: 180,
        mass: 0.8,
      });
    }
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
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={badge > 0 ? `${tab.label}, ${badge} unread` : tab.label}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!isActive && !event.defaultPrevented) navigation.navigate(route.name);
              }}
              className="flex-1 items-center pt-[5px] active:opacity-80"
            >
              <View className="items-center justify-center" style={{ width: PILL_WIDTH, height: PILL_HEIGHT }}>
                <View>
                  {tab.icon(color, isActive)}
                  {badge > 0 ? (
                    <View className="absolute -right-2.5 -top-1.5 h-4 min-w-4 items-center justify-center rounded-full border-2 border-background bg-destructive px-1">
                      <Text className="font-sans-semibold text-[10px] leading-none text-destructive-foreground">
                        {badge > 9 ? '9+' : badge}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Text
                className={`mt-1 text-[10px] leading-none ${isActive ? 'font-sans-semibold text-foreground' : 'font-sans-medium text-muted-foreground'}`}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
