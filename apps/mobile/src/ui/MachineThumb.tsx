import type { Category, Quality } from '@fitheon/catalog';
import {
  Armchair,
  ArrowUpFromLine,
  Bike,
  Cog,
  Dumbbell,
  Grid2x2,
  RectangleHorizontal,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { colors } from './tokens';

const ICON: Record<Category, LucideIcon> = {
  free_weights: Dumbbell,
  bench: RectangleHorizontal,
  press: Weight,
  rack: Grid2x2,
  pull: ArrowUpFromLine,
  cardio: Bike,
  machine: Cog,
  decor: Armchair,
};

// The design mixes 14% of the tier colour into the surface colour; a 14% tint
// layered over bg-surface gives the same result.
const TINT_CLASS: Record<Quality, string> = {
  1: 'bg-q1/[.14]',
  2: 'bg-q2/[.14]',
  3: 'bg-q3/[.14]',
  4: 'bg-q4/[.14]',
};

const ICON_COLOR: Record<Quality, string> = {
  1: colors.q1,
  2: colors.q2,
  3: colors.q3,
  4: colors.q4,
};

type Props = { category: Category; quality: Quality | null; size?: number };

/** A machine's thumbnail, tinted by its quality. quality null = an empty slot. */
export function MachineThumb({ category, quality, size = 44 }: Props) {
  const Icon = ICON[category];
  const isEmpty = quality === null;
  return (
    <View
      className={`items-center justify-center overflow-hidden rounded-xl ${isEmpty ? 'bg-raised' : 'bg-surface'}`}
      style={{ width: size, height: size }}>
      {!isEmpty && <View className={`absolute inset-0 ${TINT_CLASS[quality]}`} />}
      <Icon
        size={Math.round(size * 0.46)}
        strokeWidth={2}
        color={isEmpty ? colors.faint : ICON_COLOR[quality]}
      />
    </View>
  );
}
