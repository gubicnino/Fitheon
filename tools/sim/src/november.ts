import { levelForXp, processWorkouts } from '@fitheon/engine';
import { NOVEMBER_2026, NOVEMBER_NOW, NOVEMBER_TZ } from '@fitheon/engine/fixtures/november2026';

const result = processWorkouts({
  now: NOVEMBER_NOW, timeZone: NOVEMBER_TZ, history: [], incoming: NOVEMBER_2026,
  defaultWeeklyGoal: 3, weekGoals: {}, bonusAwardedWeeks: [],
});

console.table(result.workouts.map(w => ({
  date: w.localDate ?? w.startAt,
  activity: w.activityType,
  minutes: (w.durationS / 60).toFixed(1),
  mets: w.mets === null ? '—' : w.mets.toFixed(2),
  multiplier: w.multiplier ?? '—',
  coins: w.coins,
  xp: w.xp,
  status: w.status,
})));

for (const bonus of result.weeklyBonuses) {
  console.log(`Weekly goal reached (week of ${bonus.weekStart}): +${bonus.xp} XP`);
}
console.log(`Totals: ${result.coins} coins, ${result.xp} XP, level ${levelForXp(result.xp)}`);
