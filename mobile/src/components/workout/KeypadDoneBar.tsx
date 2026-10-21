import { InputAccessoryView, Keyboard, Platform, Pressable, Text, View } from 'react-native';

/** Inputs opt in with `inputAccessoryViewID={KEYPAD_DONE_BAR_ID}`. */
export const KEYPAD_DONE_BAR_ID = 'keypad-done-bar';

/**
 * A Done bar above the iOS number pad. The decimal and number pads have no
 * return key, so without this there is no way to close the keypad after
 * typing a weight or rep count. Values commit as they're typed, so Done only
 * has to dismiss. Render once per screen; Android's pads have their own key.
 */
export function KeypadDoneBar() {
  if (Platform.OS !== 'ios') return null;
  return (
    <InputAccessoryView nativeID={KEYPAD_DONE_BAR_ID}>
      <View className="h-11 flex-row items-center justify-end border-t border-border bg-background px-2">
        <Pressable
          onPress={() => Keyboard.dismiss()}
          accessibilityRole="button"
          accessibilityLabel="Done"
          hitSlop={8}
          className="h-9 justify-center rounded-md px-3 active:opacity-70"
        >
          <Text className="font-sans-semibold text-[16px] text-foreground">Done</Text>
        </Pressable>
      </View>
    </InputAccessoryView>
  );
}
