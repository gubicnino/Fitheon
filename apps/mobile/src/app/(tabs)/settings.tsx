import type { RawWorkout } from '@fitheon/engine';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Modal, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { generateWorkout, mockHealthSource } from '@/health/healthSource';
import type { SyncSummary } from '@/state/appState';
import { now, useApp } from '@/state/store';
import { unlocksBetween } from '@/state/unlocks';
import { Button } from '@/ui/Button';
import { RewardSummary } from '@/ui/RewardSummary';
import { Screen } from '@/ui/Screen';
import { Text } from '@/ui/Text';

const DAY_MS = 24 * 60 * 60 * 1000;

function clockLabel(iso: string, offsetMs: number): string {
  const date = new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const days = Math.round(offsetMs / DAY_MS);
  return days === 0 ? `${date} (today)` : `${date} (+${days} ${days === 1 ? 'day' : 'days'})`;
}

export default function SettingsScreen() {
  const app = useApp(s => s.app);
  const syncWorkouts = useApp(s => s.syncWorkouts);
  const advanceClock = useApp(s => s.advanceClock);
  const reset = useApp(s => s.reset);
  const [summary, setSummary] = useState<SyncSummary | null>(null);
  const [busy, setBusy] = useState(false);

  // The current state, not the render's: two taps in one frame must see each other's result.
  const currentNow = () => now(useApp.getState().app);

  const runSync = (incoming: RawWorkout[]) => setSummary(syncWorkouts(incoming));

  const simulate = () => runSync([generateWorkout(currentNow(), Math.random())]);

  const importNovember = async () => {
    if (busy) return;
    setBusy(true);
    try {
      runSync(await mockHealthSource.fetchWorkouts(currentNow()));
    } finally {
      setBusy(false);
    }
  };

  const confirmReset = () => {
    Alert.alert('Reset game?', 'Coins, XP, machines and workouts go back to a new game.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reset', style: 'destructive', onPress: reset },
    ]);
  };

  const closeSummary = () => {
    setSummary(null);
    router.navigate('/');
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
        <Text className="font-semibold text-xs uppercase tracking-wide text-faint">Developer · mock workouts</Text>
        <Text className="mt-1 text-sm text-muted">
          Apple Health is not available in Expo Go, so these buttons stand in for it.
        </Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          <Button label="Simulate workout" onPress={simulate} />
          <Button label="Import November week" variant="quiet" onPress={importNovember} disabled={busy} />
          <Button label="Next day" variant="quiet" onPress={() => advanceClock(DAY_MS)} />
          <Button label="Reset game" variant="quiet" onPress={confirmReset} />
        </View>
        <Text className="mt-3 text-xs text-muted" style={{ fontVariant: ['tabular-nums'] }}>
          Simulated date: {clockLabel(now(app), app.clockOffsetMs)}
        </Text>
      </View>

      <Modal
        visible={summary !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={closeSummary}>
        {/* A modal is its own native window, so it needs its own safe-area measurement. */}
        <SafeAreaProvider>
          {summary !== null && (
            <RewardSummary
              summary={summary}
              unlocks={unlocksBetween(summary.levelBefore, summary.levelAfter)}
              onContinue={closeSummary}
            />
          )}
        </SafeAreaProvider>
      </Modal>
    </Screen>
  );
}
