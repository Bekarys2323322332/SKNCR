import { auth, db, storage } from "@/app/utils/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useState } from "react";
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
        <ActivityIndicator size="large" color="#5C6BC0" />
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
      <ScrollView style={{ flex: 1, backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
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

        {/* Profile Info */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginTop: 80 }}>
          <TouchableOpacity onPress={showImageOptions} disabled={uploading}>
            <View style={{ position: 'relative' }}>
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#e5e7eb' }}
                />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, color: 'white', fontWeight: 'bold' }}>
                    {user.displayName?.[0] || user.email?.[0] || "U"}
                  </Text>
                </View>
              )}
              <View style={{ position: 'absolute', bottom: 0, right: 0, backgroundColor: '#5C6BC0', borderRadius: 16, padding: 6 }}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Text style={{ fontSize: 20, fontWeight: '600', color: '#374151', marginTop: 12 }}>
            {displayName}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 4 }}>{user.email}</Text>
        </View>

        {/* Achievements - Horizontal Scroll */}
        <View style={{ marginBottom: 24, marginTop: 24 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, paddingHorizontal: 16 }}>
            Achievements
          </Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {achievements.map((item, idx) => (
              <View key={idx} style={{ alignItems: 'center', marginRight: 20 }}>
                <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name={item.icon as any} size={28} color="#5C6BC0" />
                </View>
                <Text style={{ fontSize: 12, fontWeight: '500', color: '#374151', textAlign: 'center', width: 80 }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: 12, color: '#9ca3af', textAlign: 'center' }}>{item.sub}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* My Skincare Plan */}
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#374151',
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
            }}
            onPress={() => setShowPlanExpanded(!showPlanExpanded)}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="calendar-outline" size={20} color="#fff" />
              <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>My Skincare Plan</Text>
            </View>
            <Ionicons
              name={showPlanExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>

          {showPlanExpanded && plan?.routine && (
            <View style={{ gap: 12 }}>
              {/* Morning */}
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="sunny-outline" size={18} color="#f59e0b" />
                  <Text style={{ fontWeight: '600', color: '#374151', marginLeft: 8 }}>Morning</Text>
                </View>
                {plan.routine.morning?.map((product: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'white', borderRadius: 8, marginBottom: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="water" size={16} color="#5C6BC0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>{product}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Morning</Text>
                    </View>
                  </View>
                ))}
                {plan.routine.spf && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: '#fef3c7', borderRadius: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#fde68a', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="sunny" size={16} color="#92400e" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>{plan.routine.spf}</Text>
                      <Text style={{ fontSize: 12, color: '#92400e' }}>Morning</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Evening */}
              <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="moon-outline" size={18} color="#5C6BC0" />
                  <Text style={{ fontWeight: '600', color: '#374151', marginLeft: 8 }}>Evening</Text>
                </View>
                {plan.routine.evening?.map((product: string, idx: number) => (
                  <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, backgroundColor: 'white', borderRadius: 8, marginBottom: 8 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      <Ionicons name="moon" size={16} color="#5C6BC0" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 14, fontWeight: '500', color: '#374151' }}>{product}</Text>
                      <Text style={{ fontSize: 12, color: '#6B7280' }}>Evening</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Personalized Tips - Toggleable */}
          {plan?.routine.tips && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: '#e0e7ff',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                }}
                onPress={() => setShowTipsExpanded(!showTipsExpanded)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="bulb-outline" size={20} color="#5C6BC0" />
                  <Text style={{ color: '#374151', fontWeight: '600', marginLeft: 8 }}>Personalized Tips</Text>
                </View>
                <Ionicons
                  name={showTipsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#5C6BC0"
                />
              </TouchableOpacity>

              {showTipsExpanded && (
                <View style={{ backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, gap: 12 }}>
                  {plan.routine.tips.map((tip: string, idx: number) => (
                    <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 }}>
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#e0e7ff', justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2 }}>
                        <Ionicons name="checkmark" size={14} color="#5C6BC0" />
                      </View>
                      <Text style={{ fontSize: 14, color: '#374151', flex: 1, lineHeight: 20 }}>{tip}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {!plan && (
            <TouchableOpacity
              style={{ backgroundColor: '#e0e7ff', paddingVertical: 12, borderRadius: 12, marginTop: 12 }}
              onPress={() => router.push("../(auth)/Skincare")}
            >
              <Text style={{ color: '#5C6BC0', textAlign: 'center', fontSize: 14, fontWeight: '600' }}>
                Create a Plan
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Recommended Brands - Horizontal Scroll */}
        {allBrands.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12, paddingHorizontal: 16 }}>
              Recommended Brands
            </Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {allBrands.map((brand: string, idx: number) => (
                <View 
                  key={idx} 
                  style={{
                    backgroundColor: '#374151',
                    borderRadius: 12,
                    padding: 16,
                    marginRight: 12,
                    width: 96,
                    height: 96,
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}
                >
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '500', textAlign: 'center' }}>
                    {brand}
                  </Text>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, width: '80%', alignItems: 'center' }}>
            {/* Close X Button */}
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
            >
              <Ionicons name="close" size={24} color="#374151" />
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Settings</Text>
            
            {/* Dark Mode */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="moon-outline" size={22} color="#5C6BC0" />
                <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#767577', true: '#5C6BC0' }}
                thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
              />
            </View>
            
            {/* Notifications */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}
              onPress={() => {
                Alert.alert("Notifications", "Notification settings coming soon!");
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="notifications-outline" size={22} color="#5C6BC0" />
                <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Notifications</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>

            {/* Privacy Policy */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' }}
              onPress={() => {
                Alert.alert("Privacy Policy", "Privacy policy coming soon!");
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#5C6BC0" />
                <Text style={{ fontSize: 16, color: '#374151', marginLeft: 12 }}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            {/* Reset Plan */}
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                setTimeout(handleResetPlan, 300);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fee2e2', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginBottom: 12, width: '100%' }}
            >
              <Ionicons name="refresh-outline" size={18} color="#dc2626" />
              <Text style={{ color: '#dc2626', fontWeight: '600', marginLeft: 8 }}>Reset My Plan</Text>
            </TouchableOpacity>

            {/* Sign Out */}
            <TouchableOpacity
              onPress={() => {
                setShowSettings(false);
                setTimeout(handleSignOut, 300);
              }}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#5C6BC0', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, width: '100%' }}
            >
              <Ionicons name="exit-outline" size={18} color="#fff" />
              <Text style={{ color: 'white', fontWeight: '600', marginLeft: 8 }}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
    
  );
};

export default Profile;