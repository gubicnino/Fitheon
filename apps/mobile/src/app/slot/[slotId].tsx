import type { GymId, Quality } from '@fitheon/catalog';
import type { Action, ActionError } from '@fitheon/game';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowUp, Lock, Repeat, X } from 'lucide-react-native';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { gymView } from '@/state/selectors';
import { failureReason, slotSheetView, type SheetOption, type SlotSheetView } from '@/state/slotSheet';
import { useApp } from '@/state/store';
import { Button } from '@/ui/Button';
import { CoinIcon } from '@/ui/CoinIcon';
import { formatNumber } from '@/ui/labels';
import { MachineThumb } from '@/ui/MachineThumb';
import { QualityTag } from '@/ui/QualityTag';
import { Text } from '@/ui/Text';
import { colors } from '@/ui/tokens';

// Full class names, so Tailwind finds them when it scans the source.
const LADDER_CLASS: Record<Quality, string> = { 1: 'bg-q1', 2: 'bg-q2', 3: 'bg-q3', 4: 'bg-q4' };
const TIERS: Quality[] = [1, 2, 3, 4];

type Run = (action: Action, lineId?: string) => void;

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View className="flex-row items-start justify-between gap-3 px-5 pb-3 pt-4">
      <View className="min-w-0 flex-1">
        <Text className="font-bold text-xl" numberOfLines={1}>
          {title}
        </Text>
        <Text className="mt-1 text-sm text-muted">{subtitle}</Text>
      </View>
      <Pressable
        onPress={() => router.back()}
        hitSlop={8}
        className="h-8 w-8 items-center justify-center rounded-full bg-raised active:opacity-60"
        accessibilityRole="button"
        accessibilityLabel="Close">
        <X size={16} color={colors.muted} />
      </Pressable>
    </View>
  );
}

function SectionTitle({ icon, children }: { icon?: ReactNode; children: string }) {
  return (
    <View className="mt-6 flex-row items-center gap-2">
      {icon}
      <Text className="font-semibold text-sm text-muted">{children}</Text>
    </View>
  );
}

function Row({
  lineId,
  quality,
  name,
  meta,
  action,
}: {
  lineId: string;
  quality: Quality;
  name: string;
  meta: string | null;
  action: ReactNode;
}) {
  return (
    <View className="flex-row items-center gap-3 border-b border-line py-3">
      <MachineThumb lineId={lineId} quality={quality} size={44} />
      <View className="min-w-0 flex-1">
        <View className="flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Text className="font-semibold text-base">{name}</Text>
          <QualityTag quality={quality} />
        </View>
        {meta !== null && <Text className="mt-0.5 text-xs leading-snug text-muted">{meta}</Text>}
      </View>
      <View className="shrink-0">{action}</View>
    </View>
  );
}

function BuyRow({ option, busy, onBuy }: { option: SheetOption; busy: boolean; onBuy: () => void }) {
  const locked = option.blocked !== null && option.blocked !== 'insufficient_coins';
  const action = locked ? (
    <View
      className="flex-row items-center gap-1 rounded-full bg-raised px-3 py-2"
      accessibilityLabel={`${option.name} is locked`}>
      <Lock size={13} color={colors.muted} />
      <Text className="font-medium text-sm text-muted" style={{ fontVariant: ['tabular-nums'] }}>
        {formatNumber(option.price)}
      </Text>
    </View>
  ) : (
    <Button
      label={formatNumber(option.price)}
      icon={<CoinIcon size={14} />}
      disabled={option.blocked !== null || busy}
      onPress={onBuy}
      accessibilityLabel={`Buy ${option.name} for ${formatNumber(option.price)} coins`}
    />
  );
  return (
    <Row
      lineId={option.lineId}
      quality={option.startQuality}
      name={option.name}
      meta={option.reason ?? `Starts at ${option.startQualityName}`}
      action={action}
    />
  );
}

function BuyList({ view, busy, run, gymId }: { view: SlotSheetView; busy: boolean; run: Run; gymId: GymId }) {
  const open = view.buy.filter(o => o.blocked === null || o.blocked === 'insufficient_coins');
  const locked = view.buy.filter(o => o.blocked !== null && o.blocked !== 'insufficient_coins');
  const buy = (lineId: string) =>
    run({ type: 'install', gymId, slotId: view.slotId, lineId }, lineId);
  return (
    <>
      {open.map(o => (
        <BuyRow key={o.lineId} option={o} busy={busy} onBuy={() => buy(o.lineId)} />
      ))}
      {locked.length > 0 && (
        <>
          <SectionTitle icon={<Lock size={14} color={colors.muted} />}>Locked</SectionTitle>
          {locked.map(o => (
            <BuyRow key={o.lineId} option={o} busy={busy} onBuy={() => buy(o.lineId)} />
          ))}
        </>
      )}
    </>
  );
}

function TierLadder({ current }: { current: Quality }) {
  return (
    <View className="mt-2.5 flex-row gap-1" accessibilityLabel={`Quality ${current} of 4`}>
      {TIERS.map(t => (
        <View key={t} className={`h-1.5 flex-1 rounded-full ${t <= current ? LADDER_CLASS[t] : 'bg-line'}`} />
      ))}
    </View>
  );
}

function Installed({ view, busy, run, gymId }: { view: SlotSheetView; busy: boolean; run: Run; gymId: GymId }) {
  const installed = view.installed;
  if (!installed) return null;
  const { upgrade } = view;
  return (
    <>
      <View className="flex-row items-center gap-4 rounded-2xl bg-raised p-4">
        <MachineThumb lineId={installed.lineId} quality={installed.quality} size={56} />
        <View className="min-w-0 flex-1">
          <QualityTag quality={installed.quality} />
          <TierLadder current={installed.quality} />
        </View>
      </View>

      {upgrade !== null &&
        (upgrade.blocked === null || upgrade.blocked === 'insufficient_coins' ? (
          <View className="mt-3 flex-row items-center gap-3 rounded-2xl p-1">
            <ArrowUp size={16} color={colors.muted} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm">Upgrade to {upgrade.toName}</Text>
              {upgrade.reason !== null && <Text className="text-xs text-muted">{upgrade.reason}</Text>}
            </View>
            <Button
              label={formatNumber(upgrade.price)}
              icon={<CoinIcon size={14} />}
              disabled={upgrade.blocked !== null || busy}
              onPress={() => run({ type: 'upgrade', gymId, slotId: view.slotId })}
              accessibilityLabel={`Upgrade to ${upgrade.toName} for ${formatNumber(upgrade.price)} coins`}
            />
          </View>
        ) : (
          <View className="mt-3 flex-row items-start gap-3 rounded-2xl p-1">
            <Lock size={16} color={colors.faint} style={{ marginTop: 2 }} />
            <Text className="min-w-0 flex-1 text-sm text-muted">
              Upgrading to <Text className="font-semibold text-sm">{upgrade.toName}</Text>: {upgrade.reason}.
            </Text>
          </View>
        ))}

      {view.stored.length > 0 && (
        <>
          <SectionTitle icon={<Repeat size={14} color={colors.muted} />}>Stored</SectionTitle>
          {view.stored.map(m => (
            <Row
              key={m.lineId}
              lineId={m.lineId}
              quality={m.quality}
              name={m.name}
              meta="Swapping back is free"
              action={
                <Button
                  label="Swap back"
                  variant="go"
                  disabled={busy}
                  onPress={() => run({ type: 'swap', gymId, slotId: view.slotId, lineId: m.lineId })}
                  accessibilityLabel={`Swap back to ${m.name}, free`}
                />
              }
            />
          ))}
        </>
      )}

      <SectionTitle icon={<Repeat size={14} color={colors.muted} />}>Replace with</SectionTitle>
      <BuyList view={view} busy={busy} run={run} gymId={gymId} />
      <Text className="mt-3 text-xs text-faint">
        A replaced machine stays stored in this slot. Swapping back is free.
      </Text>
    </>
  );
}

/** The slot sheet: buy a machine for an empty slot, or upgrade, replace and swap in a filled one. */
export default function SlotSheet() {
  const { slotId } = useLocalSearchParams<'/slot/[slotId]'>();
  const insets = useSafeAreaInsets();
  const app = useApp(s => s.app);
  const dispatch = useApp(s => s.dispatch);
  const view = useMemo(() => slotSheetView(app, slotId), [app, slotId]);
  const gym = useMemo(() => gymView(app), [app]);

  // A second tap before the sheet closes must not buy twice. The ref blocks it at once; the state
  // greys the buttons out on the next render.
  const pending = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run: Run = (action, lineId) => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const result = dispatch(action);
    if (result.ok) {
      router.back();
      return;
    }
    const failed: ActionError = result.error;
    setError(failureReason(useApp.getState().app, slotId, failed, lineId));
    pending.current = false;
    setBusy(false);
  };

  if (!view) {
    return (
      <View className="flex-1 bg-surface pt-3">
        <Header title="Unknown slot" subtitle="This slot is not in your current gym." />
      </View>
    );
  }

  const where = `${gym.name} · up to ${gym.qualityCapName} quality`;
  // The ScrollView is the sheet's root, so iOS treats it as the sheet's scroll view: the sheet is
  // dragged from the top edge and its layout follows the detent. The header sticks at the top.
  return (
    <ScrollView
      className="flex-1 bg-surface"
      stickyHeaderIndices={[0]}
      contentInsetAdjustmentBehavior="never"
      contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>
      <View className="bg-surface pt-3">
        <Header
          title={view.installed ? view.installed.name : view.title}
          subtitle={view.installed ? `${view.title} · ${where}` : where}
        />
        {error !== null && (
          <View className="mx-5 mb-2 rounded-xl bg-danger/[.12] px-3 py-2" accessibilityLiveRegion="polite">
            <Text className="text-sm text-danger">{error}</Text>
          </View>
        )}
      </View>
      <View className="px-5">
        {view.installed ? (
          <Installed view={view} busy={busy} run={run} gymId={gym.gymId} />
        ) : (
          <BuyList view={view} busy={busy} run={run} gymId={gym.gymId} />
        )}
      </View>
    </ScrollView>
  );
}
