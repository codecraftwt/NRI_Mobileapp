import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  ThemeColors,
  ThemeMode,
  darkColors,
  lightColors,
} from '../theme/colors';

type ThemeContextValue = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
  isThemeLoading: boolean;
  isDark: boolean;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const ThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [isThemeLoading, setIsThemeLoading] = useState(true);

  // Load saved theme and language from AsyncStorage on startup
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Load theme
        const savedTheme = await AsyncStorage.getItem('theme_mode');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          setModeState(savedTheme);
        }

      } catch (e) {
        console.error('Failed to load settings from storage:', e);
      } finally {
        setIsThemeLoading(false);
      }
    };
    loadSettings();
  }, []);

  const colors = useMemo<ThemeColors>(
    () => (mode === 'dark' ? darkColors : lightColors),
    [mode],
  );

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem('theme_mode', newMode).catch(e =>
      console.error('Failed to save theme to storage:', e)
    );
  }, []);

  const toggleTheme = useCallback(() => {
    setModeState(prev => {
      const nextMode = prev === 'dark' ? 'light' : 'dark';
      AsyncStorage.setItem('theme_mode', nextMode).catch(e =>
        console.error('Failed to save theme to storage:', e)
      );
      return nextMode;
    });
  }, []);

  const value = useMemo(
    () => ({ mode, colors, toggleTheme, setMode, isThemeLoading, isDark: mode === 'dark' }),
    [mode, colors, toggleTheme, setMode, isThemeLoading],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
};
