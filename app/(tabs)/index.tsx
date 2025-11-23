import { auth, db } from '@/app/utils/firebaseConfig';
import { loadDarkMode } from '@/app/utils/storage';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { JSX, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import UVLevelPanel from "../UvPanel";


// Type definitions
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

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const StreakScreen: React.FC = () => {
  const [streak, setStreak] = useState<number>(0);
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [streakPhotos, setStreakPhotos] = useState<StreakPhotos>({});
  
  // New state for hard mode functionality
  const [isHardMode, setIsHardMode] = useState<boolean>(false);
  const [morningCheckIn, setMorningCheckIn] = useState<CheckInData>({ completed: false, photo: null });
  const [eveningCheckIn, setEveningCheckIn] = useState<CheckInData>({ completed: false, photo: null });
  const [currentCheckInType, setCurrentCheckInType] = useState<'morning' | 'evening'>('morning');
  
  // Calendar state
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [checkedInDates, setCheckedInDates] = useState<Set<string>>(new Set());
  
  // Photo viewer state
  const [showPhotoViewer, setShowPhotoViewer] = useState<boolean>(false);
  const [viewerDate, setViewerDate] = useState<Date>(new Date());
  
  // Dark mode state
  const [darkMode, setDarkMode] = useState<boolean>(false);

  //Awards
  const milestones = [7, 15, 30, 50, 100];

  // For progress bar + popup
  const [nextMilestone, setNextMilestone] = useState<number | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState<boolean>(false);

  const [showProgressToast, setShowProgressToast] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-120)).current; // slide from above screen


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

  // Load hard mode status from Firestore
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            // Get hard mode status from Firestore
            if (userData.hardMode !== undefined) {
              setIsHardMode(userData.hardMode);
              // Also save to AsyncStorage for compatibility
              await AsyncStorage.setItem("isHardMode", JSON.stringify(userData.hardMode));
            }
          }
        } catch (error) {
          console.error('Error loading hard mode from Firestore:', error);
        }
      }
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    loadStreak();
    loadStreakPhotos();
    loadDailyCheckIns();
    requestPermissions();
    loadCheckedInDates();
    requestNotificationPermission();
    loadDarkMode().then(setDarkMode);
  }, []);

  // Refresh dark mode periodically to sync with profile changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadDarkMode().then(setDarkMode);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const loadCheckedInDates = async (): Promise<void> => {
    try {
      const savedDates = await AsyncStorage.getItem('checkedInDates');
      if (savedDates) {
        setCheckedInDates(new Set(JSON.parse(savedDates) as string[]));
      }
    } catch (error) {
      console.error('Error loading checked-in dates:', error);
    }
  };

  const saveCheckedInDate = async (date: Date): Promise<void> => {
    try {
      const dateString = format(date, 'yyyy-MM-dd');
      const updatedDates = new Set([...checkedInDates, dateString]);
      await AsyncStorage.setItem('checkedInDates', JSON.stringify([...updatedDates]));
      setCheckedInDates(updatedDates);
    } catch (error) {
      console.error('Error saving checked-in date:', error);
    }
  };

  useEffect(() => {
    const milestone = milestones.find(m => m > streak) || null;
    setNextMilestone(milestone);
  }, [streak]);
  



  const loadDailyCheckIns = async (): Promise<void> => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const morningData = await AsyncStorage.getItem(`morning_${today}`);
      const eveningData = await AsyncStorage.getItem(`evening_${today}`);
      
      if (morningData) {
        setMorningCheckIn(JSON.parse(morningData) as CheckInData);
      } else {
        setMorningCheckIn({ completed: false, photo: null });
      }
      
      if (eveningData) {
        setEveningCheckIn(JSON.parse(eveningData) as CheckInData);
      } else {
        setEveningCheckIn({ completed: false, photo: null });
      }
    } catch (error) {
      console.error('Error loading daily check-ins:', error);
    }
  };

  const saveDailyCheckIn = async (type: string, data: CheckInData): Promise<void> => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      await AsyncStorage.setItem(`${type}_${today}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving daily check-in:', error);
    }
  };

  const requestPermissions = async (): Promise<void> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to upload photos.');
    }
  };

  const loadStreakPhotos = async (): Promise<void> => {
    try {
      const savedPhotos = await AsyncStorage.getItem('streakPhotos');
      if (savedPhotos) {
        setStreakPhotos(JSON.parse(savedPhotos) as StreakPhotos);
      }
    } catch (error) {
      console.error('Error loading streak photos:', error);
    }
  };

  const savePhotoToStorage = async (photoUri: string, type: string = 'single'): Promise<boolean> => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const photoKey = type === 'single' ? today : `${today}_${type}`;
      const updatedPhotos: StreakPhotos = {
        ...streakPhotos,
        [photoKey]: photoUri,
      };
      
      await AsyncStorage.setItem('streakPhotos', JSON.stringify(updatedPhotos));
      setStreakPhotos(updatedPhotos);
      return true;
    } catch (error) {
      console.error('Error saving photo:', error);
      Alert.alert('Error', 'Failed to save photo locally');
      return false;
    }
  };

  const scheduleHourlyReminders = async () => {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    await Notifications.cancelAllScheduledNotificationsAsync();

    const reminders = [
      { hours: 12, body: "It's been 12 hours! Don't forget to check in and keep your streak alive!" },
      { hours: 18, body: "18 hours passed. Make sure you complete your check-in today!" },
      { hours: 23, body: "23 hours! Final reminder before your streak resets!" },
    ];

    for (let r of reminders) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Check-In Reminder",
          body: r.body,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: r.hours * 60 * 60,
          repeats: false,        
        },
      });
    }
  };

  const loadStreak = async (): Promise<void> => {
    try {
      const today = new Date();
      const lastOpened = await AsyncStorage.getItem("lastOpened");
      const storedStreak = parseInt((await AsyncStorage.getItem("streak")) || "0", 10);
      
      // Load hard mode from Firestore instead of AsyncStorage
      const currentUser = auth.currentUser;
      let hardMode = false;
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            hardMode = userDoc.data().hardMode || false;
          }
        } catch (error) {
          console.error('Error loading hard mode:', error);
        }
      }

      let newStreak = storedStreak;
      let checkedInToday = false;
      
      if (lastOpened) {
        const lastDate = new Date(lastOpened);
        const dayDifference = differenceInCalendarDays(today, lastDate);
        if (dayDifference > 1) {
          newStreak = 0;
          await AsyncStorage.multiSet([
            ["streak", newStreak.toString()],
          ]);
        }
        if (dayDifference === 0) {
          if (hardMode) {
            const todayStr = format(today, 'yyyy-MM-dd');
            const morningData = await AsyncStorage.getItem(`morning_${todayStr}`);
            const eveningData = await AsyncStorage.getItem(`evening_${todayStr}`);
            const morning = morningData ? JSON.parse(morningData) as CheckInData : { completed: false, photo: null };
            const evening = eveningData ? JSON.parse(eveningData) as CheckInData : { completed: false, photo: null };
            checkedInToday = morning.completed && evening.completed;
          } else {
            checkedInToday = true;
          }
        }
      }
      
      setStreak(newStreak);
      setHasCheckedInToday(checkedInToday);

    } catch (error) {
      console.error('Error loading streak:', error);
    }
  };
 useEffect(() => {
  if (streak <= 0) return;

  const next = milestones.find(m => m > streak);
  if (!next) return;

  const progress = streak / next;

  // Reset animation starting width
  progressAnim.setValue(0);

  // Animate width
  Animated.timing(progressAnim, {
    toValue: progress,
    duration: 600,
    easing: Easing.out(Easing.ease),
    useNativeDriver: false
  }).start();

  // Slide down
  Animated.timing(slideAnim, {
    toValue: 0,
    duration: 300,
    easing: Easing.out(Easing.ease),
    useNativeDriver: false
  }).start();

  setShowProgressToast(true);

  // Auto-close toast
  setTimeout(() => {
    Animated.timing(slideAnim, {
      toValue: -140,
      duration: 300,
      easing: Easing.in(Easing.ease),
      useNativeDriver: false
    }).start(() => setShowProgressToast(false));
  }, 3000);

}, [streak]);


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
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedPhoto(result.assets[0]);
    }
  };

  const openImageLibrary = async (): Promise<void> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedPhoto(result.assets[0]);
    }
  };

  const uploadPhoto = async (type: string = 'single'): Promise<boolean> => {
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
      Alert.alert('Save Failed', 'Failed to save photo. Please try again.');
      return false;
    } finally {
      setIsUploading(false);
    }
  };

  const checkIn = async (): Promise<void> => {
    await Notifications.cancelAllScheduledNotificationsAsync();
    if (checkingIn) return;

    if (!selectedPhoto) {
      Alert.alert('Photo Required', 'Please upload a photo before checking in');
      return;
    }

    if (isHardMode) {
      await handleHardModeCheckIn();
    } else {
      await handleEasyModeCheckIn();
    }
  };

  const handleEasyModeCheckIn = async (): Promise<void> => {
    if (hasCheckedInToday) return;

    setCheckingIn(true);

    try {
      const uploadSuccess = await uploadPhoto('single');
      if (!uploadSuccess) {
        setCheckingIn(false);
        return;
      }

      const today = new Date();
      const lastOpened = await AsyncStorage.getItem("lastOpened");
      const storedStreak = parseInt((await AsyncStorage.getItem("streak")) || "0", 10);
      const startDay = new Date((await AsyncStorage.getItem("startDay")) || today);

      let newStreak = storedStreak;
      let newStartDay = startDay;
      let checkedInToday = false;

      if (lastOpened) {
        const lastDate = new Date(lastOpened);
        const dayDifference = differenceInCalendarDays(today, lastDate);
        
        if (dayDifference === 1) {
          newStreak += 1;
          checkedInToday = true;
        } 
        else if ((dayDifference > 1 && storedStreak === 0) || (dayDifference === 0 && storedStreak === 0)) {
          newStreak += 1;
          newStartDay = today;
          checkedInToday = true;
        } else if (dayDifference === 0 && storedStreak > 0) {
          Alert.alert("Already checked in today!");
          setCheckingIn(false);
          checkedInToday = true;
          return;
        } 
      } else {
        newStreak = 1;
        newStartDay = today;
        checkedInToday = true;
      }

      await AsyncStorage.multiSet([
        ["streak", newStreak.toString()],
        ["startDay", newStartDay.toISOString()],
        ["lastOpened", today.toISOString()],
      ]);

      await saveCheckedInDate(today);

      setStreak(newStreak);
      setHasCheckedInToday(checkedInToday);
      setSelectedPhoto(null);
      setCheckingIn(false);
      // Check milestone
      if (milestones.includes(newStreak)) {
        setShowMilestoneModal(true);

        // Auto-close after 4 seconds
        setTimeout(() => setShowMilestoneModal(false), 4000);
      }



      await scheduleHourlyReminders();

      await saveStreakToFirestore(newStreak, morningCheckIn, eveningCheckIn);

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
      setCheckingIn(false);
    }
  };

  const handleHardModeCheckIn = async (): Promise<void> => {
    const checkInType = currentCheckInType;

    if ((checkInType === 'morning' && morningCheckIn.completed) || 
        (checkInType === 'evening' && eveningCheckIn.completed)) {
      Alert.alert('Already checked in', `You've already completed your ${checkInType} check-in for today!`);
      return;
    }

    setCheckingIn(true);

    try {
      const uploadSuccess = await uploadPhoto(checkInType);
      if (!uploadSuccess) {
        setCheckingIn(false);
        return;
      }

      const checkInData: CheckInData = { completed: true, photo: selectedPhoto!.uri };
      
      if (checkInType === 'morning') {
        setMorningCheckIn(checkInData);
        await saveDailyCheckIn('morning', checkInData);
      } else {
        setEveningCheckIn(checkInData);
        await saveDailyCheckIn('evening', checkInData);
      }

      const bothCompleted = (checkInType === 'morning' ? true : morningCheckIn.completed) && 
                           (checkInType === 'evening' ? true : eveningCheckIn.completed);

      if (bothCompleted && !hasCheckedInToday) {
        const today = new Date();
        const lastOpened = await AsyncStorage.getItem("lastOpened");
        const storedStreak = parseInt((await AsyncStorage.getItem("streak")) || "0", 10);
        const startDay = new Date((await AsyncStorage.getItem("startDay")) || today);

        let newStreak = storedStreak;
        let newStartDay = startDay;

        if (lastOpened) {
          const lastDate = new Date(lastOpened);
          const dayDifference = differenceInCalendarDays(today, lastDate);
          
          if (dayDifference === 1) {
            newStreak += 1;
          } 
          else if (dayDifference > 1 || storedStreak === 0) {
            newStreak = 1;
            newStartDay = today;
          }
        } else {
          newStreak = 1;
          newStartDay = today;
        }

        await AsyncStorage.multiSet([
          ["streak", newStreak.toString()],
          ["startDay", newStartDay.toISOString()],
          ["lastOpened", today.toISOString()],
        ]);

        await saveCheckedInDate(today);

        setStreak(newStreak);
        setHasCheckedInToday(true);
        // Check milestone
        if (milestones.includes(newStreak)) {
          setShowMilestoneModal(true);

          // Auto-close after 4 seconds
          setTimeout(() => setShowMilestoneModal(false), 4000);
        }

        
        Alert.alert('Day Complete!', `Both check-ins completed! Your streak is now ${newStreak} ${newStreak === 1 ? 'day' : 'days'}! 🔥`);
      } else {
        Alert.alert('Success!', `${checkInType.charAt(0).toUpperCase() + checkInType.slice(1)} check-in completed! ${bothCompleted ? '' : `Don't forget your ${checkInType === 'morning' ? 'evening' : 'morning'} check-in.`}`);
      }
      await scheduleHourlyReminders();

      setSelectedPhoto(null);
      setCheckingIn(false);
      
      const updatedMorning = checkInType === 'morning' ? checkInData : morningCheckIn;
      const updatedEvening = checkInType === 'evening' ? checkInData : eveningCheckIn;
      await saveStreakToFirestore(streak, updatedMorning, updatedEvening);

    } catch (error) {
      console.error('Check-in error:', error);
      Alert.alert('Error', 'Failed to check in. Please try again.');
      setCheckingIn(false);
    }
  };

  const getTodayPhotoUri = (type: string = 'single'): string | undefined => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const photoKey = type === 'single' ? today : `${today}_${type}`;
    return streakPhotos[photoKey];
  };

  const getPhotoForDate = (date: Date, type: string = 'single'): string | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const photoKey = type === 'single' ? dateStr : `${dateStr}_${type}`;
    return streakPhotos[photoKey];
  };

  const removePhoto = (): void => {
    setSelectedPhoto(null);
  };

  const canCheckIn = (): boolean => {
    if (!isHardMode) {
      return !hasCheckedInToday && selectedPhoto !== null;
    } else {
      if (currentCheckInType === 'morning') {
        return !morningCheckIn.completed && selectedPhoto !== null;
      } else {
        return !eveningCheckIn.completed && selectedPhoto !== null;
      }
    }
  };

  const getCheckInButtonText = (): string => {
    if (checkingIn || isUploading) {
      return isUploading ? "Saving..." : "Checking in...";
    }
    
    if (!selectedPhoto) {
      return "Upload Photo First";
    }
    
    if (!isHardMode) {
      return hasCheckedInToday ? "Checked in" : "Check-in";
    } else {
      if (currentCheckInType === 'morning') {
        return morningCheckIn.completed ? "Morning Complete" : "Morning Check-in";
      } else {
        return eveningCheckIn.completed ? "Evening Complete" : "Evening Check-in";
      }
    }
  };

  const shouldShowPhotoUpload = (): boolean => {
    if (!isHardMode) {
      return !hasCheckedInToday;
    } else {
      if (currentCheckInType === 'morning') {
        return !morningCheckIn.completed;
      } else {
        return !eveningCheckIn.completed;
      }
    }
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
  
  const saveStreakToFirestore = async (
    streakCount: number, 
    morningCheckIn: CheckInData, 
    eveningCheckIn: CheckInData
  ): Promise<void> => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);

    try {
      await setDoc(userRef, {
        streakCount: streakCount,
        lastCheckin: serverTimestamp(),
        dailyCheckIns: {
          morning: morningCheckIn,
          evening: eveningCheckIn
        }
      }, { merge: true });
    } catch (error) {
      console.error('Error saving streak to Firestore:', error);
    }
  };

  const openPhotoViewer = (date: Date): void => {
    const dateStr = format(date, 'yyyy-MM-dd');
    if (checkedInDates.has(dateStr)) {
      setViewerDate(date);
      setShowPhotoViewer(true);
      setShowCalendar(false);
    }
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

  const renderPhotoViewer = (): JSX.Element => {
    const photo = getPhotoForDate(viewerDate, 'single');
    const morningPhoto = getPhotoForDate(viewerDate, 'morning');
    const eveningPhoto = getPhotoForDate(viewerDate, 'evening');
    const hasHardModePhotos = morningPhoto || eveningPhoto;

    return (
      <Modal
        animationType="fade"
        transparent={true}
        visible={showPhotoViewer}
        onRequestClose={() => setShowPhotoViewer(false)}
      >
        <View style={{ 
          flex: 1, 
          backgroundColor: 'rgba(0,0,0,0.9)',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <View style={{
            position: 'absolute',
            top: 50,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingHorizontal: 20,
            zIndex: 10
          }}>
            <Text style={{ 
              fontSize: 20, 
              fontWeight: 'bold', 
              color: 'white' 
            }}>
              {format(viewerDate, 'MMMM d, yyyy')}
            </Text>
            <TouchableOpacity 
              onPress={() => setShowPhotoViewer(false)}
              style={{ padding: 8 }}
            >
              <Ionicons name="close" size={32} color="white" />
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }}>
            {hasHardModePhotos ? (
              <View style={{ width: '100%' }}>
                {morningPhoto && (
                  <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                      Morning Check-in
                    </Text>
                    <Image 
                      source={{ uri: morningPhoto }} 
                      style={{ 
                        width: Dimensions.get('window').width - 40,
                        height: (Dimensions.get('window').width - 40) * 0.75,
                        borderRadius: 12
                      }}
                      resizeMode="cover"
                    />
                  </View>
                )}
                {eveningPhoto && (
                  <View>
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: '600', marginBottom: 8, textAlign: 'center' }}>
                      Evening Check-in
                    </Text>
                    <Image 
                      source={{ uri: eveningPhoto }} 
                      style={{ 
                        width: Dimensions.get('window').width - 40,
                        height: (Dimensions.get('window').width - 40) * 0.75,
                        borderRadius: 12
                      }}
                      resizeMode="cover"
                    />
                  </View>
                )}
              </View>
            ) : photo ? (
              <Image 
                source={{ uri: photo }} 
                style={{ 
                  width: Dimensions.get('window').width - 40,
                  height: (Dimensions.get('window').width - 40) * 0.75,
                  borderRadius: 12
                }}
                resizeMode="cover"
              />
            ) : (
              <Text style={{ color: 'white', fontSize: 16 }}>No photo available</Text>
            )}
          </View>

          <View style={{
            position: 'absolute',
            bottom: 50,
            left: 0,
            right: 0,
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingHorizontal: 20
          }}>
            <TouchableOpacity
              onPress={() => navigateViewerDate('prev')}
              disabled={!canNavigateViewer('prev')}
              style={{
                padding: 16,
                backgroundColor: canNavigateViewer('prev') ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.2)',
                borderRadius: 50
              }}
            >
              <Ionicons name="chevron-back" size={32} color="white" />
            </TouchableOpacity>
            
            <TouchableOpacity
              onPress={() => navigateViewerDate('next')}
              disabled={!canNavigateViewer('next')}
              style={{
                padding: 16,
                backgroundColor: canNavigateViewer('next') ? 'rgba(255,255,255,0.2)' : 'rgba(128,128,128,0.2)',
                borderRadius: 50
              }}
            >
              <Ionicons name="chevron-forward" size={32} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  const renderCalendar = (): JSX.Element => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const startDay = monthStart.getDay();
    const emptyCells: null[] = Array(startDay).fill(null);
    
    const allCells: (Date | null)[] = [...emptyCells, ...days];
    
    // Dark mode colors for calendar
    const calTextColor = darkMode ? '#ffffff' : '#374151';
    const calSecondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
    const calCardBg = bgColor;
    
    return (
      <View style = {{  flex: 1, backgroundColor: bgColor }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={calTextColor} />
          </TouchableOpacity>
          
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: calTextColor }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-forward" size={24} color={calTextColor} />
          </TouchableOpacity>
        </View>
        
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <View key={day} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: calSecondaryTextColor }}>{day}</Text>
            </View>
          ))}
        </View>
        
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {allCells.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={{ width: '14.28%', height: 40 }} />;
            }
            
            const dayString = format(day, 'yyyy-MM-dd');
            const isCheckedIn = checkedInDates.has(dayString);
            const isToday = isSameDay(day, new Date());
            
            return (
              <TouchableOpacity
                key={index}
                style={{ width: '14.28%', height: 40, padding: 2 }}
                onPress={() => isCheckedIn ? openPhotoViewer(day) : null}
                disabled={!isCheckedIn}
              >
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCheckedIn ? '#22c55e' : (isToday ? (bgColor) : 'transparent'),
                  borderRadius: 4,
                  borderWidth: isToday ? 1 : 0,
                  borderColor: '#5C6BC0',
                  shadowColor: isCheckedIn ? '#22c55e' : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: isCheckedIn ? 'white' : calTextColor,
                    fontWeight: isToday ? 'bold' : 'normal'
                  }}>
                    {day.getDate()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
        
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, backgroundColor: '#22c55e', borderRadius: 3, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: calSecondaryTextColor }}>Checked in (tap to view)</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, backgroundColor: calCardBg, borderRadius: 3, marginRight: 6, borderWidth: 1, borderColor: '#5C6BC0' }} />
            <Text style={{ fontSize: 12, color: calSecondaryTextColor }}>Today</Text>
          </View>
        </View>
      </View>
    );
  };
  const renderProgressToast = () => {
  if (!showProgressToast || !nextMilestone) return null;

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  return (
    <Animated.View style={{
      position: "absolute",
      top: slideAnim,
      alignSelf: "center",
      width: "90%",
      backgroundColor: bgColor,
      padding: 25  ,
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

  return (

    <View style={{ flex: 1, backgroundColor: bgColor }}>
      <ScrollView style={{flex:1, backgroundColor: bgColor }} showsVerticalScrollIndicator={false}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginTop: 80 }}>
          <Text style={{ fontSize: 60, fontWeight: 'bold', color: primaryColor, marginBottom: 16, shadowColor: primaryColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 6, }}>{streak}</Text>
          <Text style={{ fontSize: 24, fontWeight: '600', color: textColor, marginBottom: 8 }}>
            Day{streak !== 1 ? 's' : ''} Streak 🔥
          </Text>

          <Text style={{ fontSize: 16, color: secondaryTextColor, marginBottom: 8 }}>
            {isHardMode ? 'Hard Mode' : 'Easy Mode'}
          </Text>
          {streak > 0 && (
            <Text style={{ fontSize: 18, color: secondaryTextColor, marginBottom: 32 }}>
              {hasCheckedInToday ? "Keep it up! You're doing great!" : `Check in to keep the ${streak}-day streak going!`}
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
                  Morning {morningCheckIn.completed ? '✓' : ''}
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
                  Evening {eveningCheckIn.completed ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ width: '100%', marginTop: 16 }}>
            {!shouldShowPhotoUpload() && getCurrentPhoto() ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8, color: textColor }}>
                  {isHardMode ? `${currentCheckInType.charAt(0).toUpperCase() + currentCheckInType.slice(1)}'s Photo` : "Today's Photo"}
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
                  style={{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginBottom: 8, shadowColor: '#ef4444',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5, }}
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
        
        <View style={{ marginTop: 30, paddingHorizontal: 16, backgroundColor: bgColor}}>
          <UVLevelPanel />
        </View>
        

        <Modal
          animationType="fade"
          transparent={true}
          visible={showCalendar}
          onRequestClose={() => setShowCalendar(false)}
        >
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: 'rgba(0,0,0,0.5)' 
            
          }}>
            <View style={{ 
              backgroundColor: bgColor, 
              padding: 20, 
              borderRadius: 12, 
              width: '90%',
              maxHeight: '80%'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor }}>Streak Calendar</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Ionicons name="close" size={24} color={textColor} />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {renderCalendar()}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {renderPhotoViewer()}
      </ScrollView>
      
      <TouchableOpacity
        onPress={() => setShowCalendar(true)}
        style={{
          position: 'absolute',
          top: 50,
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
          backgroundColor: 'rgba(0,0,0,0.6)'
        }}>
          <View style={{
            backgroundColor: bgColor,
            padding: 24,
            borderRadius: 16,
            width: '80%',
            alignItems: 'center',
            shadowColor: primaryColor,
            shadowOpacity: 0.5,
            shadowRadius: 14
          }}>
            <Text style={{ fontSize: 34 }}>🏆</Text>
            <Text style={{ fontSize: 22, fontWeight: 'bold', color: textColor, marginBottom: 10 }}>
              Congratulations!
            </Text>

            <Text style={{ fontSize: 18, color: textColor, marginBottom: 20 }}>
              You hit a {streak}-day streak!
            </Text>

            {nextMilestone && (
              <Text style={{ fontSize: 16, color: secondaryTextColor }}>
                Next reward: {nextMilestone} days 🔥
              </Text>
            )}
          </View>
        </View>
      </Modal>
      <View style={{ position: "absolute", top: 25, left: 0, right: 0, zIndex: 999 }}>
      {renderProgressToast()}
      </View>
    </View>
  );
};

export default StreakScreen;