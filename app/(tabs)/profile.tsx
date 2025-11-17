import { auth, db, storage } from "@/app/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { resetPlan } from "../utils/storage";

const Profile = () => {
  const [plan, setPlan] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [profilePic, setProfilePic] = useState<string>("");
  const [showSettings, setShowSettings] = useState(false);
  const [showPlanExpanded, setShowPlanExpanded] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [showTipsExpanded, setShowTipsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.replace("../(auth)/login");
      } else {
        setUser(currentUser);
        // Fetch user data from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.profilePic) {
            setProfilePic(userData.profilePic);
          }
          if (userData.skincarePlan) {
            setPlan(userData.skincarePlan);
          }
          if (userData.name) {
            setDisplayName(userData.name);
          }
        }
      }
    });
    return unsubscribe;
  }, []);

  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result;
      
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Camera permission is required.");
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      } else {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          Alert.alert("Permission needed", "Gallery permission is required.");
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.5,
        });
      }

      if (!result.canceled && result.assets[0].uri) {
        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert("Error", "Could not pick image.");
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;
    
    setUploading(true);
    try {
      // Convert image to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      // Create storage reference
      const imageRef = ref(storage, `profilePics/${user.uid}`);
      
      // Upload image
      await uploadBytes(imageRef, blob);
      
      // Get download URL
      const downloadURL = await getDownloadURL(imageRef);
      
      // Update Firestore
      await updateDoc(doc(db, "users", user.uid), {
        profilePic: downloadURL,
      });
      
      setProfilePic(downloadURL);
      Alert.alert("Success", "Profile picture updated!");
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Could not upload image. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Change Profile Picture",
      "Choose an option",
      [
        { text: "Take Photo", onPress: () => pickImage("camera") },
        { text: "Choose from Gallery", onPress: () => pickImage("gallery") },
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const handleResetPlan = async () => {
    Alert.alert(
      "Reset Plan",
      "Are you sure you want to reset your skincare plan?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await resetPlan();
              if (user) {
                await updateDoc(doc(db, "users", user.uid), {
                  skincarePlan: null,
                });
              }
              setPlan(null);
              Alert.alert("Success", "Your skincare plan has been cleared.");
            } catch (error) {
              Alert.alert("Error", "Could not reset plan.");
            }
          },
        },
      ]
    );
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace("../(auth)/login");
    } catch (e) {
      Alert.alert("Error", "Could not sign out. Please try again.");
    }
  };

  if (!user) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  // Duplicate achievements and brands for scrolling
  const achievements = [
    { icon: "water", label: "First Routine", sub: "Completed" },
    { icon: "flame", label: "7-Day Streak", sub: "In Progress" },
    { icon: "checkmark-circle", label: "Perfect Week", sub: "Achieved" },
    { icon: "star", label: "Skin Goals", sub: "50% Done" },
    { icon: "trophy", label: "30 Days", sub: "Almost" },
    { icon: "ribbon", label: "Dedication", sub: "Earned" },
  ];

  const brands = plan?.routine?.brands || [];
  const allBrands = brands.length > 0 ? [...brands, ...brands, ...brands] : [];

  return (
    <View style={{ flex: 1 }}>
          <ScrollView style={{flex:1, backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-5 py-4">
          <TouchableOpacity
                    onPress={() => setShowSettings(true)}
                    style={{
                      position: 'absolute',
                      top: 50,
                      right: 20,
                      zIndex: 10,
                      padding: 8,
                      backgroundColor: '#f3f4f6',
                      borderRadius: 8
                    }}
                  >
                    <Ionicons name="settings" size={24} color="#374151" />
                  </TouchableOpacity>
        </View>
       
        {/* Profile Info */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginTop: 80 }}>
          <TouchableOpacity onPress={showImageOptions} disabled={uploading}>
            <View className="relative">
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  className="w-24 h-24 rounded-full bg-gray-500"
                />
              ) : (
                <View className="w-24 h-24 rounded-full bg-gray-500 justify-center items-center">
                  <Text className="text-3xl text-white font-bold">
                    {user.displayName?.[0] || user.email?.[0] || "U"}
                  </Text>
                </View>
              )}
              <View className="absolute bottom-0 right-0 bg-purple-500 rounded-full p-1.5">
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text className="text-xl font-bold mt-3">
            {displayName}
          </Text>
          <Text className="text-sm text-gray-500 mt-1">{user.email}</Text>
        </View>

        {/* Achievements - Horizontal Scroll */}
        <View className="mb-6">
          <Text className="text-base font-semibold mb-3 px-5">Achievements</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {achievements.map((item, idx) => (
              <View key={idx} className="items-center mr-5">
                <View className="w-16 h-16 rounded-full bg-purple-100 justify-center items-center mb-2">
                  <Ionicons name={item.icon as any} size={28} color="#8b5cf6" />
                </View>
                <Text className="text-xs font-medium text-center w-20">{item.label}</Text>
                <Text className="text-xs text-gray-400 text-center">{item.sub}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

          {/* My Skincare Plan */}
        <View className="px-5 mb-6">
          <TouchableOpacity
            className="flex-row justify-between items-center bg-gray-900 rounded-2xl p-4 mb-3"
            onPress={() => setShowPlanExpanded(!showPlanExpanded)}
          >
            <View className="flex-row items-center">
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text className="text-white font-semibold ml-2">My Skincare Plan</Text>
            </View>
            <Ionicons
              name={showPlanExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          {showPlanExpanded && plan?.routine && (
            <View className="space-y-3">
              {/* Morning */}
              <View className="bg-gray-50 rounded-xl p-3">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="sunny-outline" size={18} color="#f59e0b" />
                  <Text className="font-semibold ml-2">Morning</Text>
                </View>
                {plan.routine.morning?.map((product: string, idx: number) => (
                  <View key={idx} className="flex-row items-center py-2 px-3 bg-white rounded-lg mb-2">
                    <View className="w-8 h-8 rounded-lg bg-purple-100 justify-center items-center mr-3">
                      <Ionicons name="water" size={16} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium">{product}</Text>
                      <Text className="text-xs text-gray-500">Morning</Text>
                    </View>
                  </View>
                ))}
                {plan.routine.spf && (
                  <View className="flex-row items-center py-2 px-3 bg-yellow-50 rounded-lg">
                    <View className="w-8 h-8 rounded-lg bg-yellow-200 justify-center items-center mr-3">
                      <Ionicons name="sunny" size={16} color="#92400e" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium">{plan.routine.spf}</Text>
                      <Text className="text-xs text-yellow-800">Morning</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Evening */}
              <View className="bg-gray-50 rounded-xl p-3">
                <View className="flex-row items-center mb-2">
                  <Ionicons name="moon-outline" size={18} color="#4f46e5" />
                  <Text className="font-semibold ml-2">Evening</Text>
                </View>
                {plan.routine.evening?.map((product: string, idx: number) => (
                  <View key={idx} className="flex-row items-center py-2 px-3 bg-white rounded-lg mb-2">
                    <View className="w-8 h-8 rounded-lg bg-purple-100 justify-center items-center mr-3">
                      <Ionicons name="moon" size={16} color="#8b5cf6" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-medium">{product}</Text>
                      <Text className="text-xs text-gray-500">Evening</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}
       {/* Personalized Tips - Toggleable */}
        {plan?.routine.tips && (
          <View className="px-5 mb-6">
            <TouchableOpacity
              className="flex-row justify-between items-center bg-purple-100 rounded-2xl p-4 mb-3"
              onPress={() => setShowTipsExpanded(!showTipsExpanded)}
            >
              <View className="flex-row items-center">
                <Ionicons name="bulb-outline" size={20} color="#8b5cf6" />
                <Text className="text-purple-900 font-semibold ml-2">Personalized Tips</Text>
              </View>
              <Ionicons
                name={showTipsExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#8b5cf6"
              />
            </TouchableOpacity>

            {showTipsExpanded && (
              <View className="bg-purple-50 rounded-xl p-4 space-y-3">
                {plan.routine.tips.map((tip: string, idx: number) => (
                  <View key={idx} className="flex-row items-start mb-3">
                    <View className="w-6 h-6 rounded-full bg-purple-200 justify-center items-center mr-3 mt-0.5">
                      <Ionicons name="checkmark" size={14} color="#8b5cf6" />
                    </View>
                    <Text className="text-sm text-gray-700 flex-1">{tip}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
          {!plan && (
            <TouchableOpacity
              className="bg-purple-100 py-3 rounded-xl"
              onPress={() => router.push("../(auth)/Skincare")}
            >
              <Text className="text-purple-700 text-center text-sm font-semibold">
                Create a Plan
              </Text>
            </TouchableOpacity>
          )}
         
        </View>

        {/* Recommended Brands - Horizontal Scroll */}
        {allBrands.length > 0 && (
          <View className="mb-6">
            <Text className="text-base font-semibold mb-3 px-5">Recommended Brands</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20 }}
            >
              {allBrands.map((brand: string, idx: number) => (
                <View 
                  key={idx} 
                  className="bg-gray-900 rounded-xl p-4 mr-3 w-24 h-24 justify-center items-center"
                >
                  <Text className="text-white text-xs font-medium text-center">{brand}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        
      </ScrollView>

      {/* Settings Modal - Centered */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white p-5 rounded-xl w-4/5">
            {/* Close X Button */}
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              className="absolute top-4 right-4 z-10"
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>

            <Text className="text-2xl font-bold mb-6 text-center">Settings</Text>
            
            {/* Dark Mode */}
            <View className="flex-row items-center justify-between w-full mb-4 pb-4 border-b border-gray-200">
              <View className="flex-row items-center">
                <Ionicons name="moon-outline" size={22} color="#8b5cf6" />
                <Text className="text-base ml-3">Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#767577', true: '#8b5cf6' }}
                thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            
            
            {/* Notifications */}
            <TouchableOpacity 
              className="flex-row items-center justify-between w-full mb-4 pb-4 border-b border-gray-200"
              onPress={() => {
                Alert.alert("Notifications", "Notification settings coming soon!");
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="notifications-outline" size={22} color="#8b5cf6" />
                <Text className="text-base ml-3">Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity 
              className="flex-row items-center justify-between w-full mb-6 pb-4 border-b border-gray-200"
              onPress={() => {
                Alert.alert("Privacy Policy", "Privacy policy coming soon!");
              }}
            >
              <View className="flex-row items-center">
                <Ionicons name="shield-checkmark-outline" size={22} color="#8b5cf6" />
                <Text className="text-base ml-3">Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            {/* Reset Plan */}
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                setTimeout(handleResetPlan, 300);
              }}
              className="flex-row items-center justify-center bg-red-100 py-3 px-5 rounded-lg mb-3 w-full"
            >
              <Ionicons name="refresh-outline" size={18} color="#dc2626" />
              <Text className="text-red-600 font-semibold ml-2">Reset My Plan</Text>
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                setTimeout(handleSignOut, 300);
              }}
              className="flex-row items-center justify-center bg-purple-600 py-3 px-5 rounded-lg w-full"
            >
              <Ionicons name="exit-outline" size={18} color="#fff" />
              <Text className="text-white font-semibold ml-2">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    
  );
};

export default Profile;