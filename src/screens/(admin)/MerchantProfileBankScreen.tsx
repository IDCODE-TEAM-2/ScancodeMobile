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
import { Landmark, Plus, Trash2 } from 'lucide-react-native';
import type { NavigationProp, BankAccount } from '../../types';
import { getBusinessProfileData, saveBusinessProfileData } from '../../api';
import { cn } from '../../utils/cn';

interface BankAccountItem extends BankAccount {
  id: string;
}

export default function MerchantProfileBankScreen() {
  const navigation = useNavigation<NavigationProp<'MerchantProfileBank'>>();

  const [businessName, setBusinessName] = useState('');
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([
    { id: 'acc-1', bankName: '', accountNumber: '', accountName: '', isPrimary: true },
  ]);
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

      if (data.bankAccounts && data.bankAccounts.length > 0) {
        setBankAccounts(data.bankAccounts.map((b, idx) => ({
          id: `acc-${idx}-${Date.now()}`,
          bankName: b.bankName,
          accountNumber: b.accountNumber,
          accountName: b.accountName || '',
          isPrimary: b.isPrimary ?? (idx === 0),
        })));
      } else if (data.bankName || data.accountNumber) {
        setBankAccounts([
          {
            id: 'acc-1',
            bankName: data.bankName || '',
            accountNumber: data.accountNumber || '',
            accountName: data.accountName || '',
            isPrimary: true,
          },
        ]);
      }
    } catch {
      // ignore parse or load errors
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        id: `acc-${Date.now()}`,
        bankName: '',
        accountNumber: '',
        accountName: '',
        isPrimary: prev.length === 0,
      },
    ]);
  };

  const handleRemoveAccount = (id: string) => {
    setBankAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (next.length > 0 && !next.some((a) => a.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleSetPrimary = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id }))
    );
  };

  const handleUpdateAccount = (id: string, field: 'bankName' | 'accountNumber' | 'accountName', val: string) => {
    setBankAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  const handleSave = async () => {
    const valid = bankAccounts.filter((a) => a.bankName.trim() && a.accountNumber.trim());
    if (valid.length === 0) {
      Alert.alert('Required Fields', 'Please fill in at least one bank account with Bank Name and Account Number.');
      return;
    }

    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      const primary = valid.find((a) => a.isPrimary) || valid[0];

      await saveBusinessProfileData({
        name: businessName.trim(),
        bankName: primary.bankName.trim(),
        accountName: primary.accountName?.trim() || '',
        accountNumber: primary.accountNumber.trim(),
        bankAccounts: valid.map((a) => ({
          bankName: a.bankName.trim(),
          accountNumber: a.accountNumber.trim(),
          accountName: a.accountName?.trim() || undefined,
          isPrimary: a.isPrimary ?? false,
        })),
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
      <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled">
        <View className="flex-row bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 items-start gap-3">
          <Landmark size={24} color="#374151" strokeWidth={2} />
          <View className="flex-1">
            <Text className="text-sm font-bold text-emerald-800 mb-0.5">Payment Account Details</Text>
            <Text className="text-xs text-emerald-700 leading-[18px]">
              Add one or more bank accounts for customer direct transfers and tips. You can switch primary accounts anytime.
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
          <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">Business Name</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
            value={businessName}
            onChangeText={setBusinessName}
            placeholder="e.g. Ocean Breeze Restaurant"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <View className="flex-row justify-between items-center mb-3">
          <Text className="text-base font-bold text-gray-900">Bank Accounts</Text>
          <TouchableOpacity
            onPress={handleAddAccount}
            className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1.5"
            activeOpacity={0.7}
          >
            <Plus size={13} color="#059669" strokeWidth={2.5} />
            <Text className="text-emerald-700 text-xs font-bold">Add Account</Text>
          </TouchableOpacity>
        </View>

        {bankAccounts.map((acc, index) => (
          <View key={acc.id} className="bg-white rounded-[20px] p-4 mb-3.5 border border-gray-200 shadow-sm">
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-row items-center gap-2">
                <Text className="text-xs font-bold text-gray-700">Account #{index + 1}</Text>
                {acc.isPrimary && (
                  <View className="bg-emerald-100 rounded-full px-2 py-0.5">
                    <Text className="text-[10px] font-bold text-emerald-800">PRIMARY</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center gap-2">
                {!acc.isPrimary && (
                  <TouchableOpacity
                    onPress={() => handleSetPrimary(acc.id)}
                    className="border border-gray-200 rounded-lg px-2.5 py-1"
                  >
                    <Text className="text-[11px] font-semibold text-gray-600">Make Primary</Text>
                  </TouchableOpacity>
                )}
                {bankAccounts.length > 1 && (
                  <TouchableOpacity onPress={() => handleRemoveAccount(acc.id)} className="p-1">
                    <Trash2 size={15} color="#DC2626" strokeWidth={2} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View className="mb-3">
              <Text className="text-xs font-semibold text-gray-600 mb-1">Bank Name *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                value={acc.bankName}
                onChangeText={(v) => handleUpdateAccount(acc.id, 'bankName', v)}
                placeholder="e.g. Access Bank, GTBank, Zenith"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            <View className="mb-3">
              <Text className="text-xs font-semibold text-gray-600 mb-1">Account Number *</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                value={acc.accountNumber}
                onChangeText={(v) => handleUpdateAccount(acc.id, 'accountNumber', v.replace(/\D/g, ''))}
                placeholder="e.g. 0123456789"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
                maxLength={10}
              />
            </View>

            <View>
              <Text className="text-xs font-semibold text-gray-600 mb-1">Account Name (optional)</Text>
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                value={acc.accountName || ''}
                onChangeText={(v) => handleUpdateAccount(acc.id, 'accountName', v)}
                placeholder="e.g. Ocean Breeze Enterprise"
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        ))}

        <TouchableOpacity
          className={cn('rounded-2xl py-4 items-center justify-center mt-2', isSaving ? 'bg-gray-400' : 'bg-primary')}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-[15px] font-bold">Save All Bank Accounts</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
