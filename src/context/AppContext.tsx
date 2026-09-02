import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppState = 'loading' | 'logged_out' | 'admin' | 'customer';
export type ThemeMode = 'light' | 'dark' | 'system';

interface AppContextValue {
  appState: AppState;
  /** Call this to trigger a full stack switch (e.g. after login or logout) */
  setAppState: (state: AppState) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  isDark: boolean;
}

export const AppContext = createContext<AppContextValue>({
  appState: 'loading',
  setAppState: () => {},
  theme: 'light',
  setTheme: () => {},
  isDark: false,
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
    AsyncStorage.setItem('app_theme', newTheme).catch(() => {});
  };

  return (
    <AppContext.Provider value={{ appState, setAppState, theme, setTheme, isDark }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  return useContext(AppContext);
}
