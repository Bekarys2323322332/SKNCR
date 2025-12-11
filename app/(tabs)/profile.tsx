
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import storage from "@react-native-firebase/storage";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import * as Linking from "expo-linking";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated, Easing,
  Image,
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import ErrorModal from "../../components/ErrorModal";
import MessagePanel, { PanelAction } from "../../components/MessagePanel";
import { loadDarkMode, resetPlan, saveDarkMode } from "../../utils/storage";






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
  const [streak, setStreak] = useState(0);
  const [hardMode, setHardMode] = useState(false);
  const [hardModeLastDisabled, setHardModeLastDisabled] = useState<number | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);


  
  const [editAnim] = useState(new Animated.Value(0));
  const [lastNameChange, setLastNameChange] = useState<number | null>(null);

  const snapshotRef = useRef<(() => void) | null>(null);

  const [errorMessage, setErrorMessage] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");

  // MessagePanel state
  const [panelVisible, setPanelVisible] = useState(false);
  const [panelTitle, setPanelTitle] = useState<string>('');
  const [panelMessage, setPanelMessage] = useState<string>('');
  const [panelActions, setPanelActions] = useState<PanelAction[]>([]);
  const [showEditName, setShowEditName] = useState(false);
  const [newName, setNewName] = useState("");

  const planAnim = useRef(new Animated.Value(0)).current;
  const tipsAnim = useRef(new Animated.Value(0)).current;

  const togglePlan = () => {
    const newState = !showPlanExpanded;
    setShowPlanExpanded(newState);

    Animated.timing(planAnim, {
      toValue: newState ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };

  const toggleTips = () => {
    const newState = !showTipsExpanded;
    setShowTipsExpanded(newState);

    Animated.timing(tipsAnim, {
      toValue: newState ? 1 : 0,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false,
    }).start();
  };
  const getProductIcon = (product: string) => {
  const lower = product.toLowerCase();
  if (lower.includes("cleanser")) return "color-filter-outline";
  if (lower.includes("wash")) return "leaf-outline";
  if (lower.includes("toner")) return "aperture-outline";
  if (lower.includes("serum")) return "eyedrop-outline";
  if (lower.includes("essence")) return "flask-outline";
  if (lower.includes("moisturizer") || lower.includes("cream")) return "water-outline";
  if (lower.includes("spf") || lower.includes("sunscreen")) return "sunny";
  return "ellipse-outline"; // fallback
};



  const showPanel = (title: string, message: string, actions: PanelAction[] = [{ text: 'OK', style: 'default' }]) => {
    setPanelTitle(title);
    setPanelMessage(message);
    setPanelActions(actions);
    setPanelVisible(true);
  };

  const hidePanel = () => setPanelVisible(false);
  

  const showError = (title: string, message: string) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorVisible(true);
  };
  useEffect(() => {
    loadDarkMode().then(setDarkMode);
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setShowPlanExpanded(false);
        setShowTipsExpanded(false);
      };
    }, [])
  );


  useEffect(() => {
    if (!user) return;

    const uid = user.uid;

    AsyncStorage.getItem(`hardModeLocal_${uid}`).then(v => {
      if (v !== null) setHardMode(JSON.parse(v));
    });

    AsyncStorage.getItem(`lastNameChangeLocal_${uid}`).then(v => {
      if (v !== null) setLastNameChange(JSON.parse(v));
    });

    AsyncStorage.getItem(`hardModeLastDisabledLocal_${uid}`).then(v => {
      if (v !== null) setHardModeLastDisabled(JSON.parse(v));
    });

  }, [user]);


   useEffect(() => {
    // 🔥 Always start fresh loading state when screen mounts
    setInfoLoading(true);

    const unsubscribeAuth = auth().onAuthStateChanged((currentUser) => {


      // Kill old Firestore listener
      if (snapshotRef.current) {
        snapshotRef.current();
        snapshotRef.current = null;
      }

      // User logged out → go to login
      if (!currentUser) {
        setUser(null);
        setInfoLoading(false);
        router.replace("/(auth)/login");
        return;
      }

      // Set user, now ready for Firestore snapshot
      setUser(currentUser);

      // Start Firestore snapshot
      const userRef = firestore().collection("users").doc(currentUser.uid);
      const unsub = userRef.onSnapshot(async (snapshot) => {
      if (!snapshot.exists()) return;

      const data = snapshot.data() || {};
      const uid = auth().currentUser?.uid;

        // Load all Firestore-backed values safely
        if (data.profilePic !== undefined) setProfilePic(data.profilePic);
        if (data.skincarePlan !== undefined) setPlan(data.skincarePlan);
        if (data.streakCount !== undefined) setStreak(data.streakCount);
        if (data.name !== undefined) setDisplayName(data.name);

        // Cooldown saved locally
        if (data.lastNameChange !== undefined) {
          setLastNameChange(data.lastNameChange);
          await AsyncStorage.setItem(`lastNameChangeLocal_${uid}`, JSON.stringify(data.lastNameChange));
        }

        // Dark mode sync
        if (data.darkMode !== undefined) {
          setDarkMode(data.darkMode);
          await saveDarkMode(data.darkMode);
        }

        // Hard mode sync
        if (data.hardMode !== undefined) {
          setHardMode(data.hardMode);
          await AsyncStorage.setItem(`hardModeLocal_${uid}`, JSON.stringify(data.hardMode));
        }

        if (data.hardModeLastDisabled !== undefined) {
          setHardModeLastDisabled(data.hardModeLastDisabled);
          await AsyncStorage.setItem(
            `hardModeLastDisabledLocal_${uid}`,
            JSON.stringify(data.hardModeLastDisabled)
          );
        }

        // 🔥 Only after snapshot loads → stop showing loading screen
        setInfoLoading(false);
      });

      snapshotRef.current = unsub;
    });

    return () => {
      if (snapshotRef.current) {
        snapshotRef.current();
        snapshotRef.current = null;
      }
      unsubscribeAuth();
    };
  }, []);


  const getNextNameChangeDateString = () => {
    if (!lastNameChange) return null;

    const next = new Date(lastNameChange + NAME_COOLDOWN);
    return format(next, "d MMM");
  };

  const openEditNameModal = () => {
    setNewName(displayName);
    setShowEditName(true);
    hidePanel();

    editAnim.setValue(0);

    Animated.timing(editAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  };
  const closeEditNameModal = () => {
    Animated.timing(editAnim, {
      toValue: 0,
      duration: 200,
      easing: Easing.in(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setShowEditName(false);
      hidePanel()
    });
  };

  const NAME_COOLDOWN = 7 * 24 * 60 * 60 * 1000;

  const canChangeName = () => {
    if (!lastNameChange) return true;
    return Date.now() - lastNameChange >= NAME_COOLDOWN;
  };

  const getDaysUntilNameChange = () => {
    if (!lastNameChange) return 0;
    const remaining = NAME_COOLDOWN - (Date.now() - lastNameChange);
    if (remaining <= 0) return 0;
    return Math.ceil(remaining / (24 * 60 * 60 * 1000));
  };



  const pickImage = async (source: "camera" | "gallery") => {
    try {
      let result;
      
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          showPanel("Permission needed", "Camera permission is required.");
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
          showPanel("Permission needed", "Gallery permission is required.");
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
      showError('Image Error', "Could not select image. Please try again.");
    }
  };

  const uploadImage = async (uri: string) => {
    if (!user) return;
    
    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const imageRef = storage().ref(`profilePics/${user.uid}`);
      await imageRef.put(blob);
      const downloadURL = await imageRef.getDownloadURL();

      
      await firestore().collection("users").doc(user.uid).update({
        profilePic: downloadURL,
      });
      
      setProfilePic(downloadURL);
      showPanel("Success", "Profile picture updated!");
    } catch (error) {
      console.error(error);
      showError("Upload Error", "Could not upload image. Please try again.");
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
  
  const updateName = async () => {
    const trimmed = newName.trim();

    if (!trimmed) {
      showError("Invalid Name", "Nickname cannot be empty.");
      return;
    }

    if (trimmed === displayName) {
      showError("Invalid Name", "This nickname is the same as your current one.");
      return;
    }

    // Firestore enforced cooldown
    if (!canChangeName()) {
      const days = getDaysUntilNameChange();
      showPanel(
        "Name Change Cooldown",
        `You can change your nickname again in ${days} day${days !== 1 ? "s" : ""}.`
      );
      return;
    }

    try {
      const now = Date.now();

      await firestore().collection("users").doc(user.uid).update({
        name: trimmed,
        lastNameChange: now,
      });


      setDisplayName(trimmed);
      setLastNameChange(now);

      closeEditNameModal();
      showPanel("Success", "Your nickname has been updated!");
    } catch (err) {
      showError("Update Error", "Could not update your nickname, try again");
    }
  };




  const handleResetPlan = async () => {
  if(plan !== null) {
  showPanel(
    "Reset Plan",
    "Are you sure you want to reset your skincare plan?",
    [
      { text: "Cancel", style: "cancel", onPress: hidePanel },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          try {
            await resetPlan();
            if (user) {
              await firestore().collection("users").doc(user.uid).update({
                skincarePlan: null,
              });
            }
            setPlan(null);
            // optional: close old panel before showing success
            hidePanel();
            showPanel("Success", "Your skincare plan has been cleared.");
          } catch (error) {
            showError("Reset Error", "Could not reset plan.");
          }
        },
      },
    ]
  );
} else {
  showError("No Skincare Plan", "Could not reset plan.")
}
  };

  const canDisableHardMode = () => {
    if (!hardModeLastDisabled) return true;
    
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const timeSinceLastDisable = now - hardModeLastDisabled;
    
    return timeSinceLastDisable >= sevenDays;
  };

  const getDaysUntilCanDisable = () => {
    if (!hardModeLastDisabled) return 0;
    
    const now = Date.now();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const timeSinceLastDisable = now - hardModeLastDisabled;
    const timeRemaining = sevenDays - timeSinceLastDisable;
    
    if (timeRemaining <= 0) return 0;
    
    return Math.ceil(timeRemaining / (24 * 60 * 60 * 1000));
  };

  const handleHardModeToggle = async (value: boolean) => {
    if (!user) return;

    if (value) {
      // ENABLE hard mode
      showPanel(
        "Enable Hard Mode?",
        "Hard Mode will make your routine more challenging. You can disable it only once every 7 days.",
        [
          { text: "Cancel", style: "cancel", onPress: hidePanel },
          {
          text: "Enable",
          onPress: async () => {
            try {
              const now = Date.now();

              // Local update
              setHardMode(true);
              await AsyncStorage.setItem(`hardModeLocal_${user.uid}`, JSON.stringify(true));

              // Start cooldown immediately when enabling
              setHardModeLastDisabled(now);
              await AsyncStorage.setItem(`hardModeLastDisabledLocal_${user.uid}`, JSON.stringify(now));

              // Save to Firebase
              await firestore().collection("users").doc(user.uid).update({
                hardMode: true,
                hardModeLastDisabled: now, // 🔥 Cooldown starts here
              });

              showPanel("Hard Mode Enabled", "You won’t be able to disable it for 7 days.");
            } catch (error) {
              showError("Error", "Could not enable hard mode.");
            }
          },
        },
        ]
      );
    }

    else {
      // DISABLE hard mode
      if (!canDisableHardMode()) {
        const daysLeft = getDaysUntilCanDisable();
        showPanel(
          "Cannot Disable Hard Mode",
          `You can only disable hard mode once every 7 days. Wait ${daysLeft} more day${daysLeft !== 1 ? 's' : ''}.`
        );
        return;
      }

      showPanel(
        "Disable Hard Mode?",
        "You won't be able to disable it again for 7 days after re-enabling.",
        [
          { text: "Cancel", style: "cancel", onPress: hidePanel },
            {
            text: "Disable",
            style: "destructive",
            onPress: async () => {
              try {
                // instant UI update
                setHardMode(false);
                await AsyncStorage.setItem(`hardModeLocal_${user.uid}`, JSON.stringify(false));

                await firestore().collection("users").doc(user.uid).update({
                  hardMode: false,
                  // hardModeLastDisabled stays unchanged
                });

                showPanel("Hard Mode Disabled", "You have turned off Hard Mode.");
              } catch (error) {
                showError("Error", "Could not disable hard mode.");
              }
            },
          },
        ]
      );
    }
  };


  const handleSignOut = async () => {
  try {
    if (snapshotRef.current) {
      snapshotRef.current();
      snapshotRef.current = null;
    }
    await auth().signOut();
    router.replace("/(auth)/login");

  } catch (e) {
    showError("Error", "Could not sign out. Please try again.");
  }
};


  // Add this function for handling achievement taps
  const handleAchievementTap = (achieved: boolean, streakDays: number) => {
    if (achieved) {
      showPanel(
        "Well done!",
        `You achieved the ${streakDays}-day streak! Keep going! 🎉`
      );
    }
  };



  // Add this function for privacy policy handler
  const handlePrivacyPolicy = () => {
    Linking.openURL("https://skncr-privacy.vercel.app/privacy");
  };
  const handleTermsOfService = () => {
    Linking.openURL("https://skncr-privacy.vercel.app/terms");
  };



  const achievements = [
    { streak: 7, icon: "flame", label: "7-Day Streak" },
    { streak: 15, icon: "trophy-outline", label: "15-Day Streak" },
    { streak: 30, icon: "star", label: "30-Day Streak" },
    { streak: 50, icon: "ribbon", label: "50-Day Streak" },
    { streak: 100, icon: "diamond-outline", label: "100-Day Streak" },
  ];

  

  const brands = plan?.routine?.brands || [];
  const allBrands = brands.length > 0 ? [...brands, ...brands, ...brands] : [];

  // Dark mode colors
  const bgColor = darkMode ? '#1a1f3a' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const cardBg = darkMode ? '#2d3748' : '#f3f4f6';
  const borderColor = darkMode ? '#4a5568' : '#e5e7eb';
  const iconBg = darkMode ? '#374151' : '#e0e7ff';
  const planBg = darkMode ? '#374151' : '#374151';
  const modalBg = darkMode ? '#2d3748' : 'white';
  const primaryColor = '#5C6BC0';


  if (infoLoading || !user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: darkMode ? "#1a1f3a" : "white",
        }}
      >
        <ActivityIndicator size="large" color="#5C6BC0" />
        <Text
          style={{
            marginTop: 10,
            fontSize: 16,
            color: darkMode ? "#ffffff" : "#374151",
          }}
        >
          Loading profile...
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>{showEditName && (
      <Modal transparent visible>
        <Animated.View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: editAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.5)"],
            }),
          }}
        >
          <Animated.View
            style={{
              width: "80%",
              padding: 20,
              borderRadius: 16,
              backgroundColor: modalBg,
              transform: [
                {
                  translateY: editAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [40, 0],
                  }),
                },
              ],
              opacity: editAnim,
              shadowColor: primaryColor,
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: "700", marginBottom: 12, color: textColor }}>
              Edit Nickname
            </Text>

            <TextInput
              value={newName}
              onChangeText={(t) => {
                if (t.length <= 20) setNewName(t);
              }}
              placeholder="Enter nickname"
              placeholderTextColor={secondaryTextColor}
              style={{
                borderRadius: 10,
                backgroundColor: cardBg,
                padding: 12,
                color: textColor,
                marginBottom: 6,
              }}
            />

            <Text style={{ fontSize: 12, color: secondaryTextColor }}>
              {newName.length}/20 characters
            </Text>
            {!canChangeName() && (
              <Text style={{ fontSize: 12, color: secondaryTextColor, marginTop: 6 }}>
                Next name change available on: {getNextNameChangeDateString()}
              </Text>
            )}
            <View
              style={{ flexDirection: "row", justifyContent: "flex-end", marginTop: 18 }}
            >
              <TouchableOpacity onPress={closeEditNameModal} style={{ marginRight: 20 }}>
                <Text style={{ color: secondaryTextColor, fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={updateName}>
                <Text style={{ color: primaryColor, fontWeight: "700", fontSize: 14 }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </Animated.View>
      </Modal>
    )}
      <ScrollView style={{ flex: 1, backgroundColor: bgColor }} showsVerticalScrollIndicator={false}>

        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={{
            position: 'absolute',
            top: 50,
            right: 20,
            zIndex: 10,
            padding: 8,
            backgroundColor: cardBg,
            borderRadius: 8,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
        >
          <Ionicons name="settings" size={24} color={textColor} />
        </TouchableOpacity>

        {/* Profile Info */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginTop: 80 }}>
          <TouchableOpacity onPress={showImageOptions} disabled={uploading}>
            <View style={{ position: 'relative' }}>
              {profilePic ? (
                <Image
                  source={{ uri: profilePic }}
                  style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: borderColor }}
                />
              ) : (
                <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: borderColor, justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ fontSize: 36, color: textColor, fontWeight: 'bold' }}>
                    {(displayName?.[0] || user?.displayName?.[0] || user?.email?.[0] || "U").toUpperCase()}
                  </Text>

                </View>
              )}
              <View style={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                backgroundColor: primaryColor,
                borderRadius: 16,
                padding: 6,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.3,
                shadowRadius: 4,
                elevation: 4,
              }}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="camera" size={16} color="#fff" />
                )}
              </View>
            </View>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 12 }}>
            
        <Text style={{ fontSize: 20, fontWeight: '600', color: textColor, marginRight: 8 }}>
          {displayName}
        </Text>

        <TouchableOpacity
          onPress={() => {
            if (!canChangeName()) {
              const days = getDaysUntilNameChange();
              showPanel(
                "Name Change Locked",
                `You can change your nickname again in ${days} day${days !== 1 ? "s" : ""}.`
              );
              return;
            }
            openEditNameModal();
          }}
          style={{ padding: 4 }}
        >
          <Ionicons name="pencil" size={18} color={primaryColor} />
        </TouchableOpacity>
      </View>
          </View>
          <Text style={{ fontSize: 14, color: secondaryTextColor, marginTop: 4 }}>
            {user?.email || ""}
          </Text>

          
          
          {/* Hard Mode Badge */}
          {hardMode && (
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#fef3c7',
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 16,
              marginTop: 8,
            }}>
              <Ionicons name="flash" size={16} color="#f59e0b" />
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#92400e', marginLeft: 4 }}>
                Hard Mode Active
              </Text>
            </View>
          )}
        </View>

       {/* Achievements - Horizontal Scroll */}
        <View style={{ marginBottom: 24, marginTop: 24 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: '600',
            color: textColor,
            marginBottom: 12,
            paddingHorizontal: 16
          }}>
            Achievements
          </Text>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
          >
            {achievements.map((item, idx) => {
              const achieved = streak >= item.streak;

              const iconColor = achieved ? primaryColor : "#A0AEC0";
              const textCol = achieved ? textColor : "#A0AEC0";

              return (
                <TouchableOpacity
                  key={idx}
                  disabled={!achieved}
                  onPress={() => handleAchievementTap(achieved, item.streak)}
                  style={{ alignItems: 'center', marginRight: 20 }}
                >
                  <View style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: iconBg,
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginBottom: 8,
                    opacity: achieved ? 1 : 0.4,
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 3,
                  }}>
                    <Ionicons name={item.icon as any} size={28} color={iconColor} />
                  </View>

                  <Text style={{
                    fontSize: 12,
                    fontWeight: '500',
                    color: textCol,
                    textAlign: 'center',
                    width: 80
                  }}>
                    {item.label}
                  </Text>

                  <Text style={{
                    fontSize: 12,
                    color: textCol,
                    textAlign: 'center'
                  }}>
                    {achieved ? "Achieved" : `${item.streak} Days`}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* My Skincare Plan */}
        {plan && (
        <View style={{ paddingHorizontal: 16, marginBottom: 24 }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: planBg,
              borderRadius: 12,
              padding: 16,
              marginBottom: 12,
              shadowColor: primaryColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
              elevation: 3,
            }}
            onPress={togglePlan}
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

          <Animated.View
            style={{
              overflow: "hidden",
              opacity: planAnim,
              maxHeight: planAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1500], // safe max height
              }),
              borderRadius: 12,
              backgroundColor: bgColor,
            }}
          >
            {plan?.routine && (
              <View style={{ gap: 12 }}>
                {/* Morning Section */}
                <View style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 12,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Ionicons name="sunny-outline" size={18} color="#f59e0b" />
                    <Text style={{ fontWeight: "600", color: textColor, marginLeft: 8 }}>Morning</Text>
                  </View>

                  {plan.routine.morning?.map((product: string, idx: number) => (
                    <View key={idx} style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: darkMode ? '#374151' : 'white',
                      borderRadius: 8,
                      marginBottom: 8,
                    }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: iconBg,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: 12,
                      }}>
                       <Ionicons name={getProductIcon(product)} size={16} color="#5C6BC0" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: textColor }}>{product}</Text>
                        <Text style={{ fontSize: 12, color: secondaryTextColor }}>Morning</Text>
                      </View>
                    </View>
                  ))}

                  {plan.routine.spf && (
                    <View style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: "#fef3c7",
                      borderRadius: 8,
                    }}>
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        backgroundColor: "#fde68a",
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}>
                        <Ionicons name="sunny" size={16} color="#92400e" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>
                          {plan.routine.spf}
                        </Text>
                        <Text style={{ fontSize: 12, color: "#92400e" }}>Morning</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Evening Section */}
                <View style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 12,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                    <Ionicons name="moon-outline" size={18} color="#5C6BC0" />
                    <Text style={{ fontWeight: "600", color: textColor, marginLeft: 8 }}>Evening</Text>
                  </View>

                  {plan.routine.evening?.map((product: string, idx: number) => (
                    <View key={idx} style={{
                      flexDirection: "row",
                      alignItems: "center",
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      backgroundColor: darkMode ? "#374151" : "white",
                      borderRadius: 8,
                      marginBottom: 8,
                    }}>
                      <View style={{
                        width: 32, height: 32, borderRadius: 8,
                        backgroundColor: iconBg,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                      }}>
                        <Ionicons name={getProductIcon(product)} size={16} color="#5C6BC0" />
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 14, fontWeight: "500", color: textColor }}>{product}</Text>
                        <Text style={{ fontSize: 12, color: secondaryTextColor }}>Evening</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>

          

          {/* Personalized Tips - Toggleable */}
          {plan?.routine.tips && (
            <View style={{ marginTop: 12 }}>
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: darkMode ? '#4a5568' : '#e0e7ff',
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 12,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}
                onPress={toggleTips}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="bulb-outline" size={20} color="#5C6BC0" />
                  <Text style={{ color: textColor, fontWeight: '600', marginLeft: 8 }}>Personalized Tips</Text>
                </View>
                <Ionicons
                  name={showTipsExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color="#5C6BC0"
                />
              </TouchableOpacity>

              <Animated.View
              style={{
                overflow: "hidden",
                opacity: tipsAnim,
                maxHeight: tipsAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 1000],
                }),
                borderRadius: 12,
              }}
            >
              {plan?.routine.tips && (
                <View style={{
                  backgroundColor: cardBg,
                  borderRadius: 12,
                  padding: 16,
                  gap: 12,
                  shadowColor: primaryColor,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                  elevation: 3,
                }}>
                  {plan.routine.tips.map((tip: string, idx: number) => (
                    <View key={idx} style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 8 }}>
                      <View style={{
                        width: 24, height: 24, borderRadius: 12,
                        backgroundColor: iconBg,
                        justifyContent: "center",
                        alignItems: "center",
                        marginRight: 12,
                        marginTop: 2,
                      }}>
                        <Ionicons name="checkmark" size={14} color="#5C6BC0" />
                      </View>

                      <Text style={{ fontSize: 14, color: textColor, flex: 1, lineHeight: 20 }}>
                        {tip}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </Animated.View>
            </View>
          )}
          
        </View>
        )}
        <View  style={{ paddingHorizontal: 16 }}>
        {!plan && (
        <TouchableOpacity
          style={{
            backgroundColor: darkMode ? '#4a5568' : '#e0e7ff',
            paddingVertical: 12,
            borderRadius: 12,
            marginTop: 12,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 3,
          }}
          onPress={() => router.push("../(auth)/skincare")}
        >
          <Text style={{ color: primaryColor, textAlign: 'center', fontSize: 14, fontWeight: '600' }}>
            Create a Plan
          </Text>
        </TouchableOpacity>
                 
        )}
         </View>
        {/* Recommended Brands - Horizontal Scroll */}
        {allBrands.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginBottom: 12, paddingHorizontal: 16 }}>
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
                    backgroundColor: planBg,
                    borderRadius: 12,
                    padding: 16,
                    marginRight: 12,
                    width: 96,
                    height: 96,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: primaryColor,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 6,
                    elevation: 3,
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
        <ErrorModal
        visible={errorVisible}
        message={errorMessage}
        title={errorTitle}
        onClose={() => setErrorVisible(false)}
        darkMode={darkMode}
      />
      <MessagePanel
        visible={panelVisible}
        title={panelTitle}
        message={panelMessage}
        actions={panelActions}
        onClose={hidePanel}
        darkMode={darkMode}
      />

        
      </ScrollView>

      {/* Settings Modal - Centered */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showSettings}
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={{
            backgroundColor: modalBg,
            padding: 20,
            borderRadius: 12,
            width: '80%',
            alignItems: 'center',
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8,
          }}>
            {/* Close X Button */}
            <TouchableOpacity
              onPress={() => setShowSettings(false)}
              style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}
            >
              <Ionicons name="close" size={24} color={textColor} />
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: textColor }}>Settings</Text>
            
            {/* Dark Mode */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="moon-outline" size={22} color="#5C6BC0" />
                <Text style={{ fontSize: 16, color: textColor, marginLeft: 12 }}>Dark Mode</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={async (value) => {
                  setDarkMode(value);
                  await saveDarkMode(value);
                }}
                trackColor={{ false: '#767577', true: '#5C6BC0' }}
                thumbColor={darkMode ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            {/* Hard Mode */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Ionicons name="flash-outline" size={22} color="#f59e0b" />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontSize: 16, color: textColor }}>Hard Mode</Text>
                  {hardMode && !canDisableHardMode() && (
                    <Text style={{ fontSize: 11, color: secondaryTextColor, marginTop: 2 }}>
                      Can disable in {getDaysUntilCanDisable()} day{getDaysUntilCanDisable() !== 1 ? 's' : ''}
                    </Text>
                  )}
                </View>
              </View>
              <Switch
                value={hardMode}
                onValueChange={(value) => {
                setShowSettings(false);
                setTimeout(() => handleHardModeToggle(value), 250);
              }}
                trackColor={{ false: '#767577', true: '#f59e0b' }}
                thumbColor={hardMode ? '#ffffff' : '#f4f3f4'}
              />
            </View>

            {/* Privacy Policy - Updated */}
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: borderColor }}
              onPress={() => {
                setShowSettings(false);
                setTimeout(() => handlePrivacyPolicy(), 250);
              }}

            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#5C6BC0" />
                <Text style={{ fontSize: 16, color: textColor, marginLeft: 12 }}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
            </TouchableOpacity>
            
            {/* Terms of Service */}
              <TouchableOpacity 
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  width: '100%',
                  marginBottom: 20,
                  paddingBottom: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: borderColor
                }}
                onPress={() => {
                  setShowSettings(false);
                  setTimeout(() => handleTermsOfService(), 250);
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons name="document-text-outline" size={22} color="#5C6BC0" />
                  <Text style={{ fontSize: 16, color: textColor, marginLeft: 12 }}>
                    Terms of Service
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={secondaryTextColor} />
              </TouchableOpacity>
            {/* Reset Plan */}
            <TouchableOpacity
              onPress={() => {
              setShowSettings(false);
              setTimeout(handleResetPlan, 300);
            }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#fee2e2',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                marginBottom: 12,
                width: '100%',
                shadowColor: '#dc2626',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 3,
              }}
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
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: primaryColor,
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                width: '100%',
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5,
              }}
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