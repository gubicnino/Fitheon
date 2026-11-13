import type { ReactNode } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = { children: ReactNode };

/**
 * A full screen on the ink background, clear of the status bar and notch.
 * The bottom inset is left to the tab bar, which sits below the screen.
 */
export function Screen({ children }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View
      className="flex-1 bg-ink"
      style={{ paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }}>
      {children}
    </View>
  );
}
