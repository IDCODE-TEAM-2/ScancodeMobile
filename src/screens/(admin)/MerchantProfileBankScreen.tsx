import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Landmark } from 'lucide-react-native';
import type { NavigationProp } from '../../types';
import { getBusinessProfileData, saveBusinessProfileData } from '../../api';
import { cn } from '../../utils/cn';

export default function MerchantProfileBankScreen() {
  const navigation = useNavigation<NavigationProp<'MerchantProfileBank'>>();

  const [businessName, setBusinessName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setIsLoading(true);
      const data = await getBusinessProfileData();
      if (data.name) setBusinessName(data.name);
      if (data.bankName) setBankName(data.bankName);
      if (data.accountName) setAccountName(data.accountName);
      if (data.accountNumber) setAccountNumber(data.accountNumber);
    } catch {
      // ignore parse or load errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!bankName.trim() || !accountNumber.trim() || !accountName.trim()) {
      Alert.alert('Required Fields', 'Please fill in your Bank Name, Account Name, and Account Number.');
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      await saveBusinessProfileData({
        name: businessName.trim(),
        bankName: bankName.trim(),
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
      });
      setFeedbackMsg({ type: 'success', text: 'Business bank details saved successfully!' });
      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (err: unknown) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save profile details.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="mt-3 text-sm text-gray-600">Loading profile details...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-5" keyboardShouldPersistTaps="handled">
        <View className="flex-row bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 items-start gap-3">
          <Landmark size={24} color="#374151" strokeWidth={2} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-emerald-800 mb-0.5">Payment Account Details</Text>
            <Text className="text-xs text-emerald-700 leading-[18px]">
              These bank details are displayed to customers on your storefront toolbar when they send tips or custom service requests.
            </Text>
          </View>
        </View>

        {feedbackMsg && (
          <View
            className={cn(
              'p-3.5 rounded-xl mb-4 border',
              feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            )}
          >
            <Text
              className={cn(
                'text-[13px] font-semibold text-center',
                feedbackMsg.type === 'success' ? 'text-emerald-900' : 'text-red-900'
              )}
            >
              {feedbackMsg.text}
            </Text>
          </View>
        )}

        <View className="bg-white rounded-[20px] p-5 mb-5 shadow-sm">
          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">Business Name</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Ocean Breeze Restaurant"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">Bank Name *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
              value={bankName}
              onChangeText={setBankName}
              placeholder="e.g. Access Bank, GTBank, Zenith"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View className="mb-4">
            <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">Account Name *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
              value={accountName}
              onChangeText={setAccountName}
              placeholder="e.g. Ocean Breeze Enterprise"
              placeholderTextColor="#9CA3AF"
            />
          </View>

          <View>
            <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">Account Number *</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder="e.g. 0123456789"
              placeholderTextColor="#9CA3AF"
              keyboardType="number-pad"
              maxLength={10}
            />
          </View>
        </View>

        <TouchableOpacity
          className={cn('rounded-2xl py-4 items-center justify-center', isSaving ? 'bg-gray-400' : 'bg-primary')}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-[15px] font-bold">Save Account Details</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
