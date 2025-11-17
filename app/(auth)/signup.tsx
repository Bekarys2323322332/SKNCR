import { auth, db } from "@/app/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import React, { useState } from "react";
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const signup = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const signUp = async () => {
  if (password !== confirmPassword) {
    alert("Passwords do not match");
    return;
  }

  setLoading(true);
  try {
    const user = await createUserWithEmailAndPassword(auth, email, password);

    await setDoc(doc(db, "users", user.user.uid), {
      name: name,
      email: email,
      createdAt: Date.now(),
    });

    if (user) router.replace("/(auth)/Skincare");
  } catch (error: any) {
    alert("Sign up failed: " + error.message);
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
            <Ionicons name="person-add" size={28} color="#fff" />
          </View>
          <Text className="text-2xl font-bold mt-4 text-[#1A237E]">Start Your Journey</Text>
          <Text className="text-gray-500">Create your account for personalized skincare</Text>
        </View>

        {/* Name */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Name</Text>
        <TextInput
          className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 mb-4"
          placeholder="Your Name"
          value={name}
          onChangeText={setName}
          keyboardType="email-address"
          autoCapitalize="none"
        />
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

        {/* Confirm Password */}
        <Text className="text-sm font-medium text-gray-700 mb-1">Confirm Password</Text>
        <TextInput
          className="h-12 w-full border-2 border-gray-200 rounded-xl px-4 mb-4"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {/* Button */}
        <TouchableOpacity
          onPress={signUp}
          disabled={loading}
          className="bg-[#5C6BC0] h-12 rounded-xl items-center justify-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-semibold text-lg">Create Account</Text>
          )}
        </TouchableOpacity>

        {/* Link */}
        <View className="mt-6 flex-row justify-center">
          <Text className="text-sm text-gray-600">Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push("/(auth)/login")}>
            <Text className="text-sm font-semibold text-[#1A237E]">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default signup;
