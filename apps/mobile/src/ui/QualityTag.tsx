import { QUALITIES, type Quality } from '@fitheon/catalog';
import { View } from 'react-native';

import { Text } from './Text';

// Full class names, so Tailwind finds them when it scans the source.
const TAG_CLASS: Record<Quality, { tag: string; dot: string; text: string }> = {
  1: { tag: 'bg-q1/[.16]', dot: 'bg-q1', text: 'text-q1' },
  2: { tag: 'bg-q2/[.16]', dot: 'bg-q2', text: 'text-q2' },
  3: { tag: 'bg-q3/[.16]', dot: 'bg-q3', text: 'text-q3' },
  4: { tag: 'bg-q4/[.16]', dot: 'bg-q4', text: 'text-q4' },
};

type Props = { quality: Quality };

/** The quality tier as a coloured tag: Basic, Standard, Commercial, Elite. */
export function QualityTag({ quality }: Props) {
  const c = TAG_CLASS[quality];
  return (
    <View className={`flex-row items-center gap-1 self-start rounded-md px-1.5 py-0.5 ${c.tag}`}>
      <View className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      <Text className={`font-semibold text-[11px] ${c.text}`}>{QUALITIES[quality].name}</Text>
    </View>
  );
}
