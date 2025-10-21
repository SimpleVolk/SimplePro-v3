/**
 * Profile Screen
 *
 * View and edit user profile with offline support
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { updateProfile, fetchProfile, logout } from '../../store/slices/authSlice';
import { queueAction } from '../../store/slices/offlineSlice';
import { styles } from './ProfileScreen.styles';

interface EditableProfile {
  phoneNumber: string;
  email: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notificationPreferences: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
}

export const ProfileScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { user, loading } = useAppSelector((state) => state.auth);
  const { isOnline } = useAppSelector((state) => state.offline);

  const [isEditing, setIsEditing] = useState(false);
  const [editedProfile, setEditedProfile] = useState<EditableProfile>({
    phoneNumber: '',
    email: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    notificationPreferences: {
      push: true,
      sms: true,
      email: true,
    },
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (user) {
      setEditedProfile({
        phoneNumber: user.phoneNumber || '',
        email: user.email || '',
        emergencyContactName: (user as any).emergencyContact?.name || '',
        emergencyContactPhone: (user as any).emergencyContact?.phone || '',
        notificationPreferences: (user as any).notificationPreferences || {
          push: true,
          sms: true,
          email: true,
        },
      });
    }
  }, [user]);

  // Fixed: Memory leak - Clear success message timeout on unmount
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (successMessage) {
      timeoutId = setTimeout(() => setSuccessMessage(''), 3000);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [successMessage]);

  const loadProfile = async () => {
    try {
      await dispatch(fetchProfile()).unwrap();
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setSuccessMessage('');
    setErrorMessage('');
    // Reset to original values
    if (user) {
      setEditedProfile({
        phoneNumber: user.phoneNumber || '',
        email: user.email || '',
        emergencyContactName: (user as any).emergencyContact?.name || '',
        emergencyContactPhone: (user as any).emergencyContact?.phone || '',
        notificationPreferences: (user as any).notificationPreferences || {
          push: true,
          sms: true,
          email: true,
        },
      });
    }
  };

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    return phone.length >= 10 && phoneRegex.test(phone);
  };

  const handleSave = async () => {
    setSuccessMessage('');
    setErrorMessage('');

    // Validation
    if (!editedProfile.email || !validateEmail(editedProfile.email)) {
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (editedProfile.phoneNumber && !validatePhone(editedProfile.phoneNumber)) {
      setErrorMessage('Please enter a valid phone number');
      return;
    }

    if (
      editedProfile.emergencyContactPhone &&
      !validatePhone(editedProfile.emergencyContactPhone)
    ) {
      setErrorMessage('Please enter a valid emergency contact phone number');
      return;
    }

    setIsSaving(true);

    try {
      if (!isOnline) {
        // Queue action for offline sync
        dispatch(
          queueAction(
            updateProfile({
              phoneNumber: editedProfile.phoneNumber,
              email: editedProfile.email,
              emergencyContact: {
                name: editedProfile.emergencyContactName,
                phone: editedProfile.emergencyContactPhone,
              },
              notificationPreferences: editedProfile.notificationPreferences,
            }),
          ),
        );
        setSuccessMessage('Changes saved. Will sync when online.');
        setIsEditing(false);
      } else {
        await dispatch(
          updateProfile({
            phoneNumber: editedProfile.phoneNumber,
            email: editedProfile.email,
            emergencyContact: {
              name: editedProfile.emergencyContactName,
              phone: editedProfile.emergencyContactPhone,
            },
            notificationPreferences: editedProfile.notificationPreferences,
          }),
        ).unwrap();
        setSuccessMessage('Profile updated successfully!');
        setIsEditing(false);
      }
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = () => {
    if (!isOnline) {
      Alert.alert(
        'Offline Mode',
        'You must be online to change your password.',
        [{ text: 'OK' }],
      );
      return;
    }
    navigation.navigate('ChangePassword');
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            dispatch(logout());
          },
        },
      ],
      { cancelable: true },
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getRoleDisplay = (role: string) => {
    return role
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (loading && !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Failed to load profile</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!isOnline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>Offline Mode</Text>
        </View>
      )}

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Success/Error Messages */}
        {successMessage ? (
          <View style={styles.successBanner}>
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.fullName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .toUpperCase()
                  .slice(0, 2)}
              </Text>
            </View>
          </View>
          <Text style={styles.userName}>{user.fullName}</Text>
          <Text style={styles.userRole}>{getRoleDisplay(user.role)}</Text>
        </View>

        {/* Read-Only Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Information</Text>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Employee ID</Text>
            <Text style={styles.infoValue}>{user.employeeId || 'N/A'}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Full Name</Text>
            <Text style={styles.infoValue}>{user.fullName}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{getRoleDisplay(user.role)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Department</Text>
            <Text style={styles.infoValue}>
              {(user as any).department || 'Operations'}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Employment Date</Text>
            <Text style={styles.infoValue}>
              {(user as any).employmentDate
                ? formatDate((user as any).employmentDate)
                : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Performance Stats Section */}
        {(user as any).performanceStats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance</Text>

            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {(user as any).performanceStats.jobsCompleted || 0}
                </Text>
                <Text style={styles.statLabel}>Jobs Completed</Text>
              </View>

              <View style={styles.statCard}>
                <Text style={styles.statValue}>
                  {(user as any).performanceStats.averageRating?.toFixed(1) ||
                    'N/A'}
                </Text>
                <Text style={styles.statLabel}>Average Rating</Text>
              </View>
            </View>
          </View>
        )}

        {/* Editable Contact Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact Information</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email Address</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.email}
                onChangeText={(text) =>
                  setEditedProfile({ ...editedProfile, email: text })
                }
                placeholder="email@example.com"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.fieldValue}>{editedProfile.email || 'Not set'}</Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Phone Number</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.phoneNumber}
                onChangeText={(text) =>
                  setEditedProfile({ ...editedProfile, phoneNumber: text })
                }
                placeholder="+1 234 567 8900"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {editedProfile.phoneNumber || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {/* Emergency Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contact Name</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.emergencyContactName}
                onChangeText={(text) =>
                  setEditedProfile({
                    ...editedProfile,
                    emergencyContactName: text,
                  })
                }
                placeholder="John Doe"
                placeholderTextColor="#666"
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {editedProfile.emergencyContactName || 'Not set'}
              </Text>
            )}
          </View>

          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Contact Phone</Text>
            {isEditing ? (
              <TextInput
                style={styles.input}
                value={editedProfile.emergencyContactPhone}
                onChangeText={(text) =>
                  setEditedProfile({
                    ...editedProfile,
                    emergencyContactPhone: text,
                  })
                }
                placeholder="+1 234 567 8900"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                editable={!isSaving}
              />
            ) : (
              <Text style={styles.fieldValue}>
                {editedProfile.emergencyContactPhone || 'Not set'}
              </Text>
            )}
          </View>
        </View>

        {/* Notification Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Preferences</Text>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Push Notifications</Text>
            <Switch
              value={editedProfile.notificationPreferences.push}
              onValueChange={(value) =>
                setEditedProfile({
                  ...editedProfile,
                  notificationPreferences: {
                    ...editedProfile.notificationPreferences,
                    push: value,
                  },
                })
              }
              disabled={!isEditing || isSaving}
              trackColor={{ false: '#3a3a3a', true: '#3b82f6' }}
              thumbColor={
                editedProfile.notificationPreferences.push ? '#fff' : '#ccc'
              }
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>SMS Notifications</Text>
            <Switch
              value={editedProfile.notificationPreferences.sms}
              onValueChange={(value) =>
                setEditedProfile({
                  ...editedProfile,
                  notificationPreferences: {
                    ...editedProfile.notificationPreferences,
                    sms: value,
                  },
                })
              }
              disabled={!isEditing || isSaving}
              trackColor={{ false: '#3a3a3a', true: '#3b82f6' }}
              thumbColor={
                editedProfile.notificationPreferences.sms ? '#fff' : '#ccc'
              }
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Email Notifications</Text>
            <Switch
              value={editedProfile.notificationPreferences.email}
              onValueChange={(value) =>
                setEditedProfile({
                  ...editedProfile,
                  notificationPreferences: {
                    ...editedProfile.notificationPreferences,
                    email: value,
                  },
                })
              }
              disabled={!isEditing || isSaving}
              trackColor={{ false: '#3a3a3a', true: '#3b82f6' }}
              thumbColor={
                editedProfile.notificationPreferences.email ? '#fff' : '#ccc'
              }
            />
          </View>
        </View>

        {/* Action Buttons Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          {!isEditing ? (
            <>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleEdit}
              >
                <Text style={styles.primaryButtonText}>Edit Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleChangePassword}
              >
                <Text style={styles.secondaryButtonText}>Change Password</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.dangerButton}
                onPress={handleLogout}
              >
                <Text style={styles.dangerButtonText}>Logout</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.secondaryButton, isSaving && styles.buttonDisabled]}
                onPress={handleCancel}
                disabled={isSaving}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Bottom Padding */}
        <View style={styles.bottomPadding} />
      </ScrollView>
    </View>
  );
};
