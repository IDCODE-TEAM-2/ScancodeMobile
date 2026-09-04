import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { deleteToken } from '../api';

export type AppState = 'loading' | 'logged_out' | 'admin' | 'customer';
export type ThemeMode = 'light' | 'dark' | 'system';

interface AppContextValue {
  appState: AppState;
  /** Call this to trigger a full stack switch (e.g. after login or logout) */
  setAppState: (state: AppState) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
  clearSession: (targetState?: AppState) => Promise<void>;
}

export const AppContext = createContext<AppContextValue>({
  appState: 'loading',
  setAppState: () => { },
  theme: 'light',
  setTheme: () => { },
  isDark: false,
  clearSession: async () => { },
});

export function AppContextProvider({
  children,
  appState,
  setAppState,
}: {
  children: React.ReactNode;
  appState: AppState;
  setAppState: (state: AppState) => void;
}) {
  const [theme, setThemeState] = useState<ThemeMode>('light');
  const systemScheme = useRNColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  const isDark = theme === 'dark' || (theme === 'system' && systemScheme === 'dark');

  useEffect(() => {
    AsyncStorage.getItem('app_theme').then((savedTheme) => {
      if (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system') {
        setThemeState(savedTheme);
        setColorScheme(savedTheme);
      } else {
        setColorScheme('light');
      }
    });
  }, [setColorScheme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    setColorScheme(newTheme);
    AsyncStorage.setItem('app_theme', newTheme).catch(() => { });
  };

  // Completely resets user data keys from storage before changing application state stacks
  const clearSession = async (targetState: AppState = 'logged_out') => {
    try {
      await deleteToken();
      await AsyncStorage.multiRemove(['token', 'auth_token', 'user_roles', 'user_profile']);
    } catch (error) {
      console.error('Error clearing storage session keys:', error);
    } finally {
      setAppState(targetState);
    }
  };

  return (
    <AppContext.Provider value={{ appState, setAppState, theme, setTheme, isDark, clearSession }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
