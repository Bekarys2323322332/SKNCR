import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';




export default function UVIndexPanel() {
  const [uvData, setUvData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 👇 start with no location
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
    name: string;
  } | null>(null);


  useEffect(() => {
    getUserLocation(); // 👈 fetch device location first
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

  const changeLocation = (lat: number, lon: number, name: string) => {
    setLocation({ latitude: lat, longitude: lon, name });
    fetchUVData(lat, lon);
  };

  const getUVLevel = (uvIndex: number) => {
    if (uvIndex < 3)
      return { level: 'Low', color: '#22c55e', bgColor: '#f0fdf4' };
    if (uvIndex < 6)
      return { level: 'Moderate', color: '#eab308', bgColor: '#fefce8' };
    if (uvIndex < 8)
      return { level: 'High', color: '#f97316', bgColor: '#fff7ed' };
    if (uvIndex < 11)
      return { level: 'Very High', color: '#ef4444', bgColor: '#fef2f2' };
    return { level: 'Extreme', color: '#9333ea', bgColor: '#faf5ff' };
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading UV data...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => location ? fetchUVData(location.latitude, location.longitude) : getUserLocation()}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  

  if (!location) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }
  const uvIndex = uvData?.current?.uv_index || 0;
  const uvLevel = getUVLevel(uvIndex);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => fetchUVData(location.latitude, location.longitude)}
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>UV Index</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={() => fetchUVData(location.latitude, location.longitude)}
        >
          <Text style={styles.refreshIcon}>↻</Text>
        </TouchableOpacity>
      </View>

      {/* UV Index Display */}
      <View style={[styles.uvDisplay, { backgroundColor: uvLevel.bgColor }]}>
        <Text style={styles.uvNumber}>{uvIndex.toFixed(1)}</Text>
        <View style={[styles.uvBadge, { backgroundColor: uvLevel.color }]}>
          <Text style={styles.uvBadgeText}>{uvLevel.level}</Text>
        </View>
      </View>

     

      {/* Protection Advice */}
      <View style={styles.adviceContainer}>
        <Text style={styles.adviceTitle}>Protection Advice</Text>
        <Text style={styles.adviceText}>{getProtectionAdvice(uvIndex)}</Text>
      </View>

      

      {/* Location Info */}
      <View style={styles.locationInfo}>
        <Text style={styles.locationName}>{location.name}</Text>
        <Text style={styles.timestamp}>
          Last updated: {new Date().toLocaleTimeString()}
        </Text>
      </View>

  
    </ScrollView>
  );
}





const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  contentContainer: {
    padding: 16,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    color: '#6b7280',
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
  },
  refreshIcon: {
    fontSize: 24,
    color: '#4b5563',
  },
  uvDisplay: {
    borderRadius: 12,
    padding: 24,
    marginBottom: 16,
    alignItems: 'center',
  },
  uvNumber: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  uvBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  uvBadgeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  scaleContainer: {
    marginBottom: 24,
  },
  scaleBar: {
    flexDirection: 'row',
    height: 16,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
  },
  scaleSegment: {
    flex: 1,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  adviceContainer: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  adviceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e3a8a',
    marginBottom: 8,
  },
  adviceText: {
    fontSize: 14,
    color: '#1e40af',
  },
  locationSelector: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  locationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  locationButton: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  locationButtonText: {
    fontSize: 14,
    color: '#374151',
  },
  locationInfo: {
    alignItems: 'center',
    marginBottom: 24,
    paddingVertical: 8,
  },
  locationName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  locationCoords: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  customLocationContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});