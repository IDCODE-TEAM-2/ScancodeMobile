import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { Store, PlusCircle, Ticket, ChevronRight, Calendar, Sparkles } from 'lucide-react-native';
import { getMyStorefronts, type StorefrontResponse } from '../../api';
import type { NavigationProp } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { useAppContext } from '../../context/AppContext';

interface Props {
  navigation: NavigationProp<'Services'>;
}

export default function ServicesScreen({ navigation }: Props) {
  const { isDark } = useAppContext();
  const [storefronts, setStorefronts] = useState<StorefrontResponse[]>([]);
  const [loading, setLoading] = useState(true);

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

  const events = storefronts.filter((s) => s.businessType === 'EVENT');
  const stores = storefronts.filter((s) => s.businessType !== 'EVENT');

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-[#09090B]">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-[#09090B]"
      contentContainerClassName="p-5 pb-16"
      showsVerticalScrollIndicator={false}
    >
      <Text className="text-2xl font-extrabold text-gray-900 dark:text-white mb-1">Service Hub</Text>
      <Text className="text-sm text-gray-500 dark:text-gray-400 mb-6 leading-5">
        Manage your business storefronts and events.
      </Text>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: EVENTS & ACCESS PASSES (STANDALONE)                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <View className="mb-8">
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-zinc-800 items-center justify-center">
              <Ticket size={16} color={isDark ? '#FBBF24' : '#D97706'} />
            </View>
            <Text className="text-base font-extrabold text-gray-900 dark:text-white">
              Events &amp; Access Pages
            </Text>
          </View>
          <Text className="text-xs font-semibold text-gray-400">
            {events.length} {events.length === 1 ? 'Event' : 'Events'}
          </Text>
        </View>

        {/* Create Event Card */}
        <TouchableOpacity
          className="flex-row items-center bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-3 border border-amber-200/80 dark:border-amber-900/30 shadow-sm"
          onPress={() => navigation.navigate('CreateEvent')}
          activeOpacity={0.75}
        >
          <View className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/40 items-center justify-center mr-3.5">
            <Sparkles size={22} color={isDark ? '#FBBF24' : '#D97706'} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 dark:text-white">
              Create New Event
            </Text>
            <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
              Weddings, concerts, conferences, passes &amp; door check-in
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
        </TouchableOpacity>

        {/* Existing Events List */}
        {events.length > 0 ? (
          <View className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {events.map((e) => (
              <TouchableOpacity
                key={e.id}
                className="p-4 flex-row items-center justify-between"
                onPress={() =>
                  navigation.navigate('AccessPageManager', {
                    storefrontId: e.id,
                    slug: e.slug,
                    name: e.name,
                  })
                }
                activeOpacity={0.7}
              >
                <View className="flex-1 mr-3">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
                      {e.name}
                    </Text>
                    <View className="bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800/40">
                      <Text className="text-[10px] font-extrabold text-amber-700 dark:text-amber-300">
                        EVENT
                      </Text>
                    </View>
                  </View>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-1" numberOfLines={1}>
                    {e.description || `scancode.ng/${e.slug}`}
                  </Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Manage</Text>
                  <ChevronRight size={16} color="#059669" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="bg-gray-100/60 dark:bg-zinc-900/40 rounded-2xl p-4 border border-dashed border-gray-200 dark:border-zinc-800 items-center">
            <Calendar size={28} color="#9CA3AF" />
            <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1.5">
              No standalone events created yet.
            </Text>
          </View>
        )}
      </View>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: BUSINESS STOREFRONTS (RESTAURANTS, STORES, HOTELS)  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <View>
        <View className="flex-row justify-between items-center mb-3">
          <View className="flex-row items-center gap-2">
            <View className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-zinc-800 items-center justify-center">
              <Store size={16} color={isDark ? '#34D399' : '#059669'} />
            </View>
            <Text className="text-base font-extrabold text-gray-900 dark:text-white">
              Business Storefronts
            </Text>
          </View>
          <Text className="text-xs font-semibold text-gray-400">
            {stores.length} {stores.length === 1 ? 'Store' : 'Stores'}
          </Text>
        </View>

        {/* Create Storefront Card */}
        <TouchableOpacity
          className="flex-row items-center bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-3 border border-gray-200 dark:border-zinc-800 shadow-sm"
          onPress={() => navigation.navigate('CreateStorefront')}
          activeOpacity={0.75}
        >
          <View className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mr-3.5">
            <PlusCircle size={22} color={isDark ? '#34D399' : '#059669'} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-gray-900 dark:text-white">
              Create Business Storefront
            </Text>
            <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
              Product catalog, restaurant menu, orders &amp; delivery
            </Text>
          </View>
          <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
        </TouchableOpacity>

        {/* Existing Storefronts List */}
        {stores.length > 0 && (
          <View className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden divide-y divide-gray-100 dark:divide-zinc-800">
            {stores.map((s) => (
              <TouchableOpacity
                key={s.id}
                className="p-4 flex-row items-center justify-between"
                onPress={() =>
                  navigation.navigate('CreateStorefront', {
                    editStorefrontId: s.id,
                  })
                }
                activeOpacity={0.7}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
                    {s.name}
                  </Text>
                  <Text className="text-xs text-gray-500 dark:text-gray-400 mt-0.5" numberOfLines={1}>
                    {s.businessType} • scancode.ng/{s.slug}
                  </Text>
                </View>
                <ChevronRight size={16} color="#9CA3AF" />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
