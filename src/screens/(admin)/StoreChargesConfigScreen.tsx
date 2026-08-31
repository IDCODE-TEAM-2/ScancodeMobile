import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Settings2 } from 'lucide-react-native';
import type { NavigationProp, RouteProps } from '../../types';
import { getStoreConfig, updateStoreConfig } from '../../api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cn } from '../../utils/cn';

export default function StoreChargesConfigScreen() {
  const navigation = useNavigation<NavigationProp<'StoreChargesConfig'>>();
  const route = useRoute<RouteProps<'StoreChargesConfig'>>();
  const { storefrontId } = route.params;

  const [vatRateInput, setVatRateInput] = useState('7.5');
  const [logisticsFeeInput, setLogisticsFeeInput] = useState('2000');
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadConfig();
  }, [storefrontId]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      if (storefrontId) {
        const config = await getStoreConfig(storefrontId);
        if (config.vatRate !== undefined && config.vatRate !== null) {
          const pct = config.vatRate > 1 ? config.vatRate : config.vatRate * 100;
          setVatRateInput(pct.toString());
        }
        if (config.deliveryFee !== undefined && config.deliveryFee !== null) {
          setLogisticsFeeInput(config.deliveryFee.toString());
          if (config.deliveryFee === 0) {
            setDeliveryEnabled(false);
          }
        }
      }
    } catch {
      // Use defaults
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const rawVat = parseFloat(vatRateInput.trim());
    const rawDelivery = parseFloat(logisticsFeeInput.trim());

    if (isNaN(rawVat) || rawVat < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid VAT percentage (e.g. 7.5).');
      return;
    }

    if (isNaN(rawDelivery) || rawDelivery < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid logistics/delivery fee amount.');
      return;
    }

    const vatFraction = rawVat > 1 ? rawVat / 100 : rawVat;
    const finalDeliveryFee = deliveryEnabled ? rawDelivery : 0;

    try {
      setIsSaving(true);
      setFeedbackMsg(null);

      if (storefrontId) {
        await updateStoreConfig(storefrontId, {
          vatRate: vatFraction,
          deliveryFee: finalDeliveryFee,
          deliveryEnabled,
        });
      }

      await AsyncStorage.setItem(
        'global_store_rules',
        JSON.stringify({
          vatRate: vatFraction,
          logisticsFee: finalDeliveryFee,
          deliveryEnabled,
        })
      );

      setFeedbackMsg({ type: 'success', text: 'Store charges & VAT settings updated!' });
      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (err: unknown) {
      setFeedbackMsg({ type: 'error', text: err instanceof Error ? err.message : 'Failed to save store settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="mt-3 text-sm text-gray-600">Loading store charges configuration...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerClassName="p-5" keyboardShouldPersistTaps="handled">
        <View className="bg-white rounded-[20px] p-5 mb-4 items-center shadow-sm">
          <View className="w-12 h-12 rounded-full bg-emerald-50 items-center justify-center mb-2">
            <Settings2 size={22} color="#374151" strokeWidth={2} />
          </View>
          <Text className="text-[17px] font-bold text-gray-900 mb-1">Store Charges & Tax Settings</Text>
          <Text className="text-[13px] text-gray-500 text-center leading-[18px]">
            Configure VAT rates and delivery/logistics fees applied during customer checkout and receipts.
          </Text>
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

        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm">
          <Text className="text-[15px] font-bold text-gray-900 mb-2">Value Added Tax (VAT)</Text>

          <View className="mb-1">
            <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">VAT Percentage (%)</Text>
            <View className="relative justify-center">
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900"
                value={vatRateInput}
                onChangeText={setVatRateInput}
                placeholder="7.5"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
              <Text className="absolute right-3.5 text-sm font-bold text-gray-500">%</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-1.5 leading-4">
              Standard VAT rate (e.g. 7.5%). Enter 0 to disable VAT calculation.
            </Text>
          </View>
        </View>

        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-[15px] font-bold text-gray-900 mb-2">Delivery / Logistics Fee</Text>
              <Text className="text-xs text-gray-500 leading-4">
                Enable for delivery orders, or disable for hotels, bars, and dine-in venues.
              </Text>
            </View>
            <Switch
              value={deliveryEnabled}
              onValueChange={setDeliveryEnabled}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={deliveryEnabled ? '#059669' : '#F3F4F6'}
            />
          </View>

          {deliveryEnabled && (
            <View className="mt-4">
              <Text className="text-[13px] font-semibold text-gray-700 mb-1.5">Default Delivery Fee (₦)</Text>
              <View className="relative justify-center">
                <Text className="absolute left-3.5 z-10 text-sm font-bold text-gray-500">₦</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-200 rounded-xl py-3 pr-3.5 pl-8 text-sm text-gray-900"
                  value={logisticsFeeInput}
                  onChangeText={setLogisticsFeeInput}
                  placeholder="2000"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="number-pad"
                />
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity
          className={cn('rounded-2xl py-4 items-center justify-center mt-2', isSaving ? 'bg-gray-400' : 'bg-primary')}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white text-[15px] font-bold">Save Store Charges</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
