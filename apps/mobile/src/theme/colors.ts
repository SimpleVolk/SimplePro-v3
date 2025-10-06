export const darkTheme = {
  // Primary brand colors
  primary: '#0f172a',         // Dark blue-gray
  primaryDark: '#020617',     // Darker blue-gray
  secondary: '#3b82f6',       // Blue
  accent: '#10b981',          // Green for success states

  // Background colors
  background: '#1e293b',      // Main background
  surface: '#334155',         // Card/surface background
  surfaceLight: '#475569',    // Lighter surface

  // Text colors
  textPrimary: '#f8fafc',     // Primary white text
  textSecondary: '#cbd5e1',   // Secondary gray text
  textMuted: '#94a3b8',       // Muted text

  // Status colors
  success: '#10b981',         // Green
  warning: '#f59e0b',         // Orange
  error: '#ef4444',           // Red
  info: '#3b82f6',            // Blue

  // Border and divider colors
  border: '#475569',
  divider: '#374151',

  // Interactive states
  pressable: '#1e40af',       // Pressed state
  disabled: '#6b7280',        // Disabled state

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};