import {
  Saira_500Medium,
  Saira_600SemiBold,
  Saira_700Bold,
  Saira_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/saira";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useCallback, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import { PickrSplash } from "@/components/splash/pickr-splash";
import { SplashRevealProvider } from "@/components/splash/splash-reveal";
import { SheetDepthProvider } from "@/components/ui/sheet-depth";
import { AppThemeProvider, useAppTheme } from "@/lib/app-theme";
import { BookingProvider } from "@/lib/booking";
import { SessionProvider, useSession } from "@/lib/session";
import { SitesProvider } from "@/lib/sites";
import { TripRunner } from "@/lib/trip-runner";
import { TripsProvider } from "@/lib/trips";

/** Profile sub-pages under src/app/profile/. */
const PROFILE_PAGES = [
  "account",
  "rating",
  "help",
  "rides",
  "payment",
  "coins",
  "truck-pass",
  "notifications",
  "favourites",
  "theme",
  "privacy",
  "about",
] as const;

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppThemeProvider>
        <SessionProvider>
          <TripsProvider>
            <TripRunner />
            <SitesProvider>
              <BookingProvider>
                <RootShell />
              </BookingProvider>
            </SitesProvider>
          </TripsProvider>
        </SessionProvider>
      </AppThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootShell() {
  const { loaded: sessionLoaded, session } = useSession();
  const { brand, dark } = useAppTheme();
  const theme = {
    ...(dark ? DarkTheme : DefaultTheme),
    colors: {
      ...(dark ? DarkTheme : DefaultTheme).colors,
      background: brand.background,
      card: brand.card,
      text: brand.text,
      border: brand.border,
      primary: brand.primary,
    },
  };
  const [fontsLoaded, fontError] = useFonts({
    Saira_500Medium,
    Saira_600SemiBold,
    Saira_700Bold,
    Saira_800ExtraBold,
  });
  const [revealed, setRevealed] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  // The splash itself draws with the brand font, so the native splash stays
  // up until fonts settle; a font error falls back to system fonts.
  const fontsSettled = fontsLoaded || fontError !== null;
  const workspaceReady = fontsSettled && sessionLoaded;

  const handleRevealStart = useCallback(() => setRevealed(true), []);
  const handleSplashFinish = useCallback(() => setSplashVisible(false), []);

  return (
    <ThemeProvider value={theme}>
      <SplashRevealProvider revealed={revealed}>
        {workspaceReady && (
          <SheetDepthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                // Forward pushes slide in from the right while the page below drifts left (iOS-style parallax, Android too).
                animation: "ios_from_right",
                animationDuration: 350,
                contentStyle: { backgroundColor: brand.card },
              }}
            >
              <Stack.Protected guard={session !== null}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="book/material" />
                <Stack.Screen name="book/route" />
                <Stack.Screen name="book/site" />
                <Stack.Screen name="book/truck" />
                <Stack.Screen name="book/pass" />
                <Stack.Screen name="service" options={{ animation: "fade" }} />
                <Stack.Screen name="book/review" />
                <Stack.Screen
                  name="book/voice"
                  // A sheet over the current screen (Siri-style), so the page behind stays visible.
                  options={{ presentation: "transparentModal", animation: "slide_from_bottom", contentStyle: { backgroundColor: "transparent" } }}
                />
                <Stack.Screen name="loads/[id]" />
                {PROFILE_PAGES.map((page) => (
                  <Stack.Screen key={page} name={`profile/${page}`} />
                ))}
                <Stack.Screen
                  name="book/map"
                  options={{ animation: "slide_from_bottom" }}
                />
                {/* Finished flow: no swipe back into the submitted form. */}
                <Stack.Screen
                  name="book/submitted"
                  options={{ gestureEnabled: false }}
                />
                <Stack.Screen
                  name="trip/[id]"
                  // The screen runs its own zoom (src/lib/transitions.ts); the stack only cross-fades.
                  options={{ animation: "fade", animationDuration: 180 }}
                />
              </Stack.Protected>
              <Stack.Protected guard={session === null}>
                <Stack.Screen name="(onboarding)/auth" />
                <Stack.Screen name="(onboarding)/otp" />
                <Stack.Screen name="(onboarding)/register" />
              </Stack.Protected>
            </Stack>
          </SheetDepthProvider>
        )}
      </SplashRevealProvider>
      {splashVisible && (
        <PickrSplash
          canStart={fontsSettled}
          isReady={workspaceReady}
          onRevealStart={handleRevealStart}
          onFinish={handleSplashFinish}
        />
      )}
    </ThemeProvider>
  );
}
