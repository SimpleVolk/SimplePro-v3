import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both username and password');
      return;
    }

    setIsLoading(true);
    try {
      const success = await login(username.trim(), password);
      if (!success) {
        Alert.alert('Login Failed', 'Invalid username or password');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    keyboardView: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: spacing.xxl,
    },
    logo: {
      width: 120,
      height: 120,
      marginBottom: spacing.lg,
    },
    title: {
      fontSize: fontSize['3xl'],
      fontWeight: fontWeight.bold,
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.md,
    },
    subtitle: {
      fontSize: fontSize.lg,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: spacing.xxl,
    },
    inputContainer: {
      marginBottom: spacing.lg,
    },
    label: {
      fontSize: fontSize.base,
      fontWeight: fontWeight.medium,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontSize: fontSize.base,
      color: colors.textPrimary,
    },
    inputFocused: {
      borderColor: colors.secondary,
    },
    button: {
      backgroundColor: colors.secondary,
      paddingVertical: spacing.md,
      borderRadius: borderRadius.md,
      alignItems: 'center',
      marginTop: spacing.lg,
    },
    buttonDisabled: {
      backgroundColor: colors.disabled,
    },
    buttonText: {
      fontSize: fontSize.lg,
      fontWeight: fontWeight.semibold,
      color: colors.textPrimary,
    },
    versionText: {
      position: 'absolute',
      bottom: spacing.lg,
      alignSelf: 'center',
      fontSize: fontSize.sm,
      color: colors.textMuted,
    },
  });

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.logoContainer}>
          {/* Placeholder for company logo */}
          <View
            style={[
              styles.logo,
              {
                backgroundColor: colors.surface,
                borderRadius: borderRadius.lg,
                justifyContent: 'center',
                alignItems: 'center',
              },
            ]}
          >
            <Text style={{ color: colors.textSecondary, fontSize: fontSize.xl }}>
              SP
            </Text>
          </View>
          <Text style={styles.title}>SimplePro</Text>
          <Text style={styles.subtitle}>Crew Mobile App</Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Username</Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Enter your password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            editable={!isLoading}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Text style={styles.versionText}>Version 1.0.0</Text>
    </View>
  );
};

export default LoginScreen;