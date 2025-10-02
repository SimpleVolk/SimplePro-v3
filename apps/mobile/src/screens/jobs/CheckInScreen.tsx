/**
 * Check-In Screen
 *
 * GPS-based job check-in with location verification
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import MapView, { Marker, Circle } from 'react-native-maps';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { checkInToJob } from '../../store/slices/jobsSlice';

export const CheckInScreen = ({ route, navigation }: any) => {
  const { jobId, jobLocation } = route.params;
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(true);
  const [distance, setDistance] = useState<number | null>(null);
  const dispatch = useAppDispatch();
  const { isOnline } = useAppSelector((state) => state.offline);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'SimplePro needs access to your location for check-in',
            buttonPositive: 'OK',
          }
        );

        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        } else {
          Alert.alert('Permission Denied', 'Location permission is required for check-in');
          navigation.goBack();
        }
      } catch (err) {
        console.warn(err);
      }
    } else {
      getCurrentLocation();
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);

    Geolocation.getCurrentPosition(
      (position) => {
        const currentLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setLocation(currentLocation);

        // Calculate distance from job location
        if (jobLocation) {
          const dist = calculateDistance(
            currentLocation.latitude,
            currentLocation.longitude,
            jobLocation.latitude,
            jobLocation.longitude
          );
          setDistance(dist);
        }

        setGettingLocation(false);
      },
      (error) => {
        Alert.alert('GPS Error', error.message);
        setGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const handleCheckIn = async () => {
    if (!location) {
      Alert.alert('Error', 'Unable to get current location');
      return;
    }

    // Verify location is within acceptable range (500m)
    if (distance !== null && distance > 500) {
      Alert.alert(
        'Location Verification',
        `You are ${Math.round(distance)}m from the job location. Are you sure you want to check in?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Check In Anyway', onPress: performCheckIn },
        ]
      );
    } else {
      performCheckIn();
    }
  };

  const performCheckIn = async () => {
    if (!location) return;

    setLoading(true);

    try {
      await dispatch(
        checkInToJob({
          jobId,
          location,
          timestamp: new Date().toISOString(),
        })
      ).unwrap();

      Alert.alert(
        'Success',
        isOnline
          ? 'Checked in successfully!'
          : 'Checked in - will sync when online',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error: any) {
      if (error.message?.includes('queued')) {
        Alert.alert('Offline', 'Check-in queued for sync when online', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
      } else {
        Alert.alert('Error', error.message || 'Failed to check in');
      }
    } finally {
      setLoading(false);
    }
  };

  if (gettingLocation) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Getting your location...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            Offline - Check-in will sync when online
          </Text>
        </View>
      )}

      {location && (
        <>
          <MapView
            style={styles.map}
            region={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {/* Current location marker */}
            <Marker
              coordinate={location}
              title="Your Location"
              pinColor="blue"
            />

            {/* Job location marker and geofence */}
            {jobLocation && (
              <>
                <Marker
                  coordinate={jobLocation}
                  title="Job Location"
                  pinColor="red"
                />
                <Circle
                  center={jobLocation}
                  radius={500}
                  strokeColor="rgba(59, 130, 246, 0.5)"
                  fillColor="rgba(59, 130, 246, 0.1)"
                />
              </>
            )}
          </MapView>

          <View style={styles.infoContainer}>
            <View style={styles.infoCard}>
              <Text style={styles.infoLabel}>GPS Coordinates</Text>
              <Text style={styles.infoValue}>
                {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
              </Text>
            </View>

            {distance !== null && (
              <View style={styles.infoCard}>
                <Text style={styles.infoLabel}>Distance from Job Site</Text>
                <Text
                  style={[
                    styles.infoValue,
                    distance > 500 && styles.warningText,
                  ]}
                >
                  {distance < 1000
                    ? `${Math.round(distance)}m`
                    : `${(distance / 1000).toFixed(2)}km`}
                </Text>
                {distance > 500 && (
                  <Text style={styles.warningSubtext}>
                    You may be too far from the job location
                  </Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={[styles.checkInButton, loading && styles.buttonDisabled]}
              onPress={handleCheckIn}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Check In to Job</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.refreshButton}
              onPress={getCurrentLocation}
            >
              <Text style={styles.refreshButtonText}>Refresh Location</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  loadingText: {
    color: '#999',
    marginTop: 12,
    fontSize: 16,
  },
  offlineBanner: {
    backgroundColor: '#f59e0b',
    padding: 8,
    alignItems: 'center',
    zIndex: 1,
  },
  offlineText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  map: {
    flex: 1,
  },
  infoContainer: {
    backgroundColor: '#2a2a2a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 32,
  },
  infoCard: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e5e5e5',
  },
  warningText: {
    color: '#f59e0b',
  },
  warningSubtext: {
    fontSize: 12,
    color: '#f59e0b',
    marginTop: 4,
  },
  checkInButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#4a5568',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  refreshButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  refreshButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
});
