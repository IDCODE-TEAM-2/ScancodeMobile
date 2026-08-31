import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { Store, PlusCircle, Ticket, ChevronRight } from 'lucide-react-native';
import { getMyStorefronts, type StorefrontResponse } from '../../api';
import type { NavigationProp } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';

interface Props {
  navigation: NavigationProp<'Services'>;
}

export default function ServicesScreen({ navigation }: Props) {
  const [storefronts, setStorefronts] = useState<StorefrontResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = React.useCallback(async () => {
    try {
      setLoading(true);
      const data = await getMyStorefronts();
      setStorefronts(data);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusRefresh(load);

  const hasStorefronts = storefronts.length > 0;

  const handleAccessPagePress = () => {
    if (!hasStorefronts) {
      Alert.alert('No Storefronts Yet', 'Create a storefront first before setting up an Access Page.');
      return;
    }
    if (storefronts.length === 1) {
      const s = storefronts[0];
      navigation.navigate('AccessPageManager', { storefrontId: s.id, slug: s.slug, name: s.name });
      return;
    }
    setPickerOpen((prev) => !prev);
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-5">
      <Text className="text-[22px] font-bold text-gray-900 mb-1.5">Services</Text>
      <Text className="text-sm text-gray-500 mb-6 leading-5">
        Manage your storefronts and set up event access pages.
      </Text>

      <TouchableOpacity
        className="flex-row items-center bg-white rounded-2xl p-4 mb-3.5 border border-gray-200"
        onPress={() => navigation.navigate('CreateStorefront')}
        activeOpacity={0.75}
      >
        <View className="w-12 h-12 rounded-xl bg-emerald-50 items-center justify-center mr-3.5">
          {hasStorefronts ? (
            <PlusCircle size={22} color="#374151" strokeWidth={2} />
          ) : (
            <Store size={22} color="#374151" strokeWidth={2} />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">
            {hasStorefronts ? 'Add Storefront' : 'Create Storefront'}
          </Text>
          <Text className="text-[13px] text-gray-500 mt-0.5">
            {hasStorefronts
              ? 'Set up another business page under your account'
              : 'Set up your first business page and start selling'}
          </Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
      </TouchableOpacity>

      <TouchableOpacity
        className="flex-row items-center bg-white rounded-2xl p-4 border border-gray-200"
        onPress={handleAccessPagePress}
        activeOpacity={0.75}
      >
        <View className="w-12 h-12 rounded-xl bg-amber-50 items-center justify-center mr-3.5">
          <Ticket size={22} color="#374151" strokeWidth={2} />
        </View>
        <View className="flex-1">
          <Text className="text-base font-bold text-gray-900">Access Page</Text>
          <Text className="text-[13px] text-gray-500 mt-0.5">
            Event pages, guest check-ins &amp; exclusive content
          </Text>
        </View>
        <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
      </TouchableOpacity>

      {pickerOpen && (
        <View className="bg-white rounded-2xl mt-3 border border-gray-200 overflow-hidden">
          {storefronts.map((s) => (
            <TouchableOpacity
              key={s.id}
              className="px-4 py-3.5 border-b border-gray-100"
              onPress={() => {
                setPickerOpen(false);
                navigation.navigate('AccessPageManager', { storefrontId: s.id, slug: s.slug, name: s.name });
              }}
            >
              <Text className="text-sm font-semibold text-gray-800">{s.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}
