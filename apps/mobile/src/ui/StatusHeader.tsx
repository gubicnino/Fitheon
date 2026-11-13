import { WEEKLY_BONUS_XP } from '@fitheon/engine';
import { View } from 'react-native';

import { CoinIcon } from './CoinIcon';
import { formatNumber } from './labels';
import { Text } from './Text';

type Props = {
  coins: number;
  level: number;
  xpInto: number;
  xpNeeded: number;
  goalDone: number;
  goal: number;
};

/** The game header: level and XP, coins, weekly goal. Sits at the top of a Screen. */
export function StatusHeader({ coins, level, xpInto, xpNeeded, goalDone, goal }: Props) {
  const pct = xpNeeded > 0 ? Math.min(100, Math.round((xpInto / xpNeeded) * 100)) : 0;
  const goalReached = goalDone >= goal;

  return (
    <View className="px-4 pb-3 pt-2">
      <View className="flex-row items-center gap-3">
        <View
          className="h-11 w-11 items-center justify-center rounded-xl bg-xp"
          accessible
          accessibilityLabel={`Level ${level}`}>
          <Text className="font-semibold text-[9px] uppercase tracking-wide text-xp-ink opacity-70">
            Lv
          </Text>
          <Text className="font-bold text-lg leading-5 text-xp-ink tabular-nums">{level}</Text>
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-baseline justify-between gap-2">
            <Text className="font-medium text-xs" numberOfLines={1}>
              Level {level + 1} in {xpNeeded - xpInto} XP
            </Text>
            <Text className="text-xs text-muted tabular-nums">
              {xpInto}/{xpNeeded}
            </Text>
          </View>
          <View
            className="mt-1.5 h-2 overflow-hidden rounded-full bg-raised"
            accessibilityRole="progressbar"
            accessibilityLabel="XP to next level"
            accessibilityValue={{ min: 0, max: xpNeeded, now: xpInto }}>
            <View className="h-full rounded-full bg-xp" style={{ width: `${pct}%` }} />
          </View>
        </View>

        <View
          className="flex-row items-center gap-1.5 rounded-full border border-line bg-surface py-1.5 pl-2 pr-3"
          accessible
          accessibilityLabel={`${formatNumber(coins)} coins`}>
          <CoinIcon size={18} />
          <Text className="font-bold text-base tabular-nums">{formatNumber(coins)}</Text>
        </View>
      </View>

      <View className="mt-3 flex-row items-center gap-2.5">
        <View className="flex-row gap-1">
          {Array.from({ length: goal }, (_, i) => (
            <View
              key={i}
              className={`h-1.5 w-5 rounded-full ${i < goalDone ? 'bg-go' : 'bg-raised'}`}
            />
          ))}
        </View>
        {goalReached ? (
          <Text className="text-xs text-go">Weekly goal reached · +{WEEKLY_BONUS_XP} XP</Text>
        ) : (
          <Text className="text-xs text-muted">
            {goalDone} of {goal} active days this week
          </Text>
        )}
      </View>
    </View>
  );
}
