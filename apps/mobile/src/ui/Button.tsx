import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from './Text';

type Variant = 'primary' | 'quiet' | 'go';

// Full class names, so Tailwind finds them when it scans the source.
const VARIANT: Record<Variant, { box: string; text: string }> = {
  primary: { box: 'bg-coin', text: 'text-coin-ink' },
  quiet: { box: 'bg-raised', text: 'text-fg' },
  go: { box: 'bg-go', text: 'text-ink' },
};
const DISABLED = { box: 'bg-raised', text: 'text-faint' };

type Props = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  /** Drawn before the label, such as the coin icon. */
  icon?: ReactNode;
  accessibilityLabel?: string;
};

/** A pill button. Disabled, it turns grey and ignores taps. */
export function Button({ label, onPress, variant = 'primary', disabled = false, icon, accessibilityLabel }: Props) {
  const c = disabled ? DISABLED : VARIANT[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      hitSlop={4}
      className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-2 ${c.box} ${disabled ? '' : 'active:opacity-70'}`}>
      {icon !== undefined && <View>{icon}</View>}
      <Text className={`font-semibold text-sm ${c.text}`} style={{ fontVariant: ['tabular-nums'] }}>
        {label}
      </Text>
    </Pressable>
  );
}
