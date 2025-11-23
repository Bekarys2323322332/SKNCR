import { images } from "@/components/images";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { loadDarkMode } from "../utils/storage";

type TabIconProps = {
  focused: boolean;
  icon: any;
  animatedTint: any; // Animated value for tintColor
};

function TabIcon({ focused, icon, animatedTint }: TabIconProps) {
  return (
    <Animated.Image
      source={icon}
      style={{
        width: focused ? 28 : 24,
        height: focused ? 28 : 24,
        tintColor: animatedTint, // animated color
      }}
      resizeMode="contain"
    />
  );
}

export default function TabsLayout() {
  const [darkMode, setDarkMode] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const interval = setInterval(() => loadDarkMode().then(setDarkMode), 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: darkMode ? 1 : 0,
      duration: 300,
      useNativeDriver: false, // must be false for colors
    }).start();
  }, [darkMode]);

  // Animated colors
  const animatedBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.85)", "rgba(36,43,69,0.85)"],
  });

  const iconColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#5C6BC0", "#ffffff"], // light -> dark mode icon colors
  });

  const secondaryIconColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#6B7280", "#cbd5e0"], // unfocused icons
  });

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style={darkMode ? "light" : "dark"} translucent={true} />

      <Animated.View
        style={[StyleSheet.absoluteFillObject, { backgroundColor: darkMode ? "#1a1f3a" : "#ffffff" }]}
      />

      <Tabs
        tabBar={(props) => (
          <Animated.View
            style={{
              position: "absolute",
              bottom: 10 + insets.bottom,
              alignSelf: "center",
              height: 50,
              width: 250, // set your desired width
              borderRadius: 40,
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
              elevation: 10,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 10,
              backgroundColor: animatedBg,
            }}
          >
            {props.state.routes.map((route, index) => {
              const focused = props.state.index === index;
              const icon =
                route.name === "index"
                  ? images.water
                  : route.name === "scanbar"
                  ? images.scan
                  : images.profile;

              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={() => props.navigation.navigate(route.name)}
                  activeOpacity={0.7}
                >
                  <TabIcon
                    focused={focused}
                    icon={icon}
                    animatedTint={focused ? iconColor : secondaryIconColor}
                  />
                </TouchableOpacity>
              );
            })}
          </Animated.View>
        )}
      >
        <Tabs.Screen name="index" options={{ headerShown: false }} />
        <Tabs.Screen name="scanbar" options={{ headerShown: false }} />
        <Tabs.Screen name="profile" options={{ headerShown: false }} />
      </Tabs>
    </View>
  );
}
