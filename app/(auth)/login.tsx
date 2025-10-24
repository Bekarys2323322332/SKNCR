import { auth } from "@/app/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signIn = async () => {
    setLoading(true);
    try {
      const user = await signInWithEmailAndPassword(auth, email, password);
      if (user) router.replace("../(tabs)");
    } catch (error: any) {
      alert("Sign in failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F3F4F6] items-center justify-center px-6">
      <View className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        {/* Header Icon */}
        <View className="items-center mb-6">
          <View className="p-4 bg-[#5C6BC0] rounded-full shadow-md">
            <Ionicons name="heart" size={28} color="#fff" />
          </View>
          <Text className="text-2xl font-bold mt-4 text-[#1A237E]">Welcome Back</Text>
          <Text className="text-gray-500">Continue your skincare journey</Text>
        </View>

        {/* Email */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 mb-4"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Password */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Password</Text>
        <TextInput
          className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 mb-4"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Button */}
        <TouchableOpacity
          onPress={signIn}
          disabled={loading}
          className="bg-[#5C6BC0] h-12 rounded-xl items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* Link */}
        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-600">Don’t have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/signup")}>
            <Text className="text-sm font-semibold text-[#1A237E]">Sign Up</Text>
          </TouchableOpacity>
          
        </View>
      </View>
    </SafeAreaView>
  );
};

export default login;