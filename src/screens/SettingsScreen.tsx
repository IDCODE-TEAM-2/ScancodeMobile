import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { User, LogOut, Trash2, ShieldAlert, FileText, Lock, Sun, Moon, Smartphone, Check, LogIn } from 'lucide-react-native';
import { getMe, getToken, deleteToken, deleteAccount, type MeResponse } from '../api';
import type { NavigationProp } from '../types';
import { useAppContext, type ThemeMode } from '../context/AppContext';
import { confirmAction } from '../utils/alerts';
import { cn } from '../utils/cn';

interface Props {
  navigation: NavigationProp<'Settings'>;
}

export default function SettingsScreen({ navigation }: Props) {
  const { setAppState, theme, setTheme, isDark } = useAppContext();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function checkSession() {
      try {
        const token = await getToken();
        if (!token) {
          setIsGuest(true);
          setLoading(false);
          return;
        }
        const data = await getMe();
        setMe(data);
      } catch {
        // Not fatal — the rest of the screen still works without the profile summary.
      } finally {
        setLoading(false);
      }
    }
    checkSession();
  }, []);

  const handleSignOut = () => {
    if (isGuest) {
      setAppState('logged_out');
      return;
    }
    confirmAction(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        await deleteToken();
        setAppState('logged_out');
      },
      { confirmText: 'Sign Out', destructive: true }
    );
  };

  const handleDeleteAccount = () => {
    confirmAction(
      'Delete Your Account',
      'This permanently deletes your account and all associated data — storefronts, orders, and history. This cannot be undone.',
      () => {
        confirmAction(
          'Are you absolutely sure?',
          'Your account cannot be recovered after this.',
          async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              setAppState('logged_out');
            } catch (err: unknown) {
              setDeleting(false);
              Alert.alert(
                "Couldn't Delete Account",
                err instanceof Error ? err.message : 'Please try again, or contact support.'
              );
            }
          },
          { confirmText: 'Delete My Account', destructive: true }
        );
      },
      { confirmText: 'Continue', destructive: true }
    );
  };

  const themeOptions: { mode: ThemeMode; label: string; icon: typeof Sun; description: string }[] = [
    { mode: 'light', label: 'Light', icon: Sun, description: 'Clean white aesthetic' },
    { mode: 'dark', label: 'Dark', icon: Moon, description: 'High-contrast OLED dark theme' },
    { mode: 'system', label: 'System', icon: Smartphone, description: 'Match device system theme' },
  ];

  if (deleting) {
    return (
      <View className="flex-1 bg-gray-50 dark:bg-[#09090B] items-center justify-center p-6">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-sm text-gray-500 dark:text-zinc-400 mt-3">Deleting your account…</Text>
      </View>
    );
  }

  const iconColor = isDark ? '#D1D5DB' : '#374151';

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-[#09090B]" contentContainerClassName="p-5 pb-12">
      {/* Profile Card */}
      <View className="bg-white dark:bg-[#18181B] rounded-2xl p-5 mb-5 items-center border border-gray-200 dark:border-zinc-800 shadow-sm">
        <View className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center mb-2.5">
          <User size={24} color="#059669" strokeWidth={2} />
        </View>
        {loading ? (
          <ActivityIndicator color="#059669" />
        ) : isGuest ? (
          <View className="items-center w-full">
            <View className="bg-emerald-100 dark:bg-emerald-950/70 px-2.5 py-0.5 rounded-full mb-1">
              <Text className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Guest Shopper</Text>
            </View>
            <Text className="text-xs text-gray-500 dark:text-zinc-400 text-center mb-3">
              You are currently browsing without an account.
            </Text>
            <TouchableOpacity
              className="bg-primary px-4 py-2 rounded-xl flex-row items-center gap-2"
              onPress={() => setAppState('logged_out')}
              activeOpacity={0.8}
            >
              <LogIn size={15} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white text-xs font-bold">Sign In or Register</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text className="text-base font-bold text-gray-900 dark:text-white">{me?.username ?? 'Account'}</Text>
            {!!me?.email && <Text className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">{me.email}</Text>}
          </>
        )}
      </View>

      {/* Appearance / Theme Settings */}
      <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-2 px-1">Appearance</Text>
      <View className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden mb-5 p-2 gap-1.5 shadow-sm">
        {themeOptions.map((opt) => {
          const isSelected = theme === opt.mode;
          const Icon = opt.icon;
          return (
            <TouchableOpacity
              key={opt.mode}
              className={cn(
                'flex-row items-center justify-between p-3 rounded-xl border',
                isSelected
                  ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                  : 'bg-white dark:bg-[#18181B] border-transparent'
              )}
              onPress={() => setTheme(opt.mode)}
              activeOpacity={0.7}
            >
              <View className="flex-row items-center gap-3">
                <View className={cn('w-8 h-8 rounded-lg items-center justify-center', isSelected ? 'bg-emerald-100 dark:bg-emerald-900/60' : 'bg-gray-100 dark:bg-zinc-800')}>
                  <Icon size={16} color={isSelected ? '#059669' : (isDark ? '#9CA3AF' : '#6B7280')} strokeWidth={2} />
                </View>
                <View>
                  <Text className={cn('text-sm font-bold', isSelected ? 'text-emerald-900 dark:text-emerald-300' : 'text-gray-800 dark:text-zinc-200')}>{opt.label}</Text>
                  <Text className="text-xs text-gray-400 dark:text-zinc-500">{opt.description}</Text>
                </View>
              </View>
              {isSelected && (
                <View className="w-5 h-5 rounded-full bg-primary items-center justify-center">
                  <Check size={12} color="#FFFFFF" strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legal Section */}
      <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-2 px-1">Legal</Text>
      <View className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden mb-5 shadow-sm">
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-zinc-800"
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <FileText size={16} color={iconColor} strokeWidth={2} />
          <Text className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex-1">Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-3.5"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Lock size={16} color={iconColor} strokeWidth={2} />
          <Text className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex-1">Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      {/* Account Actions */}
      <Text className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-2 px-1">Account</Text>
      <View className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden mb-5 shadow-sm">
        <TouchableOpacity
          className={cn(
            'flex-row items-center gap-3 px-4 py-3.5',
            !isGuest && 'border-b border-gray-100 dark:border-zinc-800'
          )}
          onPress={handleSignOut}
        >
          <LogOut size={16} color={iconColor} strokeWidth={2} />
          <Text className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex-1">
            {isGuest ? 'Exit Guest Mode' : 'Sign Out'}
          </Text>
        </TouchableOpacity>
        {!isGuest && (
          <TouchableOpacity
            className="flex-row items-center gap-3 px-4 py-3.5"
            onPress={handleDeleteAccount}
          >
            <Trash2 size={16} color="#EF4444" strokeWidth={2} />
            <Text className="text-sm font-semibold text-red-600 dark:text-red-400 flex-1">Delete My Account</Text>
          </TouchableOpacity>
        )}
      </View>

      {!isGuest && (
        <View className="flex-row items-start gap-2 px-1">
          <ShieldAlert size={14} color={isDark ? '#6B7280' : '#9CA3AF'} strokeWidth={2} className="mt-0.5" />
          <Text className="text-xs text-gray-400 dark:text-zinc-500 flex-1 leading-4">
            Deleting your account removes your storefronts, orders, and history permanently. This cannot be undone.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}
