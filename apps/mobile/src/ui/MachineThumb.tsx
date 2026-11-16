import type { Quality } from '@fitheon/catalog';
import {
  Activity,
  Archive,
  ArrowUpFromLine,
  Bike,
  Cable,
  ChevronsUp,
  Cog,
  ConciergeBell,
  Dumbbell,
  Footprints,
  Grid2x2,
  Plus,
  RectangleHorizontal,
  Sofa,
  Sprout,
  Tv,
  Weight,
  type LucideIcon,
} from 'lucide-react-native';
import { View } from 'react-native';

import { colors } from './tokens';

// Placeholder icons by line id until the sprites of milestone 5. Presentation only: a line
// that is not listed here (a new catalog line) shows the fallback icon.
const ICON: Record<string, LucideIcon> = {
  dumbbell_rack: Dumbbell,
  adjustable_bench: RectangleHorizontal,
  bench_press: Weight,
  exercise_bike: Bike,
  squat_rack: Grid2x2,
  calisthenics_bar: ArrowUpFromLine,
  treadmill: Footprints,
  rowing_machine: Activity,
  cable_machine: Cable,
  stair_master: ChevronsUp,
  plant: Sprout,
  wall_tv: Tv,
  sofa: Sofa,
  lockers: Archive,
  reception_desk: ConciergeBell,
};
const MACHINE_FALLBACK: LucideIcon = Cog;

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

type Props = { lineId: string | null; quality: Quality | null; size?: number };

/** A machine's thumbnail, tinted by its quality. A null lineId or quality is an empty slot. */
export function MachineThumb({ lineId, quality, size = 44 }: Props) {
  const Icon = lineId === null ? Plus : (ICON[lineId] ?? MACHINE_FALLBACK);
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
