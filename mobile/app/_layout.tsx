import FontAwesome from "@expo/vector-icons/FontAwesome";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, router, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import "react-native-reanimated";

import { ThemeProvider } from "@/components/ThemeContext";
import { ToastProvider } from "@/components/Toast";
import { useColorScheme } from "@/components/useColorScheme";
import authService from "@/services/auth";

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from "expo-router";

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: "(tabs)",
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    ...FontAwesome.font,
  });

  const [isAuthLoaded, setIsAuthLoaded] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const segments = useSegments();

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    async function checkAuth() {
      try {
        const authed = await authService.isAuthenticated();
        setIsAuthenticated(authed);
      } catch (e) {
        setIsAuthenticated(false);
      } finally {
        setIsAuthLoaded(true);
      }
    }

    checkAuth();

    // Subscribe to auth changes (login/logout)
    const unsubscribe = authService.subscribe(() => {
      checkAuth();
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (loaded && isAuthLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, isAuthLoaded]);

  useEffect(() => {
    if (!isAuthLoaded || !loaded) return;

    const inAuthGroup = segments[0] === "auth";

    if (!isAuthenticated && !inAuthGroup) {
      // Avoid redundant redirects
      router.replace("/auth/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Avoid redundant redirects
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isAuthLoaded, segments, loaded]);

  if (!loaded || !isAuthLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { theme } = useColorScheme();

  useEffect(() => {
    // Request notification permissions on mount
    const NotificationService = require('@/services/NotificationService').default;
    NotificationService.requestPermissions();
  }, []);

  return (
    <NavigationThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>

      <ToastProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
          <Stack.Screen name="subscription" options={{ headerShown: false }} />
        </Stack>
      </ToastProvider>
    </NavigationThemeProvider>
  );
}
