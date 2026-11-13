import { QUALITIES, type Category, type Quality } from '@fitheon/catalog';
import { ChevronRight } from 'lucide-react-native';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CoinIcon } from '@/ui/CoinIcon';
import { acceptsLabel } from '@/ui/labels';
import { MachineThumb } from '@/ui/MachineThumb';
import { QualityTag } from '@/ui/QualityTag';
import { Screen } from '@/ui/Screen';
import { StatusHeader } from '@/ui/StatusHeader';
import { TabBarView } from '@/ui/TabBar';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/tokens';

// Sample screen for checking the shared components against the top of the
// design's Gym frame (plan Task 3). Fixed sample values; the real Gym screen
// reads the store in Task 9.

type SampleRow = { id: string; accepts: Category[]; machine: string | null; quality: Quality | null };

const SAMPLE_ROWS: SampleRow[] = [
  { id: 'free_weights', accepts: ['free_weights'], machine: 'Dumbbell rack', quality: 1 },
  { id: 'rack', accepts: ['rack', 'pull'], machine: 'Squat rack', quality: 2 },
  { id: 'cardio', accepts: ['cardio'], machine: null, quality: null },
];

const ALL_QUALITIES = Object.keys(QUALITIES).map(Number) as Quality[];

function SlotRow({ row }: { row: SampleRow }) {
  const category = row.accepts[0] ?? 'machine';
  return (
    <View className="flex-row items-center gap-3 border-b border-line py-3">
      <MachineThumb category={category} quality={row.quality} size={40} />
      <View className="min-w-0 flex-1">
        <Text
          className={`font-medium text-base ${row.machine ? 'text-fg' : 'text-coin'}`}
          numberOfLines={1}>
          {row.machine ?? 'Empty slot'}
        </Text>
        <Text className="text-xs text-muted">{acceptsLabel(row.accepts)}</Text>
      </View>
      {row.quality ? (
        <QualityTag quality={row.quality} />
      ) : (
        <Text className="font-semibold text-sm text-coin">Choose</Text>
      )}
      <ChevronRight size={16} color={colors.faint} />
    </View>
  );
}

export default function SampleScreen() {
  const insets = useSafeAreaInsets();
  return (
    <>
      <Screen>
        <StatusHeader coins={1188} level={5} xpInto={50} xpNeeded={60} goalDone={1} goal={3} />
        <ScrollView className="flex-1" contentContainerClassName="pb-4">
          <View className="px-4 pt-2">
            <Text className="font-bold text-2xl">Garage</Text>
            <Text className="text-sm text-muted">2 of 3 slots filled · Basic quality cap</Text>
          </View>

          <View className="mt-3 px-4">
            {SAMPLE_ROWS.map(row => (
              <SlotRow key={row.id} row={row} />
            ))}
          </View>

          <View className="mt-6 gap-3 px-4">
            <Text className="font-semibold text-xs uppercase tracking-wide text-faint">
              Components
            </Text>
            <View className="flex-row flex-wrap gap-2">
              {ALL_QUALITIES.map(q => (
                <QualityTag key={q} quality={q} />
              ))}
            </View>
            <View className="flex-row items-center gap-3">
              {ALL_QUALITIES.map(q => (
                <MachineThumb key={q} category="cardio" quality={q} />
              ))}
              <MachineThumb category="cardio" quality={null} />
            </View>
            <View className="flex-row items-center gap-3">
              <CoinIcon size={14} />
              <CoinIcon />
              <CoinIcon size={26} />
              <Text className="font-bold text-3xl tabular-nums">1,438</Text>
            </View>
          </View>
        </ScrollView>
      </Screen>
      <TabBarView active="gym" bottomInset={insets.bottom} />
    </>
  );
}
