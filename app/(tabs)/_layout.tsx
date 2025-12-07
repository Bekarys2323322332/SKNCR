import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { images } from "../../utils/images";
import { loadDarkMode } from "../../utils/storage";

const PRIMARY_BLUE = "#5C6BC0";

type TabIconProps = {
  focused: boolean;
  icon: any;
  anim: Animated.Value;
};

const TabIcon = React.memo(function TabIcon({ focused, icon, anim }: TabIconProps) {
  
  const highlightOpacity = focused
    ? anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] })
    : 0; // <-- simple no-animation fade for unfocused

  const tint = focused ? "#ffffff" : PRIMARY_BLUE;

  return (
    <View className="justify-center items-center mt-3 w-14 h-14">

      <Animated.View
        style={{
          position: "absolute",
          width: 44,
          height: 44,
          borderRadius: 24,
          backgroundColor: PRIMARY_BLUE,
          opacity: highlightOpacity,
        }}
      />

      <Animated.Image
        source={icon}
        resizeMode="contain"
        style={{
          width: focused ? 28 : 24,
          height: focused ? 28 : 24,
          tintColor: tint,
        }}
      />
    </View>
  );
});


export default function TabsLayout() {
  const [darkMode, setDarkMode] = useState(false);

  // Smooth animation value shared across UI
  const anim = useRef(new Animated.Value(0)).current;

  // animate dark mode transition
  useEffect(() => {
    Animated.timing(anim, {
      toValue: darkMode ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [darkMode]);

  // sync dark mode from storage
  useEffect(() => {
    const interval = setInterval(() => loadDarkMode().then(setDarkMode), 100);
    return () => clearInterval(interval);
  }, []);

  // Animated tab bar background
  const animatedBg = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["white", "#1a1f3a"],
  });

  return (
    <>
    <StatusBar style={darkMode ? "light" : "dark"} animated />
    <Tabs
      screenOptions={{
        tabBarShowLabel: false,
        animation: "fade",
        lazy: true,

        // Transparent because we use tabBarBackground
        tabBarStyle: {
          height: 70,
          borderTopWidth: 0,
          shadowOpacity: 0,
          backgroundColor: "transparent",
        },

        // Animated + blurred background
        tabBarBackground: () => (
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: animatedBg }]}
          >
            <BlurView
              tint={darkMode ? "dark" : "light"}
              intensity={40}
              style={StyleSheet.absoluteFillObject}
            />
          </Animated.View>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={images.water} anim={anim} />
          ),
        }}
      />

      <Tabs.Screen
        name="scanbar"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={images.scan} anim={anim} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon focused={focused} icon={images.profile} anim={anim} />
          ),
        }}
      />
    </Tabs>
    </>
  );
}
