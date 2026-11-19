import { useMemo } from 'react';
import { SectionList, View } from 'react-native';

import { activityDays, type ActivityDay, type ActivityRow } from '@/state/selectors';
import { useApp } from '@/state/store';
import { CoinIcon } from '@/ui/CoinIcon';
import { dayLabel, formatNumber, multiplierLabel } from '@/ui/labels';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const TABULAR = { fontVariant: ['tabular-nums' as const] };

type Section = { key: string; title: string; data: ActivityRow[] };

function toSections(days: ActivityDay[]): Section[] {
  return days.map(day => ({
    key: day.localDate ?? 'unreadable',
    title: day.localDate ? dayLabel(day.localDate) : 'Unknown date',
    data: day.workouts,
  }));
}

function WorkoutRow({ w }: { w: ActivityRow }) {
  const counted = w.status === 'counted';
  return (
    <View className={`mx-4 flex-row items-center gap-3 border-b border-line py-3 ${counted ? '' : 'opacity-50'}`}>
      <View className="min-w-0 flex-1">
        <Text className="font-medium text-base" numberOfLines={1}>
          {w.title ?? w.activityLabel}
        </Text>
        <Text className="mt-0.5 text-xs text-muted" numberOfLines={1}>
          {w.title ? `${w.activityLabel} · ` : ''}
          {w.minutes} min · {w.source}
        </Text>
      </View>
      {counted ? (
        <View className="items-end">
          <View className="flex-row items-center gap-1.5">
            <CoinIcon size={14} />
            <Text className="font-medium text-sm" style={TABULAR}>
              {w.coins > 0 ? '+' : ''}
              {formatNumber(w.coins)}
            </Text>
          </View>
          <View className="mt-0.5 flex-row gap-2">
            {w.multiplier !== null && (
              <Text className="text-xs text-muted" style={TABULAR}>
                {multiplierLabel(w.multiplier)}
              </Text>
            )}
            {w.xp > 0 && (
              <Text className="text-xs text-xp" style={TABULAR}>
                +{w.xp} XP
              </Text>
            )}
          </View>
        </View>
      ) : (
        <Text className="font-medium text-xs text-muted">{w.reason}</Text>
      )}
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-8">
      <Text className="font-semibold text-lg">No workouts yet</Text>
      <Text className="mt-1 text-center text-sm text-muted">
        Your workouts appear here after a sync with Apple Health.
      </Text>
    </View>
  );
}

/** Every processed workout, grouped by day, newest first. Uncounted ones say why. */
export default function ActivityScreen() {
  const app = useApp(s => s.app);
  const sections = useMemo(() => toSections(activityDays(app)), [app]);

  return (
    <Screen>
      <View className="px-4 pb-3 pt-4">
        <Text className="font-bold text-3xl">Activity</Text>
      </View>
      {sections.length === 0 ? (
        <EmptyState />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <WorkoutRow w={item} />}
          renderSectionHeader={({ section }) => (
            <View className="bg-ink px-4 pb-1.5 pt-5">
              <Text className="font-semibold text-xs text-muted">{section.title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled
          // NativeWind does not wrap SectionList, so the padding is a plain style.
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </Screen>
  );
}
