import { ENGINE_VERSION } from '@fitheon/engine';
import { initialState } from '@fitheon/game';
import { Text, View } from 'react-native';

// Temporary NativeWind check (plan Task 2, Step 5); Task 3 replaces this screen.
export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center gap-2 bg-ink">
      <Text className="font-bold text-2xl text-coin">Fitheon</Text>
      <Text className="text-sm text-muted">
        Engine v{ENGINE_VERSION} · {initialState().coins} coins
      </Text>
    </View>
  );
}
