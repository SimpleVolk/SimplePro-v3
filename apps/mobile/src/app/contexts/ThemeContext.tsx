import React, { createContext, useContext } from 'react';
import { darkTheme, spacing, borderRadius, fontSize, fontWeight } from '../../theme/colors';

interface ThemeContextType {
  colors: typeof darkTheme;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const theme = {
    colors: darkTheme,
    spacing,
    borderRadius,
    fontSize,
    fontWeight,
  };

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};