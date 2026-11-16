import type { GymId } from '@fitheon/catalog';
import { Image, type ImageSource } from 'expo-image';
import { Plus } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import type { SlotRow } from '@/state/selectors';
import { MachineThumb } from '@/ui/MachineThumb';
import { colors } from '@/ui/tokens';

import { GARAGE_PINS } from './garageLayout';

type Pins = Record<string, { x: number; y: number }>;

// Placeholder art until milestone 5. Only the Garage has a picture in this phase;
// a gym without one shows no scene, and its slots stay reachable through the list.
const SCENES: Partial<Record<GymId, { picture: ImageSource; label: string; pins: Pins }>> = {
  garage: {
    picture: require('../../assets/images/gyms/garage.jpg'),
    label: 'Your garage gym',
    pins: GARAGE_PINS,
  },
};

const PIN_TARGET = 44;

type Props = { gymId: GymId; slots: SlotRow[]; onSlot(slotId: string): void };

/** The gym picture with one tappable pin per slot that has a position. */
export function GymScene({ gymId, slots, onSlot }: Props) {
  const scene = SCENES[gymId];
  if (!scene) return null;

  return (
    <View className="aspect-square w-full max-w-[460px] self-center">
      <Image
        source={scene.picture}
        contentFit="cover"
        accessibilityLabel={scene.label}
        style={{ width: '100%', height: '100%' }}
      />
      {slots.map(slot => {
        const pin = scene.pins[slot.slotId];
        if (!pin) return null;
        const empty = slot.quality === null;
        return (
          <Pressable
            key={slot.slotId}
            onPress={() => onSlot(slot.slotId)}
            accessibilityRole="button"
            accessibilityLabel={
              empty ? `Empty slot ${slot.slotNumber}` : (slot.machineName ?? '')
            }
            className="absolute items-center justify-center active:opacity-70"
            style={{
              left: `${pin.x}%`,
              top: `${pin.y}%`,
              width: PIN_TARGET,
              height: PIN_TARGET,
              marginLeft: -PIN_TARGET / 2,
              marginTop: -PIN_TARGET / 2,
            }}>
            {empty ? (
              <View className="h-9 w-9 items-center justify-center rounded-full border-2 border-dashed border-coin bg-ink/70">
                <Plus size={20} strokeWidth={3} color={colors.coin} />
              </View>
            ) : (
              <View className="rounded-[14px] border-2 border-ink/60">
                <MachineThumb lineId={slot.lineId} quality={slot.quality} size={32} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}
