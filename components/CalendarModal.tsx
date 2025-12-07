// CalendarModal.tsx
import Ionicons from "@expo/vector-icons/Ionicons";
import { eachDayOfInterval, endOfMonth, format, isSameDay, startOfMonth } from 'date-fns';
import React from 'react';
import { Alert, Dimensions, Modal, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
interface CheckinDetail {
  morningDone: boolean;
  eveningDone: boolean;
  completedHardMode: boolean;
}

interface CalendarModalProps {
  visible: boolean;
  onClose: () => void;
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  checkedInDates: Set<string>;
  checkinDetails: Record<string, CheckinDetail>;
  onDatePress: (date: Date) => void;
  darkMode: boolean;
  getPhotoForDate: (date: Date, type: 'morning' | 'evening' | 'single') => string | undefined;
}

const { width, height } = Dimensions.get('window');

const CalendarModal: React.FC<CalendarModalProps> = ({
  visible,
  onClose,
  currentMonth,
  onMonthChange,
  checkedInDates,
  checkinDetails,
  onDatePress,
  darkMode,
  getPhotoForDate
}) => {
  const bgColor = darkMode ? '#1a1f3a' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const cardBg = darkMode ? '#2d3748' : '#f3f4f6';

  const handleDatePress = (date: Date) => {

    const morningPhoto = getPhotoForDate(date, 'morning');
    const eveningPhoto = getPhotoForDate(date, 'evening');
    const singlePhoto = getPhotoForDate(date, 'single'); // <-- EASY MODE photo

    // If NO photos in any mode → warn
    if (!morningPhoto && !eveningPhoto && !singlePhoto) {
      Alert.alert(
        "No photos on this device",
        "This check-in was recorded on another device.\nPhotos are stored locally for privacy."
      );
      return;
    }

    onDatePress(date);

  };

  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const emptyCells: null[] = Array(startDay).fill(null);
    const allCells: (Date | null)[] = [...emptyCells, ...days];
    const hasAnyPhoto = (date: Date): boolean => {
      const morning = getPhotoForDate(date, "morning");
      const evening = getPhotoForDate(date, "evening");
      const single = getPhotoForDate(date, "single");
      return !!(morning || evening || single);
    };
    return (
      <View style={{ flex: 1, backgroundColor: bgColor }}>
        {/* Month navigation */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-back" size={24} color={textColor} />
          </TouchableOpacity>

          <Text style={{ fontSize: 18, fontWeight: 'bold', color: textColor }}>
            {format(currentMonth, 'MMMM yyyy')}
          </Text>

          <TouchableOpacity
            onPress={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={{ padding: 8 }}
          >
            <Ionicons name="chevron-forward" size={24} color={textColor} />
          </TouchableOpacity>
        </View>

        {/* Weekdays */}
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <View key={day} style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: secondaryTextColor }}>{day}</Text>
            </View>
          ))}
        </View>

        {/* Days */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {allCells.map((day, index) => {
            if (!day) return <View key={`empty-${index}`} style={{ width: '14.28%', height: 40 }} />;

            const dayString = format(day, 'yyyy-MM-dd');
            const detail = checkinDetails[dayString];
            const morningDone = detail?.morningDone ?? false;
            const eveningDone = detail?.eveningDone ?? false;
            const completedHardMode = detail?.completedHardMode ?? false;
            const isToday = isSameDay(day, new Date());

            return (
              <TouchableOpacity
                key={index}
                style={{ width: '14.28%', height: 40, padding: 2 }}
                onPress={() => handleDatePress(day)}
                disabled={!hasAnyPhoto(day)}
              >
                <View style={{
                  flex: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: completedHardMode ? '#22c55e' : (isToday ? cardBg : 'transparent'),
                  borderRadius: 4,
                  borderWidth: isToday ? 1 : 0,
                  borderColor: '#5C6BC0',
                  shadowColor: completedHardMode ? '#22c55e' : 'transparent',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                }}>
                  <Text style={{
                    fontSize: 14,
                    color: completedHardMode ? 'white' : textColor,
                    fontWeight: isToday ? 'bold' : 'normal'
                  }}>
                    {day.getDate()}
                  </Text>
                  {/* Morning/Evening dots */}
                  <View style={{ flexDirection: 'row', marginTop: 2 }}>
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: morningDone? '#fff' : '#999', marginHorizontal: 1
                    }} />
                    <View style={{
                      width: 6, height: 6, borderRadius: 3,
                      backgroundColor: eveningDone ? '#fff' : '#999', marginHorizontal: 1
                    }} />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Legend */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, backgroundColor: '#22c55e', borderRadius: 3, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: secondaryTextColor }}>Checked In (Tap to view)</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: 16, height: 16, backgroundColor: '#999', borderRadius: 3, marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: secondaryTextColor }}>Missed</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <StatusBar translucent backgroundColor="transparent" />
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          width: width,
          height: height,
        }}>
          <View style={{
            backgroundColor: bgColor,
            padding: 20,
            borderRadius: 12,
            width: '90%',
            maxHeight: '80%',
          }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: 'bold', color: textColor }}>Streak Calendar</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={textColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {renderCalendar()}
            </ScrollView>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

export default CalendarModal;
