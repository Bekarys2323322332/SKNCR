
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import './globals.css';

export default function RootLayout() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load onboarding + login state from storage
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
      {!isLoggedIn ? (
        <Stack.Screen name="(auth)/login" />
      ) : !isOnboarded ? (
        <Stack.Screen name="(auth)/Skincare" />
      ) : (
        <Stack.Screen name="(tabs)" />
      )}
    </Stack>
  );
}
