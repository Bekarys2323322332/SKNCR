import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import "./globals.css";

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      const logged = await AsyncStorage.getItem("isLoggedIn");
      const onboarded = await AsyncStorage.getItem("onboarded");
      setIsLoggedIn(logged === "true");
      setIsOnboarded(onboarded === "true");
      setLoading(false);
    };
    loadState();
  }, []);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* DECLARE YOUR GROUPS HERE */}
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />

      {/* INITIAL ROUTE REDIRECTS */}
      {!isLoggedIn ? (
        <Redirect href="/(auth)/login" />
      ) : !isOnboarded ? (
        <Redirect href="/(auth)/skincare" />
      ) : (
        <Redirect href="/(tabs)" />
      )}
    </Stack>
  );
}
