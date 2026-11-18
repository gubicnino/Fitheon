import type { RawWorkout } from '@fitheon/engine';
import { useState } from 'react';
import { View } from 'react-native';

import type { AppState } from '@/state/appState';
import { now, useApp } from '@/state/store';
import { Button } from '@/ui/Button';
import { formatNumber } from '@/ui/labels';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

// Temporary: a 45-minute strength workout, so the slot sheet can be tried with coins. The
// Developer section of plan Task 14 replaces it with the mock health source.
const SIMULATED_MINUTES = 45;
const SIMULATED_PREFIX = 'simulated-';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The first one ends now; each later one ends a day before the earliest simulated workout, so
 * every tap is a new active day. Past 14 days back the engine marks them invalid.
 */
function nextEnd(app: AppState): string {
  let end = Date.parse(now(app));
  for (const w of app.workouts) {
    if (w.hkUuid.startsWith(SIMULATED_PREFIX)) end = Math.min(end, Date.parse(w.endAt) - DAY_MS);
  }
  return new Date(end).toISOString();
}

function simulatedWorkout(endIso: string): RawWorkout {
  const end = new Date(endIso);
  const start = new Date(end.getTime() - SIMULATED_MINUTES * 60_000);
  return {
    hkUuid: `${SIMULATED_PREFIX}${end.getTime()}`,
    activityType: 'TraditionalStrengthTraining',
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    durationS: SIMULATED_MINUTES * 60,
    mets: null,
    sourceBundle: 'com.fitheon.simulated',
    title: 'Simulated workout',
    userEntered: false,
  };
}

export default function SettingsScreen() {
  const syncWorkouts = useApp(s => s.syncWorkouts);
  const [result, setResult] = useState<string | null>(null);

  const simulate = () => {
    const summary = syncWorkouts([simulatedWorkout(nextEnd(useApp.getState().app))]);
    const status = summary.workouts[0]?.status ?? 'none';
    setResult(
      status === 'counted'
        ? `+${formatNumber(summary.coins)} coins, +${formatNumber(summary.xp)} XP`
        : `Nothing earned (${status.replace('_', ' ')})`,
    );
  };

  return (
    <Screen>
      <View className="px-4 pt-2">
        <Text className="font-bold text-2xl" accessibilityRole="header">
          Settings
        </Text>
        <Text className="mt-1 text-sm text-muted">
          Weekly goal and account settings arrive in a later update.
        </Text>
      </View>

      <View className="mx-4 mt-6 rounded-2xl bg-surface p-4">
        <Text className="font-semibold text-xs uppercase tracking-wide text-faint">Developer</Text>
        <Text className="mt-1 text-sm text-muted">
          Adds a {SIMULATED_MINUTES}-minute strength workout. The first ends now, each next one a day earlier.
        </Text>
        <View className="mt-3 flex-row items-center gap-3">
          <Button label="Simulate workout" onPress={simulate} />
          {result !== null && <Text className="min-w-0 flex-1 text-sm text-muted">{result}</Text>}
        </View>
      </View>
    </Screen>
  );
}
