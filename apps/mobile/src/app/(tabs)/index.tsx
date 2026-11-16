import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { GymScene } from '@/gym/GymScene';
import { gymView, headerView, type SlotRow } from '@/state/selectors';
import { deviceTimeZone, now, useApp } from '@/state/store';
import { slotLabel } from '@/ui/labels';
import { MachineThumb } from '@/ui/MachineThumb';
import { QualityTag } from '@/ui/QualityTag';
import { Screen } from '@/ui/Screen';
import { StatusHeader } from '@/ui/StatusHeader';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/tokens';

function openSlot(slotId: string): void {
  router.push({ pathname: '/slot/[slotId]', params: { slotId } });
}

function SlotListRow({ slot }: { slot: SlotRow }) {
  const filled = slot.quality !== null;
  return (
    <Pressable
      onPress={() => openSlot(slot.slotId)}
      accessibilityRole="button"
      className="flex-row items-center gap-3 border-b border-line py-3 active:opacity-70">
      <MachineThumb lineId={slot.lineId} quality={slot.quality} size={40} />
      <View className="min-w-0 flex-1">
        <Text
          className={`font-medium text-base ${filled ? 'text-fg' : 'text-coin'}`}
          numberOfLines={1}>
          {slot.machineName ?? 'Empty slot'}
        </Text>
        <Text className="text-xs text-muted">{slotLabel(slot.slotNumber)}</Text>
      </View>
      {slot.quality !== null ? (
        <QualityTag quality={slot.quality} />
      ) : (
        <Text className="font-semibold text-sm text-coin">Choose</Text>
      )}
      <ChevronRight size={16} color={colors.faint} />
    </Pressable>
  );
}

/** The current gym: header, the gym picture with slot pins, and the slot list. */
export default function GymScreen() {
  const app = useApp(s => s.app);
  const header = useMemo(() => headerView(app, now(app), deviceTimeZone()), [app]);
  const gym = useMemo(() => gymView(app), [app]);

  return (
    <Screen>
      <StatusHeader {...header} />
      <ScrollView className="flex-1">
        <View className="px-4 pt-2">
          <Text className="font-bold text-2xl">{gym.name}</Text>
          <Text className="text-sm text-muted">
            {gym.filled} of {gym.slots.length} slots filled · {gym.qualityCapName} quality cap
          </Text>
        </View>

        <View className="my-3 overflow-hidden">
          <GymScene gymId={gym.gymId} slots={gym.slots} onSlot={openSlot} />
        </View>

        <View className="px-4 pb-4">
          {gym.slots.map(slot => (
            <SlotListRow key={slot.slotId} slot={slot} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
