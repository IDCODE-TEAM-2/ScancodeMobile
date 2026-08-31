import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { User, LogOut, Trash2, ShieldAlert, FileText, Lock } from 'lucide-react-native';
import { getMe, deleteToken, deleteAccount, type MeResponse } from '../api';
import type { NavigationProp } from '../types';
import { useAppContext } from '../context/AppContext';

interface Props {
  navigation: NavigationProp<'Settings'>;
}

export default function SettingsScreen({ navigation }: Props) {
  const { setAppState } = useAppContext();
  const [me, setMe] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getMe()
      .then(setMe)
      .catch(() => {
        // Not fatal — the rest of the screen still works without the profile summary.
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await deleteToken();
          setAppState('logged_out');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Your Account',
      'This permanently deletes your account and all associated data — storefronts, orders, and history. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second, explicit confirmation for a truly irreversible action.
            Alert.alert(
              'Are you absolutely sure?',
              'Type nothing — just confirm. Your account cannot be recovered after this.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteAccount();
                      setAppState('logged_out');
                    } catch (err: unknown) {
                      setDeleting(false);
                      Alert.alert(
                        'Couldn\'t Delete Account',
                        err instanceof Error ? err.message : 'Please try again, or contact support.'
                      );
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  if (deleting) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center p-6">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-sm text-gray-500 mt-3">Deleting your account…</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-5 pb-12">
      <View className="bg-white rounded-2xl p-5 mb-5 items-center border border-gray-200">
        <View className="w-14 h-14 rounded-full bg-emerald-50 items-center justify-center mb-2.5">
          <User size={24} color="#374151" strokeWidth={2} />
        </View>
        {loading ? (
          <ActivityIndicator color="#059669" />
        ) : (
          <>
            <Text className="text-base font-bold text-gray-900">{me?.username ?? 'Account'}</Text>
            {!!me?.email && <Text className="text-[13px] text-gray-500 mt-0.5">{me.email}</Text>}
          </>
        )}
      </View>

      <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Legal</Text>
      <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5">
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-3.5 border-b border-gray-100"
          onPress={() => navigation.navigate('TermsOfService')}
        >
          <FileText size={16} color="#374151" strokeWidth={2} />
          <Text className="text-sm font-semibold text-gray-800 flex-1">Terms of Service</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-3.5"
          onPress={() => navigation.navigate('PrivacyPolicy')}
        >
          <Lock size={16} color="#374151" strokeWidth={2} />
          <Text className="text-sm font-semibold text-gray-800 flex-1">Privacy Policy</Text>
        </TouchableOpacity>
      </View>

      <Text className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2 px-1">Account</Text>
      <View className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-5">
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-3.5 border-b border-gray-100"
          onPress={handleSignOut}
        >
          <LogOut size={16} color="#374151" strokeWidth={2} />
          <Text className="text-sm font-semibold text-gray-800 flex-1">Sign Out</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center gap-3 px-4 py-3.5"
          onPress={handleDeleteAccount}
        >
          <Trash2 size={16} color="#DC2626" strokeWidth={2} />
          <Text className="text-sm font-semibold text-red-600 flex-1">Delete My Account</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-start gap-2 px-1">
        <ShieldAlert size={14} color="#9CA3AF" strokeWidth={2} className="mt-0.5" />
        <Text className="text-xs text-gray-400 flex-1 leading-4">
          Deleting your account removes your storefronts, orders, and history permanently. This cannot be undone.
        </Text>
      </View>
    </ScrollView>
  );
}
