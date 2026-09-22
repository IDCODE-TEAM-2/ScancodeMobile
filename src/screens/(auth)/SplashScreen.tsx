import React, { useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { getToken } from '../../api';
import type { NavigationProp } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { resolveAppState } from '../../utils/resolveAppState';

interface Props {
  navigation: NavigationProp<'Splash'>;
}

export default function SplashScreen(_props: Props) {
  const { setAppState } = useAppContext();
  useEffect(() => {
    let cancelled = false;
    async function checkAuth() {
      try {
        const token = await getToken();
        if (cancelled) return;
        if (token) {
          // Use the same role-resolution logic as App.tsx: check storefront ownership
          // rather than hard-coding 'admin'. This prevents a customer account (which has
          // a token but no storefronts) from being routed to the merchant Dashboard.
          const state = await resolveAppState();
          if (!cancelled) setAppState(state);
        } else {
          if (!cancelled) setAppState('logged_out');
        }
      } catch {
        if (!cancelled) setAppState('logged_out');
      }
    }

    checkAuth();
    return () => { cancelled = true; };
  }, [setAppState]);

  return (
    <View className="flex-1 bg-white dark:bg-[#09090B] items-center justify-center">
      <Text className="text-[32px] font-bold text-primary tracking-wide">ScanCode</Text>
      <ActivityIndicator size="large" color="#059669" className="mt-6" />
    </View>
  );
}
