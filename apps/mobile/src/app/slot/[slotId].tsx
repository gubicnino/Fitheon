import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from '@/ui/Text';
import { colors } from '@/ui/tokens';

// The slot sheet route. It only shows the slot id for now; plan Task 11 fills it.
export default function SlotSheet() {
  const { slotId } = useLocalSearchParams<'/slot/[slotId]'>();

  return (
    <View className="flex-1 bg-surface px-4 pt-5">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-xs uppercase tracking-wide text-faint">Slot</Text>
          <Text className="font-bold text-xl" numberOfLines={1}>
            {slotId}
          </Text>
        </View>
        <Pressable
          onPress={() => router.back()}
          className="h-11 w-11 items-center justify-center rounded-full bg-raised active:opacity-60"
          accessibilityRole="button"
          accessibilityLabel="Close">
          <X size={20} color={colors.fg} />
        </Pressable>
      </View>
    </View>
  );
}
