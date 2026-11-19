import { useEffect } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Animated, {
  Easing,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { SyncSummary } from '@/state/appState';
import { rewardView } from '@/state/rewardSummary';
import type { Unlock } from '@/state/unlocks';

import { CoinIcon } from './CoinIcon';
import { formatNumber } from './labels';
import { Text } from './Text';

type Props = { summary: SyncSummary; unlocks: Unlock[]; onContinue(): void };

const LEVEL_UP_MS = 300;
const LEVEL_UP_FROM_SCALE = 0.8;

const UNLOCK_KIND: Record<Unlock['kind'], string> = { machine: 'Machine', quality: 'Quality', gym: 'Gym' };

/** The level, scaling and fading in once. With reduce motion on, it simply appears. */
function LevelUp({ level, detail }: { level: number; detail: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, {
      duration: LEVEL_UP_MS,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: LEVEL_UP_FROM_SCALE + (1 - LEVEL_UP_FROM_SCALE) * progress.value }],
  }));

  return (
    <Animated.View style={style}>
      <View className="mt-6 items-center rounded-2xl bg-xp p-5">
        <Text className="font-semibold text-xs uppercase tracking-wide text-xp-ink">Level up</Text>
        <Text className="mt-1 font-extrabold text-4xl text-xp-ink" accessibilityRole="header">
          Level {level}
        </Text>
        <Text className="mt-0.5 text-sm text-xp-ink">{detail}</Text>
      </View>
    </Animated.View>
  );
}

/** What a sync earned: coins, XP, the level and what it unlocked, or why nothing was earned. */
export function RewardSummary({ summary, unlocks, onContinue }: Props) {
  const insets = useSafeAreaInsets();
  const view = rewardView(summary);
  const total = summary.workouts.length;

  return (
    <View className="flex-1 bg-ink" style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}>
      <ScrollView className="flex-1" contentContainerClassName="px-6 pb-6 pt-10">
        <Text className="font-medium text-sm text-muted">
          {total === 1 ? '1 new workout' : `${formatNumber(total)} new workouts`}
        </Text>
        <Text className="mt-1 font-bold text-3xl leading-tight" accessibilityRole="header">
          {view.nothingEarned ? 'Nothing earned this time.' : view.leveledUp ? 'You levelled up!' : 'Workout counted.'}
        </Text>

        {view.leveledUp && <LevelUp level={summary.levelAfter} detail={view.levelDetail} />}

        {view.nothingEarned ? (
          <View className="mt-6 rounded-3xl border border-line bg-surface p-6">
            <Text className="font-semibold text-lg">{view.reason}</Text>
            <Text className="mt-1 text-sm text-muted">No coins or XP were added.</Text>
          </View>
        ) : (
          <View className="mt-6 rounded-3xl border border-line bg-surface p-6">
            <View className="flex-row items-center gap-3">
              <CoinIcon size={40} />
              <Text className="font-bold text-5xl" style={{ fontVariant: ['tabular-nums'] }}>
                {formatNumber(summary.coins)}
              </Text>
            </View>
            <Text className="mt-1 text-sm text-muted">{view.coinsDetail}</Text>

            <View className="mt-6 flex-row gap-px overflow-hidden rounded-2xl bg-line">
              <View className="flex-1 bg-raised p-4">
                <Text className="font-bold text-2xl text-xp" style={{ fontVariant: ['tabular-nums'] }}>
                  +{formatNumber(summary.xp)} XP
                </Text>
                <Text className="mt-0.5 text-xs text-muted">{view.xpDetail}</Text>
              </View>
              <View className="flex-1 bg-raised p-4">
                <Text className="font-bold text-2xl" style={{ fontVariant: ['tabular-nums'] }}>
                  Level {summary.levelAfter}
                </Text>
                <Text className="mt-0.5 text-xs text-muted">{view.levelDetail}</Text>
              </View>
            </View>
          </View>
        )}

        {unlocks.length > 0 && (
          <>
            <Text className="mt-8 font-semibold text-sm text-muted">Unlocked</Text>
            <View className="mt-2">
              {unlocks.map(u => (
                <View
                  key={`${u.kind}-${u.name}`}
                  className="flex-row items-baseline justify-between gap-3 border-b border-line py-2.5">
                  <Text className="font-medium text-base">{u.name}</Text>
                  <Text className="text-sm text-muted">
                    {UNLOCK_KIND[u.kind]} · level {u.level}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {view.notCounted !== null && <Text className="mt-4 text-xs text-faint">{view.notCounted}</Text>}
      </ScrollView>

      <View className="px-6 pb-6 pt-4">
        <Pressable
          onPress={onContinue}
          accessibilityRole="button"
          className="items-center rounded-2xl bg-coin py-4 active:opacity-80">
          <Text className="font-semibold text-base text-coin-ink">See your garage</Text>
        </Pressable>
      </View>
    </View>
  );
}
