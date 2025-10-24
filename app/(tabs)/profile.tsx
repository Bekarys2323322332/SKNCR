import { auth } from "@/app/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
    Alert,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { loadPlan, resetPlan } from "../utils/storage";

const Profile = () => {
  const [plan, setPlan] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace("../(auth)/login");
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const fetchPlan = async () => {
      const saved = await loadPlan();
      setPlan(saved);
    };
    fetchPlan();
  }, []);

  if (!plan || !plan.routine) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <Text className="text-base mb-5 text-gray-500">No skincare plan found.</Text>
        <TouchableOpacity
          className="bg-[#5C6BC0] py-3 px-5 rounded-xl"
          onPress={() => router.push("../(auth)/Skincare")}
        >
          <Text className="text-white text-base font-semibold">Create a Plan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const { routine } = plan;

  return (
    <SafeAreaView className="flex-1 bg-white">
      <ScrollView className="p-5" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="items-center mb-8">
          <Text className="text-2xl font-bold text-center">Your Personalized Skincare Plan</Text>
          <Text className="text-sm text-gray-500 text-center mt-1">
            Tailored just for you based on your answers
          </Text>
        </View>

        {/* Morning Routine */}
        <View className="rounded-2xl p-4 mb-5 bg-gray-50 shadow-sm border-l-4 border-yellow-400">
          <View className="flex-row items-center mb-3 space-x-2">
            <Ionicons name="sunny-outline" size={20} color="#f59e0b" />
            <Text className="text-lg font-semibold">Morning Routine</Text>
          </View>
          <View className="space-y-2">
            {routine.morning?.map((product: string, index: number) => (
              <View key={index} className="flex-row items-center mb-2">
                <View className="w-7 h-7 rounded-full bg-yellow-100 justify-center items-center mr-2">
                  <Text className="font-semibold text-black">{index + 1}</Text>
                </View>
                <Text className="text-base">{product}</Text>
              </View>
            ))}
            {routine.spf && (
              <View className="flex-row items-center mt-2">
                <View className="w-7 h-7 rounded-full bg-yellow-200 justify-center items-center mr-2">
                  <Ionicons name="sunny" size={18} color="#92400e" />
                </View>
                <Text className="text-base font-semibold text-yellow-800">
                  {routine.spf}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Evening Routine */}
        <View className="rounded-2xl p-4 mb-5 bg-gray-50 shadow-sm border-l-4 border-indigo-500">
          <View className="flex-row items-center mb-3 space-x-2">
            <Ionicons name="moon-outline" size={20} color="#4f46e5" />
            <Text className="text-lg font-semibold">Evening Routine</Text>
          </View>
          <View className="space-y-2">
            {routine.evening?.map((product: string, index: number) => (
              <View key={index} className="flex-row items-center mb-2">
                <View className="w-7 h-7 rounded-full bg-indigo-100 justify-center items-center mr-2">
                  <Text className="font-semibold text-black">{index + 1}</Text>
                </View>
                <Text className="text-base">{product}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Brands */}
        <View className="rounded-2xl p-4 mb-5 bg-gray-50 shadow-sm border-l-4 border-green-500">
          <View className="flex-row items-center mb-3 space-x-2">
            <Ionicons name="pricetag-outline" size={20} color="#10b981" />
            <Text className="text-lg font-semibold">Recommended Brands</Text>
          </View>
          <View className="flex-row flex-wrap space-x-2 space-y-2">
            {routine.brands?.map((brand: string, index: number) => (
              <View key={index} className="bg-green-50 py-1.5 px-3 rounded-xl mr-2 mb-2">
                <Text className="text-green-800 font-medium">{brand}</Text>
              </View>
            ))}
          </View>
        </View>

        <TouchableOpacity
          className="bg-gray-100 py-3 rounded-xl mb-5"
          onPress={async () => {
            await resetPlan();
            setPlan(null);
            Alert.alert("Plan reset", "Your skincare plan has been cleared.");
          }}
        >
          <Text className="text-gray-700 text-center text-base font-semibold">Reset Plan</Text>
        </TouchableOpacity>

        {/* Sign Out */}
        <TouchableOpacity
          className="flex-row justify-center items-center bg-red-100 py-3.5 rounded-xl mt-2"
          onPress={async () => {
            try {
              await signOut(auth);
              router.replace("../(auth)/login");
            } catch (e) {
              Alert.alert("Error", "Could not sign out. Please try again.");
            }
          }}
        >
          <Ionicons name="exit-outline" size={18} color="#dc2626" style={{ marginRight: 6 }} />
          <Text className="text-red-600 text-base font-semibold">Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Profile;
