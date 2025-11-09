import { auth, db } from '@/app/utils/firebaseConfig';
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { differenceInCalendarDays, eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import React, { JSX, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, ScrollView, Switch, Text, TouchableOpacity, View } from 'react-native';
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

const StreakScreen: React.FC = () => {
  const [streak, setStreak] = useState<number>(0);
  const [checkingIn, setCheckingIn] = useState<boolean>(false);
  const [hasCheckedInToday, setHasCheckedInToday] = useState<boolean>(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ImagePickerAsset | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [streakPhotos, setStreakPhotos] = useState<StreakPhotos>({});
  
  // New state for hard mode functionality
  const [isHardMode, setIsHardMode] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [morningCheckIn, setMorningCheckIn] = useState<CheckInData>({ completed: false, photo: null });
  const [eveningCheckIn, setEveningCheckIn] = useState<CheckInData>({ completed: false, photo: null });
  const [currentCheckInType, setCurrentCheckInType] = useState<'morning' | 'evening'>('morning');
  
  // Calendar state
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [checkedInDates, setCheckedInDates] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadStreak();
    loadStreakPhotos();
    loadSettings();
    loadDailyCheckIns();
    requestPermissions();
    loadCheckedInDates();
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

  const loadSettings = async (): Promise<void> => {
    try {
      const hardMode = await AsyncStorage.getItem('isHardMode');
      if (hardMode !== null) {
        setIsHardMode(JSON.parse(hardMode) as boolean);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (hardMode: boolean): Promise<void> => {
    try {
      await AsyncStorage.setItem('isHardMode', JSON.stringify(hardMode));
      setIsHardMode(hardMode);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

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

  const loadStreak = async (): Promise<void> => {
    try {
      const today = new Date();
      const lastOpened = await AsyncStorage.getItem("lastOpened");
      const storedStreak = parseInt((await AsyncStorage.getItem("streak")) || "0", 10);
      const hardMode = JSON.parse((await AsyncStorage.getItem("isHardMode")) || "false") as boolean;

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
            // In hard mode, check if both morning and evening are completed
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

      // Save the checked-in date for calendar display
      await saveCheckedInDate(today);

      setStreak(newStreak);
      setHasCheckedInToday(checkedInToday);
      setSelectedPhoto(null);
      setCheckingIn(false);

      Alert.alert('Success!', `Check-in successful! Your streak is now ${newStreak} ${newStreak === 1 ? 'day' : 'days'}! 🔥`);

      await saveStreakToFirestore(newStreak, morningCheckIn, eveningCheckIn, streakPhotos);

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

      // Check if both check-ins are now complete
      const bothCompleted = (checkInType === 'morning' ? true : morningCheckIn.completed) && 
                           (checkInType === 'evening' ? true : eveningCheckIn.completed);

      if (bothCompleted && !hasCheckedInToday) {
        // Update streak only when both check-ins are complete
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

        // Save the checked-in date for calendar display
        await saveCheckedInDate(today);

        setStreak(newStreak);
        setHasCheckedInToday(true);
        
        Alert.alert('Day Complete!', `Both check-ins completed! Your streak is now ${newStreak} ${newStreak === 1 ? 'day' : 'days'}! 🔥`);
      } else {
        Alert.alert('Success!', `${checkInType.charAt(0).toUpperCase() + checkInType.slice(1)} check-in completed! ${bothCompleted ? '' : `Don't forget your ${checkInType === 'morning' ? 'evening' : 'morning'} check-in.`}`);
      }

      setSelectedPhoto(null);
      setCheckingIn(false);
      
      // Get updated check-in data for Firestore
      const updatedMorning = checkInType === 'morning' ? checkInData : morningCheckIn;
      const updatedEvening = checkInType === 'evening' ? checkInData : eveningCheckIn;
      await saveStreakToFirestore(streak, updatedMorning, updatedEvening, streakPhotos);

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
    eveningCheckIn: CheckInData, 
    streakPhotos: StreakPhotos
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
        },
        streakPhotos: streakPhotos
      }, { merge: true });
    } catch (error) {
      console.error('Error saving streak to Firestore:', error);
    }
  };

  const renderCalendar = (): JSX.Element => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    // Add empty cells for days before month starts
    const startDay = monthStart.getDay();
    const emptyCells: null[] = Array(startDay).fill(null);
    
    const allCells: (Date | null)[] = [...emptyCells, ...days];
    
    return (
      <View>
        {/* Calendar Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color="#374151" />
          </TouchableOpacity>
          
          <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>
          
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-forward" size={24} color="#374151" />
          </TouchableOpacity>
        </View>
        
        {/* Days of week header */}
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <View key={day} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: '#6B7280' }}>{day}</Text>
            </View>
          ))}
        </View>
        
        {/* Calendar Grid */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {allCells.map((day, index) => {
            if (!day) {
              return <View key={`empty-${index}`} style={{ width: '14.28%', height: 40 }} />;
            }
            
            const dayString = format(day, 'yyyy-MM-dd');
            const isCheckedIn = checkedInDates.has(dayString);
            const isToday = isSameDay(day, new Date());
            
            return (
              <View key={index} style={{ width: '14.28%', height: 40, padding: 2 }}>
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: isCheckedIn ? '#22c55e' : (isToday ? '#e5e7eb' : 'transparent'),
                  borderRadius: 4,
                  borderWidth: isToday ? 1 : 0,
                  borderColor: '#5C6BC0'
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: isCheckedIn ? 'white' : '#374151',
                    fontWeight: isToday ? 'bold' : 'normal'
                  }}>
                    {day.getDate()}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
        
        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, backgroundColor: '#22c55e', borderRadius: 3, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Checked in</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, backgroundColor: '#e5e7eb', borderRadius: 3, marginRight: 6, borderWidth: 1, borderColor: '#5C6BC0' }} />
            <Text style={{ fontSize: 12, color: '#6B7280' }}>Today</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView style={{flex:1, backgroundColor: 'white' }} showsVerticalScrollIndicator={false}>
        {/* Settings Button */}
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

        {/* Main Content */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingTop: 20, marginTop: 80 }}>
          <Text style={{ fontSize: 60, fontWeight: 'bold', color: '#5C6BC0', marginBottom: 16 }}>{streak}</Text>
          <Text style={{ fontSize: 24, fontWeight: '600', color: '#374151', marginBottom: 8 }}>
            Day{streak !== 1 ? 's' : ''} Streak 🔥
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280', marginBottom: 8 }}>
            {isHardMode ? 'Hard Mode' : 'Easy Mode'}
          </Text>
          {streak > 0 && (
            <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 32 }}>
              Keep it up! You're doing great!
            </Text>
          )}

          {/* Hard Mode Check-in Type Selector */}
          {isHardMode && (
            <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: '#f3f4f6', borderRadius: 8, padding: 4 }}>
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
                  color: currentCheckInType === 'morning' ? 'white' : '#374151',
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
                  color: currentCheckInType === 'evening' ? 'white' : '#374151',
                  fontWeight: '600'
                }}>
                  Evening {eveningCheckIn.completed ? '✓' : ''}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Photo Upload Section */}
          <View style={{ width: '100%', marginTop: 16 }}>
            {!shouldShowPhotoUpload() && getCurrentPhoto() ? (
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
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
                  style={{ backgroundColor: '#ef4444', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, marginBottom: 8 }}
                >
                  <Text style={{ color: 'white', fontWeight: '600' }}>Remove Photo</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={pickImage}
                style={{
                  width: '100%',
                  backgroundColor: '#f3f4f6',
                  borderWidth: 2,
                  borderStyle: 'dashed',
                  borderColor: '#9ca3af',
                  borderRadius: 8,
                  padding: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 16,
                  opacity: shouldShowPhotoUpload() ? 1 : 0.5
                }}
                disabled={!shouldShowPhotoUpload()}
              >
                <Ionicons name="camera" size={40} color="#666" />
                <Text style={{ color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
                  {shouldShowPhotoUpload() 
                    ? `Tap to upload a photo\n(Required for ${isHardMode ? currentCheckInType : ''} check-in)`
                    : 'Already checked in'
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Check-in Button */}
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
              opacity: (canCheckIn() && !checkingIn && !isUploading) ? 1 : 0.5
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
        
        <View style={{ marginTop: 30, paddingHorizontal: 16, backgroundColor: 'white'}}>
          <UVLevelPanel />
        </View>

        {/* Settings Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showSettings}
          onRequestClose={() => setShowSettings(false)}
        >
          <View style={{ 
            flex: 1, 
            justifyContent: 'center', 
            alignItems: 'center', 
            backgroundColor: 'rgba(0,0,0,0.5)' 
          }}>
            <View style={{ 
              backgroundColor: 'white', 
              padding: 20, 
              borderRadius: 12, 
              width: '80%',
              alignItems: 'center' 
            }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>Settings</Text>
              
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                width: '100%', 
                marginBottom: 20 
              }}>
                <Text style={{ fontSize: 18 }}>Hard Mode</Text>
                <Switch
                  value={isHardMode}
                  onValueChange={(value) => saveSettings(value)}
                  trackColor={{ false: '#767577', true: '#5C6BC0' }}
                  thumbColor={isHardMode ? '#ffffff' : '#f4f3f4'}
                />
              </View>
              
              <Text style={{ 
                fontSize: 14, 
                color: '#6B7280', 
                textAlign: 'center', 
                marginBottom: 20 
              }}>
                {isHardMode 
                  ? 'Hard mode requires morning and evening check-ins with photos' 
                  : 'Easy mode requires one check-in per day with a photo'
                }
              </Text>
              
              <TouchableOpacity
                onPress={() => setShowSettings(false)}
                style={{
                  backgroundColor: '#5C6BC0',
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 8
                }}
              >
                <Text style={{ color: 'white', fontWeight: '600' }}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Calendar Modal */}
        <Modal
          animationType="slide"
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
              backgroundColor: 'white', 
              padding: 20, 
              borderRadius: 12, 
              width: '90%',
              maxHeight: '80%'
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold' }}>Streak Calendar</Text>
                <TouchableOpacity onPress={() => setShowCalendar(false)}>
                  <Ionicons name="close" size={24} color="#374151" />
                </TouchableOpacity>
              </View>
              
              <ScrollView showsVerticalScrollIndicator={false}>
                {renderCalendar()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
      
      <TouchableOpacity
        onPress={() => setShowCalendar(true)}
        style={{
          position: 'absolute',
          bottom: 50,
          right: 20,
          zIndex: 10,
          padding: 12,
          backgroundColor: '#5C6BC0',
          borderRadius: 50,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5
        }}
      >
        <Ionicons name="calendar" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default StreakScreen;