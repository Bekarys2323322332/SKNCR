import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { loadDarkMode } from '../utils/storage';

export default function UVIndexPanel() {
  const [uvData, setUvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);

  // 👇 start with no location
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    getUserLocation(); // 👈 fetch device location first
    loadDarkMode().then(setDarkMode);
  }, []);

  // Refresh dark mode periodically to sync with profile changes
  useEffect(() => {
    const interval = setInterval(() => {
      loadDarkMode().then(setDarkMode);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const getUserLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permission to access location was denied');
        // fallback to London
        setLocation({ latitude: 51.5074, longitude: -0.1278, name: 'London, UK' });
        return;
      }

      let userLoc = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = userLoc.coords;
      setLocation({ latitude, longitude, name: 'Your Location' });
      fetchUVData(latitude, longitude);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const fetchUVData = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=uv_index&timezone=auto`
      );
      if (!response.ok) throw new Error('Failed to fetch UV data');
      const data = await response.json();
      setUvData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };


  const getUVLevel = (uvIndex: number, isDark: boolean) => {
    if (uvIndex < 3)
      return { level: 'Low', color: '#22c55e', bgColor: isDark ? '#1a3a1f' : '#f0fdf4' };
    if (uvIndex < 6)
      return { level: 'Moderate', color: '#eab308', bgColor: isDark ? '#3a341a' : '#fefce8' };
    if (uvIndex < 8)
      return { level: 'High', color: '#f97316', bgColor: isDark ? '#3a251a' : '#fff7ed' };
    if (uvIndex < 11)
      return { level: 'Very High', color: '#ef4444', bgColor: isDark ? '#3a1a1a' : '#fef2f2' };
    return { level: 'Extreme', color: '#9333ea', bgColor: isDark ? '#2a1a3a' : '#faf5ff' };
  };

  const getProtectionAdvice = (uvIndex: number) => {
    if (uvIndex < 3) return 'No protection needed. Safe to be outside.';
    if (uvIndex < 6)
      return 'Wear sunscreen and sunglasses during midday hours.';
    if (uvIndex < 8)
      return 'Wear sunscreen, hat, and sunglasses. Seek shade during midday.';
    if (uvIndex < 11)
      return 'Extra protection needed. Minimize sun exposure 10am-4pm.';
    return 'Avoid sun exposure. Stay in shade. Full protection essential.';
  };

  // Dark mode colors
  const bgColor = darkMode ? '#1a1f3a' : 'white';
  const textColor = darkMode ? '#ffffff' : '#374151';
  const secondaryTextColor = darkMode ? '#cbd5e0' : '#6B7280';
  const cardBg = darkMode ? '#2d3748' : '#f3f4f6';
  const borderColor = darkMode ? '#4a5568' : '#e5e7eb';
  const primaryColor = '#5C6BC0';

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor, padding: 32 }}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={{ marginTop: 16, color: secondaryTextColor, fontSize: 16 }}>Loading UV data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor, padding: 24 }}>
        <Text style={{ color: '#ef4444', fontSize: 16, marginBottom: 16, textAlign: 'center' }}>Error: {error}</Text>
        <TouchableOpacity
          style={{
            backgroundColor: primaryColor,
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 8,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 5,
          }}
          onPress={() => location ? fetchUVData(location.latitude, location.longitude) : getUserLocation()}
        >
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!location) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: bgColor, padding: 32 }}>
        <ActivityIndicator size="large" color={primaryColor} />
        <Text style={{ marginTop: 16, color: secondaryTextColor, fontSize: 16 }}>Getting your location...</Text>
      </View>
    );
  }
  const uvIndex = uvData?.current?.uv_index || 0;
  const uvLevel = getUVLevel(uvIndex, darkMode);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bgColor }}
      contentContainerStyle={{ padding: 16, maxWidth: 500, alignSelf: 'center', width: '100%' }}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => fetchUVData(location.latitude, location.longitude)}
          tintColor={primaryColor}
        />
      }
    >
      {/* Header */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: textColor }}>UV Index</Text>
        <TouchableOpacity
          style={{
            padding: 8,
            borderRadius: 20,
            backgroundColor: cardBg,
            shadowColor: primaryColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 4,
            elevation: 3,
          }}
          onPress={() => fetchUVData(location.latitude, location.longitude)}
        >
          <Text style={{ fontSize: 24, color: textColor }}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* UV Index Display */}
      <View style={{
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        alignItems: 'center',
        backgroundColor: uvLevel.bgColor,
        shadowColor: uvLevel.color,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 5,
      }}>
        <Text style={{ fontSize: 64, fontWeight: 'bold', color: darkMode ? textColor : '#1f2937', marginBottom: 8 }}>{uvIndex.toFixed(1)}</Text>
        <View style={{
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
          backgroundColor: uvLevel.color,
          shadowColor: uvLevel.color,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.5,
          shadowRadius: 6,
          elevation: 4,
        }}>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{uvLevel.level}</Text>
        </View>
      </View>

      {/* Protection Advice */}
      <View style={{
        backgroundColor: cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: primaryColor,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      }}>
        <Text style={{ fontSize: 16, fontWeight: '600', color: textColor, marginBottom: 8 }}>Protection Advice</Text>
        <Text style={{ fontSize: 14, color: secondaryTextColor, lineHeight: 20 }}>{getProtectionAdvice(uvIndex)}</Text>
      </View>

      {/* Location Info */}
      <View style={{ alignItems: 'center', marginBottom: 24, paddingVertical: 8 }}>
        <Text style={{ fontSize: 16, fontWeight: '500', color: textColor }}>{location.name}</Text>
        <Text style={{ fontSize: 12, color: secondaryTextColor, marginTop: 4 }}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>
    </ScrollView>
  );
}
