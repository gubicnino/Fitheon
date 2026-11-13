import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Activity, Building2, House, Settings, type LucideIcon } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { Text } from './Text';
import { colors } from './tokens';

export type TabId = 'gym' | 'gyms' | 'activity' | 'settings';

type TabDef = { id: TabId; route: string; label: string; Icon: LucideIcon };

/** The four tabs in the design's order, with the route name each one opens. */
const TABS: readonly TabDef[] = [
  { id: 'gym', route: 'index', label: 'Gym', Icon: House },
  { id: 'gyms', route: 'gyms', label: 'Gyms', Icon: Building2 },
  { id: 'activity', route: 'activity', label: 'Activity', Icon: Activity },
  { id: 'settings', route: 'settings', label: 'Settings', Icon: Settings },
];

const MIN_BOTTOM_PADDING = 8;

type ViewProps = { active: TabId | null; bottomInset: number; onPress?: (id: TabId) => void };

/** The tab bar as drawn in the design, without any navigation. */
export function TabBarView({ active, bottomInset, onPress }: ViewProps) {
  return (
    <View
      className="flex-row border-t border-line bg-ink/95 pt-2"
      style={{ paddingBottom: Math.max(bottomInset, MIN_BOTTOM_PADDING) }}
      accessibilityRole="tablist">
      {TABS.map(({ id, label, Icon }) => {
        const isActive = id === active;
        return (
          <Pressable
            key={id}
            onPress={() => onPress?.(id)}
            className="min-h-[44px] flex-1 items-center justify-center gap-1 py-1 active:opacity-60"
            accessibilityRole="tab"
            accessibilityLabel={label}
            accessibilityState={{ selected: isActive }}>
            <Icon
              size={22}
              strokeWidth={isActive ? 2.4 : 1.8}
              color={isActive ? colors.fg : colors.faint}
            />
            <Text className={`font-medium text-[11px] ${isActive ? 'text-fg' : 'text-faint'}`}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The custom tab bar Expo Router's JavaScript Tabs renders. */
export function TabBar({ state, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const focused = state.routes[state.index];
  const active = TABS.find(t => t.route === focused?.name)?.id ?? null;

  const handlePress = (id: TabId) => {
    const routeName = TABS.find(t => t.id === id)?.route;
    const route = state.routes.find(r => r.name === routeName);
    if (!route) return;
    const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
    if (route.key !== focused?.key && !event.defaultPrevented) navigateToTab(route.key);
  };

  return <TabBarView active={active} bottomInset={insets.bottom} onPress={handlePress} />;
}
