import React from 'react';
import { TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'lucide-react-native';
import { useAppContext } from '../context/AppContext';

interface HeaderBackButtonProps {
  canGoBack?: boolean;
  dark?: boolean;
}

export default function HeaderBackButton({ canGoBack = true, dark }: HeaderBackButtonProps) {
  const navigation = useNavigation();
  const { isDark } = useAppContext();
  if (!canGoBack) return null;

  const shouldBeDark = dark !== undefined ? dark : isDark;

  return (
    <TouchableOpacity
      onPress={() => navigation.goBack()}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className="w-10 h-10 rounded-full items-center justify-center -ml-1.5"
      accessibilityLabel="Go back"
    >
      <ArrowLeft size={22} color={shouldBeDark ? '#F9FAFB' : '#111827'} strokeWidth={2.2} />
    </TouchableOpacity>
  );
}
