import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/ui/TabBar';
import { colors } from '@/ui/tokens';

/** The four tabs in the design's order. TabBar draws the bar; screens draw their own headers. */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={props => <TabBar {...props} />}
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.ink } }}>
      <Tabs.Screen name="index" options={{ title: 'Gym' }} />
      <Tabs.Screen name="gyms" options={{ title: 'Gyms' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
