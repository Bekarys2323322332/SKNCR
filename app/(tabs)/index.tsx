import { loadDarkMode } from '@/utils/storage';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import { differenceInCalendarDays, format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { router, useFocusEffect } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Linking, Modal, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import CalendarModal from '../../components/CalendarModal';
import ErrorModal from '../../components/ErrorModal';
import MessagePanel, { PanelAction } from '../../components/MessagePanel';
import PhotoViewer from '../../components/PhotoViewer';
import UVLevelPanel from "../../components/UvPanel";


interface CheckInData {
  completed: boolean;
  photo: string | null;
}

interface StreakPhotos {
  [key: string]: string;
}

interface ImagePickerAsset {
  uri: string;
  width?: number;
  height?: number;
  type?: string;
}

interface CheckinDetail {
  morningDone: boolean;
  eveningDone: boolean;
  completedHardMode: boolean;
}

// Notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const serverTimestamp = firestore.FieldValue.serverTimestamp;

// Get current time from Firestore server, not device
const getServerDate = async (): Promise<Date> => {
  try {
    const serverRef = firestore().collection("_meta").doc("serverTime");
    await serverRef.set(
      { now: serverTimestamp() },
      { merge: true }
    );
    const snap = await serverRef.get();

    const data = snap.data();
    const ts = data?.now;
    if (ts && typeof ts.toDate === "function") {
      return ts.toDate();
    }
  } catch (e) {
    console.error("Failed to get server time, falling back to device time", e);
  }
  // Fallback – still works, just not cheat-proof
  return new Date();
};



const StreakScreen: React.FC = () => {
  // State
  const [streak, setStreak] = useState<number>(0);
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);

  const [selectedPhoto, setSelectedPhoto] = useState<ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [streakPhotos, setStreakPhotos] = useState<StreakPhotos>({});

  const [isHardMode, setIsHardMode] = useState<boolean>(false);
  const [morningCheckIn, setMorningCheckIn] = useState<CheckInData>({ completed: false, photo: null });
  const [eveningCheckIn, setEveningCheckIn] = useState<CheckInData>({ completed: false, photo: null });
  const [currentCheckInType, setCurrentCheckInType] = useState<'morning' | 'evening'>('morning');

  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [checkedInDates, setCheckedInDates] = useState<Set<string>>(new Set());
  const [checkinDetails, setCheckinDetails] = useState<Record<string, CheckinDetail>>({});

  const [showPhotoViewer, setShowPhotoViewer] = useState<boolean>(false);
  const [viewerDate, setViewerDate] = useState<Date>(new Date());

  const [darkMode, setDarkMode] = useState<boolean>(false);

  const milestones = [7, 15, 30, 50, 100];
  const [nextMilestone, setNextMilestone] = useState<number | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState<boolean>(false);
  const [streakLoading, setStreakLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState("");
  const [errorTitle, setErrorTitle] = useState("");
  const [errorVisible, setErrorVisible] = useState(false);

  const [showProgressToast, setShowProgressToast] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-120)).current;

  const [panelVisible, setPanelVisible] = useState(false);
  const [panelTitle, setPanelTitle] = useState<string>('');
  const [panelMessage, setPanelMessage] = useState<string>('');
  const [panelActions, setPanelActions] = useState<PanelAction[]>([]);

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
  
  
  

  // Keep dark mode in sync (polling)
  useEffect(() => {
    const interval = setInterval(() => {
      loadDarkMode().then(setDarkMode);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const requestNotificationPermission = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Permission required', 'Enable notifications to receive streak reminders.');
      return false;
    }

    return true;
  };

  useEffect(() => {
    let isMounted = true;

    const unsubscribeAuth = auth().onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        router.replace("/(auth)/login");
        return;
      }

      await currentUser.reload();
      const refreshed = auth().currentUser;

      if (!refreshed || !refreshed.emailVerified) {
        await auth().signOut();
        router.replace("/(auth)/login");
        return;
      }




      if (!isMounted) return;

      try {
        setStreakLoading(true);

        await loadUserData(currentUser.uid);
        await loadStreakPhotos();
        await loadDailyCheckIns();
        requestPermissions();
        requestNotificationPermission();

        loadDarkMode().then(setDarkMode);

      } catch (e) {
        console.error("Error loading user data:", e);

      } finally {
        if (isMounted) setStreakLoading(false);
      }
    });

    return () => {
      isMounted = false;
      unsubscribeAuth();
    };
  }, []);


  // Next milestone tracking
  useEffect(() => {
    const milestone = milestones.find(m => m > streak) || null;
    setNextMilestone(milestone);
  }, [streak]);

  // Progress toast animation when streak changes
  useEffect(() => {
    if (streak <= 0) return;

    const next = milestones.find(m => m > streak);
    if (!next) return;

    const progress = streak / next;
    progressAnim.setValue(0);

    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 600,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false
    }).start();

    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      easing: Easing.out(Easing.ease),
      useNativeDriver: false
    }).start();

    setShowProgressToast(true);

    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -140,
        duration: 300,
        easing: Easing.in(Easing.ease),
        useNativeDriver: false
      }).start(() => setShowProgressToast(false));
    }, 3000);
  }, [streak]);

  // ---- Data helpers ----

  async function loadUserData(userId: string): Promise<void> {
    const userRef = firestore().collection("users").doc(userId);
    const userDoc = await userRef.get();



    const today = await getServerDate();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (!userDoc.exists) {
      await userRef.set({
        streakCount: 0,
        lastCheckin: null,
        hasCheckedInToday: false,
        hardMode: false,
        checkinDates: [],
        checkinProgress: {}
      });

      setStreak(0);
      setHasCheckedInToday(false);
      setIsHardMode(false);
      setCheckedInDates(new Set());
      setCheckinDetails({});
      setMorningCheckIn(prev => ({ ...prev, completed: false }));
      setEveningCheckIn(prev => ({ ...prev, completed: false }));
      return;
    }

    const data = userDoc.data() || {};

    // 1. Load hard mode instantly from local storage (instant UI update)
    const localHardMode = await AsyncStorage.getItem(`hardModeLocal_${userId}`);
    if (localHardMode !== null) {
      setIsHardMode(JSON.parse(localHardMode));
    }

    // 2. Then load remote hard mode (slow)
    if (data.hardMode !== undefined) {
      setIsHardMode(data.hardMode);
      await AsyncStorage.setItem(`hardModeLocal_${userId}`, JSON.stringify(data.hardMode));
    }



    // Checked-in dates
    const dates: string[] = data.checkinDates || [];
    setCheckedInDates(new Set(dates));

    // Streak + last check-in
    const lastCheckin = data.lastCheckin ? data.lastCheckin.toDate() : null;
    let currentStreak = data.streakCount ?? 0;
    let checkedToday = data.hasCheckedInToday ?? false;

    if (lastCheckin) {
      const diff = differenceInCalendarDays(today, lastCheckin);

      if (diff > 1) {
        // streak broken
        currentStreak = 0;
        checkedToday = false;
        await userRef.set({
          streakCount: 0,
          hasCheckedInToday: false
        }, { merge: true });
      } else if (diff >= 1) {
        // new day
        checkedToday = false;
        await userRef.set({
          hasCheckedInToday: false
        }, { merge: true });
      }
    }

    setStreak(currentStreak);
    setHasCheckedInToday(checkedToday);

    // Progress (hard mode) → morning/evening + calendar dots
    const progress = data.checkinProgress || {};
    const todayProgress = progress[todayStr] || { morning: false, evening: false };

    setMorningCheckIn(prev => ({
      ...prev,
      completed: !!todayProgress.morning
    }));

    setEveningCheckIn(prev => ({
      ...prev,
      completed: !!todayProgress.evening
    }));

    const details: Record<string, CheckinDetail> = {};
    Object.keys(progress).forEach(dateStr => {
      const p = progress[dateStr] || {};
      details[dateStr] = {
        morningDone: !!p.morning,
        eveningDone: !!p.evening,
        completedHardMode: !!p.morning && !!p.evening
      };
    });
    setCheckinDetails(details);
  }

  async function loadStreakPhotos(): Promise<void> {
    try {
      const uid = auth().currentUser?.uid;

      if (!uid) return;
      const savedPhotos = await AsyncStorage.getItem(`streakPhotos_${uid}`);
      if (savedPhotos) {
        setStreakPhotos(JSON.parse(savedPhotos) as StreakPhotos);
      }
    } catch (error) {
      console.error('Error loading streak photos:', error);
    }
  }

  async function loadDailyCheckIns(): Promise<void> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const uid = auth().currentUser?.uid;
      if (!uid) return;

      const morningData = await AsyncStorage.getItem(`${uid}_morning_${today}`);
      const eveningData = await AsyncStorage.getItem(`${uid}_evening_${today}`);



      if (morningData) {
        const parsed = JSON.parse(morningData) as CheckInData;
        setMorningCheckIn(prev => ({
          completed: prev.completed || parsed.completed,
          photo: parsed.photo ?? prev.photo
        }));
      }

      if (eveningData) {
        const parsed = JSON.parse(eveningData) as CheckInData;
        setEveningCheckIn(prev => ({
          completed: prev.completed || parsed.completed,
          photo: parsed.photo ?? prev.photo
        }));
      }
    } catch (error) {
      console.error('Error loading daily check-ins:', error);
    }
  }

  async function saveDailyCheckIn(type: 'morning' | 'evening', data: CheckInData): Promise<void> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const uid = auth().currentUser?.uid;

      if (!uid) return;

      await AsyncStorage.setItem(`${uid}_${type}_${today}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving daily check-in:', error);
    }
  }

  async function requestPermissions(): Promise<void> {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
    }
  }

  async function savePhotoToStorage(photoUri: string, type: 'single' | 'morning' | 'evening' = 'single'): Promise<boolean> {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const photoKey = type === 'single' ? today : `${today}_${type}`;
      const updatedPhotos: StreakPhotos = {
        ...streakPhotos,
        [photoKey]: photoUri,
      };
      const uid = auth().currentUser?.uid;

      if (!uid) return false;
      await AsyncStorage.setItem(`streakPhotos_${uid}`, JSON.stringify(updatedPhotos));
      setStreakPhotos(updatedPhotos);
      return true;
    } catch (error) {
      console.error('Error saving photo:', error);
      showError("Save Failed", "Could not save photo. Please try again.");
      return false;
    }
  }
    useFocusEffect(
      React.useCallback(() => {
        const uid = auth().currentUser?.uid;

        if (!uid) return; 
        loadUserData(uid);
      }, [])
    );
  const scheduleDailyReminders = async (
  hardMode: boolean,
  morningDone: boolean,
  eveningDone: boolean
) => {
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) return;

  // Clear old reminders on THIS device
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();

  const scheduleAt = async (hour: number, minute: number, body: string) => {
    const target = new Date();
    target.setHours(hour, minute, 0, 0);

    // If time already passed today → schedule for tomorrow
    if (target <= now) {
      target.setDate(target.getDate() + 1);
    }

    const seconds = Math.max(
      5,
      Math.round((target.getTime() - now.getTime()) / 1000)
    );

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Check-in Reminder",
        body,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        repeats: false,
      },
    });
  };

  if (!hardMode) {
    // EASY MODE
    // Always schedule 09:00 and 19:00 next occurrences
    await scheduleAt(9, 0, "Time to check in and keep your skincare streak going! ✨");
    await scheduleAt(19, 0, "Don't forget to check in before the day ends! 🔥");
  } else {
    // HARD MODE
    // Morning reminder at 12:00 if morning not done
    if (!morningDone) {
      await scheduleAt(12, 0, "Morning check-in reminder 🔆");
    }
    // Evening reminder at 20:00 if evening not done
    if (!eveningDone) {
      await scheduleAt(20, 0, "Evening check-in reminder 🌙 Complete your day!");
    }
  }
};


  async function saveDateToFirestore(date: Date): Promise<void> {
    const currentUser = auth().currentUser;
    if (!currentUser) return;

    const userRef = firestore().collection("users").doc(currentUser.uid);
    const snapshot = await userRef.get();

    const dateStr = format(date, "yyyy-MM-dd");
    const existing = snapshot.data()?.checkinDates || [];

    if (!existing.includes(dateStr)) {
      const updated = [...existing, dateStr];

    await userRef.set(
      { checkinDates: updated },
      { merge: true }
    );
      setCheckedInDates(new Set(updated));
    }
  }

  async function savePartialCheckInProgress(dateStr: string, type: 'morning' | 'evening'): Promise<void> {
  const currentUser = auth().currentUser;
  if (!currentUser) return;

  const userRef = firestore().collection("users").doc(currentUser.uid);
  const userDoc = await userRef.get();

  const existing = userDoc.data()?.checkinProgress || {};

  const day = existing[dateStr] || { morning: false, evening: false };
  day[type] = true;

  await userRef.set(
    {
      checkinProgress: {
        ...existing,
        [dateStr]: day,
      },
    },
    { merge: true }
  );

  setCheckinDetails(prev => {
    const prevDay = prev[dateStr] || {
      morningDone: false,
      eveningDone: false,
      completedHardMode: false
    };

    const updatedDay: CheckinDetail = {
      morningDone: type === 'morning' ? true : prevDay.morningDone,
      eveningDone: type === 'evening' ? true : prevDay.eveningDone,
      completedHardMode:
        (type === 'morning' ? true : prevDay.morningDone) &&
        (type === 'evening' ? true : prevDay.eveningDone),
    };

    return {
      ...prev,
      [dateStr]: updatedDay
    };
  });
}


  // ---- Image picking ----

  const pickImage = async (): Promise<void> => {
    Alert.alert(
      'Select Photo',
      'Choose how you want to add a photo',
      [
        {
          text: 'Camera',
          onPress: () => openCamera(),
        },
        {
          text: 'Photo Library',
          onPress: () => openImageLibrary(),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const openCamera = async (): Promise<void> => {
    const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();

    if (status !== "granted") {
      if (canAskAgain) {
        const { status: newStatus } = await ImagePicker.requestCameraPermissionsAsync();
        if (newStatus !== "granted") {
          return Alert.alert(
            "Camera Permission Needed",
            "Camera access is required to take a photo.",
            [
              { text: "Try Again", onPress: () => openCamera() },
              { text: "Cancel", style: "cancel" }
            ]
          );
        }
      } else {
        return Alert.alert(
          "Camera Permission Blocked",
          "You disabled camera access. Please enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") Linking.openURL("app-settings:");
                else Linking.openSettings();
              }
            }
          ]
        );
      }
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedPhoto(result.assets[0]);
    }
  };

  const openImageLibrary = async (): Promise<void> => {
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      if (canAskAgain) {
        const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== "granted") {
          return Alert.alert(
            "Photo Library Permission Needed",
            "We need access to your library to upload a photo.",
            [
              { text: "Try Again", onPress: () => openImageLibrary() },
              { text: "Cancel", style: "cancel" }
            ]
          );
        }
      } else {
        return Alert.alert(
          "Library Permission Blocked",
          "You disabled photo library access. Enable it in Settings.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => {
                if (Platform.OS === "ios") Linking.openURL("app-settings:");
                else Linking.openSettings();
              }
            }
          ]
        );
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
      aspect: [4, 3],
    });

    if (!result.canceled && result.assets?.length > 0) {
      setSelectedPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (type: 'single' | 'morning' | 'evening' = 'single'): Promise<boolean> => {
    if (!selectedPhoto) return false;

    setIsUploading(true);
    try {
      const photoSaved = await savePhotoToStorage(selectedPhoto.uri, type);
      if (!photoSaved) {
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    } catch (error) {
      console.error('Save error:', error);
      showError("Save Failed", "Could not save photo. Please try again.");
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  // ---- Check-in logic ----

  const checkIn = async (): Promise<void> => {
    if (checkingIn) return;

    if (!selectedPhoto) {
      showError('Photo Required', 'Please upload a photo before checking in');
      return;
    }

    if (isHardMode) {
      await handleHardModeCheckIn();
    } else {
      await handleEasyModeCheckIn();
    }
  };

  const handleEasyModeCheckIn = async (): Promise<void> => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      showError("Error", "Please sign in to check in");
      return;
    }

    setCheckingIn(true);

    try {
      const userRef = firestore().collection("users").doc(currentUser.uid);
      const userDoc = await userRef.get();


      if (!userDoc.exists) {
        setCheckingIn(false);
        return;
      }

      const data = userDoc.data() || {};

      // Cross-device protection
      if (data.hasCheckedInToday === true) {
        showError("Already Checked In", "Checked in with another device");
        setHasCheckedInToday(true);
        setCheckingIn(false);
        return;
      }

      // Save local photo first
      const saved = await uploadPhoto("single");
      if (!saved) {
        setCheckingIn(false);
        return;
      }

      const today = await getServerDate();
      const lastCheckin = data.lastCheckin ? data.lastCheckin.toDate() : null;
      let newStreak = data.streakCount ?? 0;

      if (!lastCheckin) {
        newStreak = 1;
      } else {
        const diff = differenceInCalendarDays(today, lastCheckin);
        if (diff === 1) newStreak++;
        if (diff > 1) newStreak = 1;
        if (diff === 0) {
          showError("Already Checked In", "Checked in with another device");
          setCheckingIn(false);
          return;
        }
      }

      await userRef.set({
        streakCount: newStreak,
        lastCheckin: serverTimestamp(),
        hasCheckedInToday: true
      }, { merge: true });

      await saveDateToFirestore(today);
      setStreak(newStreak);
      setHasCheckedInToday(true);
      setSelectedPhoto(null);
      showPanel(
        "Check-in Complete!",
        `You checked in successfully! Your streak is now ${newStreak} days.`,
        [{ text: "OK", style: "default" }]
      );


      if (milestones.includes(newStreak)) {
        setShowMilestoneModal(true);
        setTimeout(() => setShowMilestoneModal(false), 3000);
      }

      // Easy mode → schedule 09:00 & 19:00 reminders (starting next valid time)
      await scheduleDailyReminders(false, false, false);

    } catch (err) {
      console.error("Check-in error:", err);
      showError("Error", "Failed to check in.");
    }

    setCheckingIn(false);
  };

  const handleHardModeCheckIn = async (): Promise<void> => {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      showError("Error", "Please sign in to check in");
      return;
    }

    setCheckingIn(true);

    try {
      const userRef = firestore().collection("users").doc(currentUser.uid);
      const userDoc = await userRef.get();


      if (!userDoc.exists) {
        setCheckingIn(false);
        return;
      }

      const data = userDoc.data() || {};
      const today = await getServerDate();
      const checkInType = currentCheckInType;

      // Global lock if day already marked complete (across devices)
      if (data.hasCheckedInToday === true) {
        showError("Already Checked In", "Checked in with another device");
        setHasCheckedInToday(true);
        setCheckingIn(false);
        return;
      }

      // Save local photo
      const saved = await uploadPhoto(checkInType);
      if (!saved) {
        setCheckingIn(false);
        return;
      }

      const dateStr = format(today, "yyyy-MM-dd");
      await savePartialCheckInProgress(dateStr, checkInType);

      // Mark local check-in
      if (checkInType === "morning") {
        setMorningCheckIn({ completed: true, photo: selectedPhoto!.uri });
        await saveDailyCheckIn("morning", { completed: true, photo: selectedPhoto!.uri });
      } else {
        setEveningCheckIn({ completed: true, photo: selectedPhoto!.uri });
        await saveDailyCheckIn("evening", { completed: true, photo: selectedPhoto!.uri });
      }

      const bothDone =
        (checkInType === "morning" ? true : morningCheckIn.completed) &&
        (checkInType === "evening" ? true : eveningCheckIn.completed);
      const newMorningDone =
        checkInType === "morning" ? true : morningCheckIn.completed;
      const newEveningDone =
        checkInType === "evening" ? true : eveningCheckIn.completed;

      if (!bothDone) {
        showPanel("Congratulutaions!", `${checkInType} check-in completed!`);
        setCheckingIn(false);
        setSelectedPhoto(null);
        await scheduleDailyReminders(true, newMorningDone, newEveningDone);
        return;
      }

      // Both morning & evening done → full day
      await saveDateToFirestore(today);

      const lastCheckin = data.lastCheckin ? data.lastCheckin.toDate() : null;
      let newStreak = data.streakCount ?? 0;

      if (!lastCheckin) {
        newStreak = 1;
      } else {
        const diff = differenceInCalendarDays(today, lastCheckin);
        if (diff === 1) newStreak++;
        if (diff > 1) newStreak = 1;
      }

      await userRef.set({
        streakCount: newStreak,
        lastCheckin: serverTimestamp(),
        hasCheckedInToday: true
      }, { merge: true });

      setStreak(newStreak);
      setHasCheckedInToday(true);
      setSelectedPhoto(null);

      showPanel("Day Complete!", `You completed both check-ins! Streak: ${newStreak}`);

      if (milestones.includes(newStreak)) {
        setShowMilestoneModal(true);
        setTimeout(() => setShowMilestoneModal(false), 15000);
      }

      // Hard mode 
      // - 12:00 reminder if morning not done
      // - 20:00 reminder if evening not done
      await scheduleDailyReminders(true, newMorningDone, newEveningDone);

    } catch (err) {
      console.error("hard mode error:", err);
      showError("Error", "Failed to check in.");
    }

    setCheckingIn(false);
  };

  // ---- Photo helpers ----

  const getTodayPhotoUri = (type: 'single' | 'morning' | 'evening' = 'single'): string | undefined => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const photoKey = type === 'single' ? today : `${today}_${type}`;
    return streakPhotos[photoKey];
  };

  const getPhotoForDate = (
    date: Date,
    type: 'single' | 'morning' | 'evening' = 'single'
  ): string | undefined => {

    const dateStr = format(date, 'yyyy-MM-dd');

    // --- HARD MODE KEYS ---
    if (type === 'morning') return streakPhotos[`${dateStr}_morning`];
    if (type === 'evening') return streakPhotos[`${dateStr}_evening`];

    // --- EASY MODE KEY ---
    const single = streakPhotos[dateStr];
    if (single) return single;

    // --- FALLBACK: if specific type missing, return anything available ---
    return (
      streakPhotos[`${dateStr}_morning`] ||
      streakPhotos[`${dateStr}_evening`] ||
      single
    );
  };


  const removePhoto = (): void => {
    setSelectedPhoto(null);
  };

  // ---- Button / UI state helpers ----

  const canCheckIn = (): boolean => {
    const fullyCheckedInToday =
      hasCheckedInToday ||
      (morningCheckIn.completed && eveningCheckIn.completed);

    if (fullyCheckedInToday) return false;

    if (!isHardMode) {
      return !hasCheckedInToday && selectedPhoto !== null;
    }

    if (currentCheckInType === "morning") {
      return !morningCheckIn.completed && selectedPhoto !== null;
    } else {
      return !eveningCheckIn.completed && selectedPhoto !== null;
    }
  };


  const getCheckInButtonText = (): string => {
    const fullyCheckedInToday =
      hasCheckedInToday ||
      (morningCheckIn.completed && eveningCheckIn.completed);

    if (fullyCheckedInToday) {
      return "Already Checked In";
    }

    if (!selectedPhoto) {
      return "Upload Photo First";
    }

    if (!isHardMode) {
      return "Check-in";
    }

    return currentCheckInType === 'morning'
      ? (morningCheckIn.completed ? "Morning Complete" : "Morning Check-in")
      : (eveningCheckIn.completed ? "Evening Complete" : "Evening Check-in");
  };


  const shouldShowPhotoUpload = (): boolean => {
    const fullyCheckedInToday =
      hasCheckedInToday ||
      (morningCheckIn.completed && eveningCheckIn.completed);

    if (fullyCheckedInToday) return false;

    if (!isHardMode) return !hasCheckedInToday;

    return currentCheckInType === "morning"
      ? !morningCheckIn.completed
      : !eveningCheckIn.completed;
  };


  const getCurrentPhoto = (): string | null | undefined => {
    if (!isHardMode) {
      return getTodayPhotoUri('single');
    } else {
      if (currentCheckInType === 'morning') {
        return morningCheckIn.completed ? getTodayPhotoUri('morning') : null;
      } else {
        return eveningCheckIn.completed ? getTodayPhotoUri('evening') : null;
      }
    }
  };

  const openPhotoViewer = (date: Date): void => {
    const morning = getPhotoForDate(date, 'morning');
    const evening = getPhotoForDate(date, 'evening');
    const single = getPhotoForDate(date, 'single');

    const hasAnyPhoto = morning || evening || single;

    if (!hasAnyPhoto) return;  // absolutely empty → block

    setViewerDate(date);
    setShowPhotoViewer(true);
    setShowCalendar(false);
  };


  const navigateViewerDate = (direction: 'prev' | 'next'): void => {
    const sortedDates = Array.from(checkedInDates).sort();
    const currentDateStr = format(viewerDate, 'yyyy-MM-dd');
    const currentIndex = sortedDates.indexOf(currentDateStr);

    if (direction === 'prev' && currentIndex > 0) {
      setViewerDate(new Date(sortedDates[currentIndex - 1]));
    } else if (direction === 'next' && currentIndex < sortedDates.length - 1) {
      setViewerDate(new Date(sortedDates[currentIndex + 1]));
    }
  };

  const canNavigateViewer = (direction: 'prev' | 'next'): boolean => {
    const sortedDates = Array.from(checkedInDates).sort();
    const currentDateStr = format(viewerDate, 'yyyy-MM-dd');
    const currentIndex = sortedDates.indexOf(currentDateStr);

    if (direction === 'prev') {
      return currentIndex > 0;
    } else {
      return currentIndex < sortedDates.length - 1;
    }
  };

  const RollingNumber: React.FC<{ value: number; color?: string }> = ({ value, color = "#5C6BC0" }) => {
    const [current, setCurrent] = useState<number>(value);
    const [next, setNext] = useState<number>(value);
    const anim = useRef(new Animated.Value(0)).current;
    const height = 70;

    useEffect(() => {
      if (value === current) return;

      setNext(value);
      anim.setValue(0);

      Animated.timing(anim, {
        toValue: -height,
        duration: 350,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setCurrent(value);
        anim.setValue(0);
      });
    }, [value]);

    return (
      <View style={{ height, overflow: "hidden" }}>
        <Animated.View
          style={{
            transform: [{ translateY: anim }],
          }}
        >
          <Text
            style={{
              height,
              fontSize: 60,
              fontWeight: "bold",
              color,
              textAlign: "center",
            }}
          >
            {current}
          </Text>

          <Text
            style={{
              height,
              fontSize: 60,
              fontWeight: "bold",
              color,
              textAlign: "center",
            }}
          >
            {next}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const renderProgressToast = () => {
    if (!showProgressToast || !nextMilestone) return null;

    const barWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ["0%", "100%"]
    });

    const bgColor = darkMode ? '#1a1f3a' : 'white';
    const textColor = darkMode ? '#ffffff' : '#374151';
    const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
    const primaryColor = '#5C6BC0';

    return (
      <Animated.View style={{
        position: "absolute",
        top: slideAnim,
        alignSelf: "center",
        width: "90%",
        backgroundColor: bgColor,
        padding: 25,
        borderRadius: 14,
        zIndex: 999,
        shadowColor: primaryColor,
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 10,
      }}>
        <Text style={{ fontSize: 18, fontWeight: "bold", color: textColor, marginBottom: 6 }}>
          🔥 Daily Check-in!
        </Text>

        <View style={{
          width: "100%",
          height: 14,
          backgroundColor: darkMode ? "#2d2f45" : "#e5e7eb",
          borderRadius: 10,
          overflow: "hidden",
        }}>
          <Animated.View style={{
            height: "100%",
            backgroundColor: primaryColor,
            borderRadius: 10,
            width: barWidth,
          }} />
        </View>

        <Text style={{ color: secondaryTextColor, textAlign: "center", marginTop: 6 }}>
          {nextMilestone - streak} more days to {nextMilestone}! 🏆
        </Text>
      </Animated.View>
    );
  };


const calendarCheckinDetails: Record<string, CheckinDetail> = { ...checkinDetails };

  checkedInDates.forEach(dateStr => {
    // If hard-mode data already exists, keep it
    if (calendarCheckinDetails[dateStr]) return;

    // EASY MODE fallback: Check if single photo exists for this day
    const singlePhoto = streakPhotos[dateStr];

    if (singlePhoto) {
      // Easy-mode: treat as both morning + evening complete
      calendarCheckinDetails[dateStr] = {
        morningDone: true,
        eveningDone: true,
        completedHardMode: true, // THIS controls the green highlight background
      };
    } else {
      // No photos on this device (completed check-in on another device)
      calendarCheckinDetails[dateStr] = {
        morningDone: false,
        eveningDone: false,
        completedHardMode: false,
      };
    }
  }); 

  const bgColor = darkMode ? '#1a1f3a' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const cardBg = darkMode ? '#2d3748' : '#f3f4f6';
  const primaryColor = '#5C6BC0';

  if (streakLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" , backgroundColor: bgColor}}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView style={{ flex: 1, backgroundColor: bgColor }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginTop: 80 }}>
          <RollingNumber value={streak} color={primaryColor} />

          <Text style={{ fontSize: 24, fontWeight: '600', color: textColor, marginBottom: 8 }}>
            Day{streak !== 1 ? 's' : ''} Streak 🔥
          </Text>

          <Text style={{ fontSize: 16, color: secondaryTextColor, marginBottom: 8 }}>
            {isHardMode ? 'Hard Mode' : 'Easy Mode'}
          </Text>

          {streak > 0 && (
            <Text style={{ fontSize: 18, color: secondaryTextColor, marginBottom: 32 }}>
              {hasCheckedInToday
                ? "Keep it up! You're doing great!"
                : `Check in to keep the ${streak}-day streak going!`}
            </Text>
          )}

          {isHardMode && (
            <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: cardBg, borderRadius: 8, padding: 4 }}>
              <TouchableOpacity
                onPress={() => setCurrentCheckInType('morning')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 6,
                  backgroundColor: currentCheckInType === 'morning' ? '#5C6BC0' : 'transparent'
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  color: currentCheckInType === 'morning' ? 'white' : textColor,
                  fontWeight: '600'
                }}>
                  Morning {morningCheckIn.completed || hasCheckedInToday ? '✓' : ''}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCurrentCheckInType('evening')}
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                  borderRadius: 6,
                  backgroundColor: currentCheckInType === 'evening' ? '#5C6BC0' : 'transparent'
                }}
              >
                <Text style={{
                  textAlign: 'center',
                  color: currentCheckInType === 'evening' ? 'white' : textColor,
                  fontWeight: '600'
                }}>
                  Evening {eveningCheckIn.completed || hasCheckedInToday ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ width: '100%', marginTop: 16 }}>
            {!shouldShowPhotoUpload() && getCurrentPhoto() ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: textColor }}>
                  {isHardMode
                    ? `${currentCheckInType.charAt(0).toUpperCase() + currentCheckInType.slice(1)}'s Photo`
                    : "Today's Photo"}
                </Text>
                <Image
                  source={{ uri: getCurrentPhoto()! }}
                  style={{ width: 160, height: 160, borderRadius: 8, marginBottom: 16 }}
                  resizeMode="cover"
                />
              </View>
            ) : selectedPhoto ? (
              <View style={{ alignItems: 'center' }}>
                <Image
                  source={{ uri: selectedPhoto.uri }}
                  style={{ width: 160, height: 160, borderRadius: 8, marginBottom: 16 }}
                  resizeMode="cover"
                />
                <TouchableOpacity
                  onPress={removePhoto}
                  style={{
                    backgroundColor: '#ef4444',
                    paddingHorizontal: 16,
                    paddingVertical: 8,
                    borderRadius: 8,
                    marginBottom: 8,
                    shadowColor: '#ef4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Remove Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  width: '100%',
                  backgroundColor: cardBg,
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: darkMode ? '#4a5568' : '#9ca3af',
                  borderRadius: 8,
                  padding: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  opacity: shouldShowPhotoUpload() ? 1 : 0.5
                }}
                disabled={!shouldShowPhotoUpload()}
              >
                <Ionicons name="camera" size={40} color={secondaryTextColor} />
                <Text style={{ color: secondaryTextColor, marginTop: 8, textAlign: 'center' }}>
                  {shouldShowPhotoUpload()
                    ? `Tap to upload a photo\n(Required for ${isHardMode ? currentCheckInType : ''} check-in)`
                    : 'Already checked in'
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={checkIn}
            disabled={!canCheckIn() || checkingIn || isUploading}
            style={{
              width: '80%',
              marginTop: 16,
              marginBottom: 40,
              backgroundColor: '#5C6BC0',
              padding: 16,
              borderRadius: 12,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: (canCheckIn() && !checkingIn && !isUploading) ? 1 : 0.5,
              shadowColor: primaryColor,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            {checkingIn || isUploading ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <ActivityIndicator color="white" size="small" />
                <Text style={{ color: 'white', fontSize: 18, fontWeight: '600', marginLeft: 8 }}>
                  {getCheckInButtonText()}
                </Text>
              </View>
            ) : (
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                {getCheckInButtonText()}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 30, paddingHorizontal: 16, backgroundColor: bgColor }}>
          <UVLevelPanel />
        </View>

        <CalendarModal
          visible={showCalendar}
          onClose={() => setShowCalendar(false)}
          currentMonth={currentMonth}
          onMonthChange={setCurrentMonth}
          checkedInDates={checkedInDates}
          checkinDetails={calendarCheckinDetails}
          onDatePress={openPhotoViewer}
          darkMode={darkMode}
          getPhotoForDate={getPhotoForDate}
        />

        <PhotoViewer
          visible={showPhotoViewer}
          onClose={() => setShowPhotoViewer(false)}
          viewerDate={viewerDate}
          getPhotoForDate={getPhotoForDate}
          onNavigate={navigateViewerDate}
          canNavigate={canNavigateViewer}
        />

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

      <TouchableOpacity
        onPress={() => setShowCalendar(true)}
        style={{
          position: 'absolute',
          top: 60,
          right: 20,
          zIndex: 10,
          padding: 12,
          backgroundColor: primaryColor,
          borderRadius: 50,
          shadowColor: primaryColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 6,
        }}
      >
        <Ionicons name="calendar" size={28} color="white" />
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={showMilestoneModal}
        onRequestClose={() => setShowMilestoneModal(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.7)'
        }}>
          <View style={{
            backgroundColor: bgColor,
            padding: 32,
            borderRadius: 20,
            width: '85%',
            alignItems: 'center',
            shadowColor: primaryColor,
            shadowOpacity: 0.6,
            shadowRadius: 20,
            elevation: 10,
            borderWidth: 2,
            borderColor: primaryColor
          }}>
            <View style={{
              backgroundColor: primaryColor,
              width: 80,
              height: 80,
              borderRadius: 40,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20
            }}>
              <Text style={{ fontSize: 48 }}>🏆</Text>
            </View>

            <Text style={{ fontSize: 28, fontWeight: 'bold', color: primaryColor, marginBottom: 12 }}>
              Congratulations!
            </Text>

            <Text style={{ fontSize: 20, color: textColor, marginBottom: 8, textAlign: 'center' }}>
              You've reached a
            </Text>

            <Text style={{ fontSize: 36, fontWeight: 'bold', color: primaryColor, marginBottom: 20 }}>
              {streak}-Day Streak!
            </Text>

            {nextMilestone && (
              <View style={{
                backgroundColor: darkMode ? '#2d3748' : '#f3f4f6',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 12,
                marginBottom: 24
              }}>
                <Text style={{ fontSize: 16, color: secondaryTextColor, textAlign: 'center' }}>
                  Next milestone: {nextMilestone} days 🔥
                </Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowMilestoneModal(false)}
              style={{
                backgroundColor: primaryColor,
                paddingVertical: 14,
                paddingHorizontal: 40,
                borderRadius: 12,
                shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              <Text style={{ color: 'white', fontSize: 18, fontWeight: '600' }}>
                Awesome!
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ position: "absolute", top: 30, left: 0, right: 0, zIndex: 999 }}>
        {renderProgressToast()}
      </View>
    </View>
  );
};

export default StreakScreen;
