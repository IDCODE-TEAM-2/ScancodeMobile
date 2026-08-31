import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';

interface HeaderBackButtonProps {
  canGoBack?: boolean;
  // All native-stack headers in this app currently share one white headerStyle (see
  // App.tsx's sharedScreenOptions) — black gives full contrast there. If a screen ever sets
  // a dark headerStyle, pass dark to flip this to white instead of guessing from theme.
  dark?: boolean;
}

// React Navigation's own default back button renders as a zero-size image on web in this
// project's dependency versions (confirmed via DOM inspection — the icon element collapses
// to 0x0 and never paints, regardless of color), making it invisible rather than just
// low-contrast. Used as headerLeft everywhere instead, so back navigation actually works.
export default function HeaderBackButton({ canGoBack = true, dark = false }: HeaderBackButtonProps) {
  const navigation = useNavigation();
  if (!canGoBack) return null;

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      className="pr-3 py-1"
      accessibilityLabel="Go back"
    >
      <ArrowLeft size={22} color={dark ? '#FFFFFF' : '#111827'} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}
