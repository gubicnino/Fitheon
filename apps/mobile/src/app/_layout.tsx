import '@/global.css';

import {
  Rubik_400Regular,
  Rubik_500Medium,
  Rubik_600SemiBold,
  Rubik_700Bold,
  Rubik_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/rubik';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/ui/tokens';

SplashScreen.preventAutoHideAsync();

// The slot sheet opens at about two thirds of the screen and can be dragged to full height.
const SLOT_SHEET_DETENTS = [0.65, 1];
const SLOT_SHEET_CORNER_RADIUS = 24;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Rubik_400Regular,
    Rubik_500Medium,
    Rubik_600SemiBold,
    Rubik_700Bold,
    Rubik_800ExtraBold,
  });
  // A font that fails to load falls back to the system font; the app still opens.
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.ink } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="slot/[slotId]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: SLOT_SHEET_DETENTS,
            sheetGrabberVisible: true,
            sheetCornerRadius: SLOT_SHEET_CORNER_RADIUS,
            contentStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
    </>
  );
}
