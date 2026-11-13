import { View } from 'react-native';

import { Screen } from './Screen';
import { Text } from './Text';

type Props = { title: string; note: string };

/** A tab whose real screen arrives in a later update: its title and a short note. */
export function Placeholder({ title, note }: Props) {
  return (
    <Screen>
      <View className="px-4 pt-2">
        <Text className="font-bold text-2xl" accessibilityRole="header">
          {title}
        </Text>
      </View>
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-center text-sm text-muted">{note}</Text>
      </View>
    </Screen>
  );
}
