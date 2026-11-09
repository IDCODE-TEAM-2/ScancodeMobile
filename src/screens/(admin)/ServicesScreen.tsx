import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Store, Calendar, CreditCard, ChevronRight, CalendarPlus, PlusCircle } from 'lucide-react-native';
import EventCard from '../../components/EventCard';
import { getMyStorefronts, type StorefrontResponse } from '../../api';
import type { NavigationProp } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { useAppContext } from '../../context/AppContext';

interface Props {
  navigation: NavigationProp<'Services'>;
}

type ServiceId = 'events' | 'storefronts' | 'businessCards';

interface ServiceItem {
  id: ServiceId;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
  comingSoon?: boolean;
}

export default function ServicesScreen({ navigation }: Props) {
  const { isDark } = useAppContext();
  const [storefronts, setStorefronts] = useState<StorefrontResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<ServiceId | null>(null);

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

  const iconGreen = isDark ? '#34D399' : '#059669';
  const iconGray = isDark ? '#71717A' : '#9CA3AF';

  const services: ServiceItem[] = [
    {
      id: 'events',
      label: 'Events & Access Mgmt',
      icon: <Calendar size={28} color={iconGreen} strokeWidth={1.8} />,
    },
    {
      id: 'storefronts',
      label: 'Business Storefronts',
      icon: <Store size={28} color={iconGreen} strokeWidth={1.8} />,
    },
    {
      id: 'businessCards',
      label: 'Business Cards',
      icon: <CreditCard size={28} color={iconGray} strokeWidth={1.8} />,
      disabled: true,
      comingSoon: true,
    },
  ];

  const handleServicePress = (id: ServiceId) => {
    if (id === 'businessCards') return; // non-clickable
    setActiveSection((prev) => (prev === id ? null : id));
  };

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
        Manage your business services.
      </Text>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ICON GRID — OPay/Chowdeck style                                */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <View className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 p-4 mb-6">
        <View className="flex-row flex-wrap gap-0">
          {services.map((svc) => {
            const isActive = activeSection === svc.id;
            return (
              <TouchableOpacity
                key={svc.id}
                className="items-center"
                style={{ width: '33.33%', paddingVertical: 8, paddingHorizontal: 4 }}
                onPress={() => handleServicePress(svc.id)}
                activeOpacity={svc.disabled ? 1 : 0.7}
                disabled={svc.disabled}
                accessibilityLabel={svc.label}
              >
                {/* Icon circle */}
                <View
                  className={
                    svc.disabled
                      ? 'w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-1.5'
                      : isActive
                        ? 'w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/50 items-center justify-center mb-1.5'
                        : 'w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center mb-1.5'
                  }
                >
                  {svc.icon}
                </View>
                <Text
                  numberOfLines={2}
                  className={
                    svc.disabled
                      ? 'text-[11px] text-center text-gray-400 dark:text-zinc-500 font-medium'
                      : 'text-[11px] text-center text-gray-700 dark:text-zinc-300 font-semibold'
                  }
                >
                  {svc.label}
                </Text>
                {svc.comingSoon && (
                  <View className="bg-gray-200 dark:bg-zinc-700 rounded-full px-1.5 py-0.5 mt-0.5">
                    <Text className="text-[9px] font-bold text-gray-500 dark:text-zinc-400">SOON</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION: EVENTS & ACCESS PAGES                                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'events' && (
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-extrabold text-gray-900 dark:text-white">Events & Access Pages</Text>
            <Text className="text-xs font-semibold text-gray-400">
              {events.length} {events.length === 1 ? 'Event' : 'Events'}
            </Text>
          </View>

          {/* Create Event Card */}
          <TouchableOpacity
            className="flex-row items-center bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-3 border border-gray-200 dark:border-zinc-800 shadow-sm"
            onPress={() => navigation.navigate('CreateEvent')}
            activeOpacity={0.75}
          >
            <View className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 items-center justify-center mr-3.5">
              <CalendarPlus size={22} color={isDark ? '#34D399' : '#059669'} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white">Create New Event</Text>
              <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                Weddings, concerts, conferences, passes & door check-in
              </Text>
            </View>
            <ChevronRight size={18} color="#9CA3AF" strokeWidth={2} />
          </TouchableOpacity>

          {/* Existing Events List */}
          {events.length > 0 ? (
            <View>
              {events.map((e) => (
                <EventCard
                  key={e.id}
                  item={e}
                  isDark={isDark}
                  ctaLabel="Manage Event"
                  onPress={() =>
                    navigation.navigate('AccessPageManager', {
                      storefrontId: e.id,
                      slug: e.slug,
                      name: e.name,
                    })
                  }
                />
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
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* SECTION: BUSINESS STOREFRONTS                                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {activeSection === 'storefronts' && (
        <View>
          <View className="flex-row justify-between items-center mb-3">
            <Text className="text-base font-extrabold text-gray-900 dark:text-white">Business Storefronts</Text>
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
            <View className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-zinc-800 items-center justify-center mr-3.5">
              <PlusCircle size={22} color={isDark ? '#34D399' : '#059669'} strokeWidth={2} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-bold text-gray-900 dark:text-white">Create Business Storefront</Text>
              <Text className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                Product catalog, restaurant menu, orders & delivery
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
      )}
    </ScrollView>
  );
}
