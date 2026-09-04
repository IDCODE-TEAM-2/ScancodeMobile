import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShoppingBag, Bell, Settings2, Settings as SettingsIcon, Calendar, Plus, LayoutGrid, Landmark, Compass, Package, Pencil } from 'lucide-react-native';
import {
  getMyStorefronts,
  deleteToken,
  getOrders,
  getStorefrontWaiterCalls,
  getStorefrontRequests,
  getStorefrontTips,
  type StorefrontResponse,
} from '../../api';
import type { NavigationProp } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import Skeleton from '../../components/Skeleton';
import { confirmAction } from '../../utils/alerts';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'Dashboard'>;
}

interface NotifCounts {
  orders: number;
  activity: number;
}

const EMPTY_NOTIF_COUNTS: NotifCounts = { orders: 0, activity: 0 };

export default function DashboardScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { setAppState, isDark } = useAppContext();
  const [storefronts, setStorefronts] = useState<StorefrontResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notifCounts, setNotifCounts] = useState<Record<number, NotifCounts>>({});

  const loadNotifCounts = useCallback(async (list: StorefrontResponse[]) => {
    const entries = await Promise.all(
      list.map(async (s): Promise<[number, NotifCounts]> => {
        try {
          const [orders, calls, requests, tips] = await Promise.all([
            getOrders(s.id),
            getStorefrontWaiterCalls(s.id),
            getStorefrontRequests(s.id),
            getStorefrontTips(s.id),
          ]);
          return [
            s.id,
            {
              orders: orders.filter((o) => o.status === 'PENDING').length,
              activity:
                calls.filter((c) => c.status === 'PENDING').length +
                requests.filter((r) => r.status === 'PENDING').length +
                tips.filter((t) => t.status === 'PENDING').length,
            },
          ];
        } catch {
          return [s.id, EMPTY_NOTIF_COUNTS];
        }
      })
    );
    setNotifCounts(Object.fromEntries(entries));
  }, []);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyStorefronts();
      setStorefronts(data);
      loadNotifCounts(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load storefronts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadNotifCounts]);

  useFocusRefresh(load);

  function handleLogout() {
    confirmAction(
      'Sign Out',
      'Are you sure you want to sign out?',
      async () => {
        await deleteToken();
        setAppState('logged_out');
      },
      { confirmText: 'Sign Out', destructive: true }
    );
  }

  const iconColor = isDark ? '#D1D5DB' : '#4B5563';

  function renderStorefront({ item }: { item: StorefrontResponse }) {
    const published = item.isPublished;
    const counts = notifCounts[item.id] ?? EMPTY_NOTIF_COUNTS;
    const hasNotifications = counts.orders + counts.activity > 0;
    return (
      <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
        <View className="flex-row justify-between items-start mb-1.5">
          <View className="flex-row items-center flex-1 mr-2 gap-1.5 shrink">
            {hasNotifications && (
              <View className="w-2 h-2 rounded-full bg-red-500 shrink-0" accessibilityLabel="New notifications" />
            )}
            <Text className="text-base font-bold text-gray-900 dark:text-white shrink" numberOfLines={1}>{item.name}</Text>
          </View>
          <View className="flex-row items-center gap-2">
            <View className={cn('rounded-full px-2.5 py-[3px]', published ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-amber-100 dark:bg-amber-950')}>
              <Text className={cn('text-xs font-semibold', published ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300')}>
                {published ? 'Published' : 'QR Locked'}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('CreateStorefront', { editStorefrontId: item.id })}
              className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 items-center justify-center"
              accessibilityLabel={`Edit ${item.name}`}
            >
              <Pencil size={13} color={iconColor} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>
        </View>

        {item.description ? (
          <Text className="text-[13px] text-gray-500 dark:text-zinc-400 mb-1.5" numberOfLines={2}>{item.description}</Text>
        ) : null}

        <Text className="text-xs text-gray-400 dark:text-zinc-500 mb-3 uppercase tracking-wide">{item.businessType}</Text>

        <View className="flex-row gap-2">
          {published ? (
            <>
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-primary rounded-lg py-2 items-center"
                onPress={() => navigation.navigate('Storefront', { slug: item.slug, name: item.name })}
                activeOpacity={0.7}
              >
                <Text className="text-primary font-semibold text-sm">View Store</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 border-[1.5px] border-primary rounded-lg py-2 items-center"
                onPress={() => navigation.navigate('QR', { slug: item.slug, name: item.name })}
                activeOpacity={0.7}
              >
                <Text className="text-primary font-semibold text-sm">View QR</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              className="flex-1 border-[1.5px] border-primary bg-primary rounded-lg py-2 items-center"
              onPress={() =>
                navigation.navigate('ActivateQR', {
                  storefrontId: item.id,
                  slug: item.slug,
                  name: item.name,
                })
              }
              activeOpacity={0.7}
            >
              <Text className="text-white font-semibold text-sm">Activate QR</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Operations row */}
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg py-2 items-center flex-row justify-center gap-1 relative"
            onPress={() =>
              navigation.navigate('LiveOrdersManager', {
                storefrontId: item.id,
                slug: item.slug,
                name: item.name,
              })
            }
            activeOpacity={0.7}
          >
            <ShoppingBag size={13} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            <Text className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">Orders</Text>
            <NotifCountBadge count={counts.orders} />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg py-2 items-center flex-row justify-center gap-1 relative"
            onPress={() =>
              navigation.navigate('ToolbarRequestsAdmin', {
                storefrontId: item.id,
                name: item.name,
                slug: item.slug,
              })
            }
            activeOpacity={0.7}
          >
            <Bell size={13} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            <Text className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">Activity</Text>
            <NotifCountBadge count={counts.activity} />
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg py-2 items-center flex-row justify-center gap-1"
            onPress={() =>
              navigation.navigate('StoreChargesConfig', {
                storefrontId: item.id,
                name: item.name,
                slug: item.slug,
              })
            }
            activeOpacity={0.7}
          >
            <Settings2 size={13} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            <Text className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">Config</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg py-2 items-center flex-row justify-center gap-1"
            onPress={() =>
              navigation.navigate('EventsManager', {
                storefrontId: item.id,
                name: item.name,
                slug: item.slug,
              })
            }
            activeOpacity={0.7}
          >
            <Calendar size={13} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            <Text className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">Events</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="border-[1.5px] border-primary/20 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg py-2 items-center flex-row justify-center gap-1 mt-2"
          onPress={() =>
            navigation.navigate('ProductCatalogEditor', {
              storefrontId: item.id,
              slug: item.slug,
              name: item.name,
            })
          }
          activeOpacity={0.7}
        >
          <Package size={13} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
          <Text className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">Product Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100 dark:bg-[#09090B]">
      <View className="bg-white dark:bg-[#18181B] border-b border-gray-200 dark:border-zinc-800" style={{ paddingTop: insets.top }}>
        <View className="flex-row justify-between items-center px-5 py-4">
          <Text className="text-xl font-bold text-gray-900 dark:text-white">My Storefronts</Text>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity onPress={() => navigation.navigate('StorefrontDirectory')} className="p-2" accessibilityLabel="Discover storefronts">
              <Compass size={19} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Services')} className="p-2" accessibilityLabel="Services menu">
              <LayoutGrid size={19} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('MerchantProfileBank', undefined)} className="p-2" accessibilityLabel="Bank profile">
              <Landmark size={19} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} className="p-2" accessibilityLabel="Settings">
              <SettingsIcon size={19} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleLogout} className="px-2 py-1.5 ml-1">
              <Text className="text-red-500 font-semibold text-sm">Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {loading ? (
        <View className="p-4 gap-3">
          {[0, 1, 2].map((i) => (
            <View key={i} className="bg-white dark:bg-[#18181B] rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-zinc-800">
              <View className="flex-row justify-between items-start mb-2.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </View>
              <Skeleton className="h-3 w-full mb-1.5" />
              <Skeleton className="h-3 w-2/3 mb-3" />
              <View className="flex-row gap-2">
                <Skeleton className="h-9 flex-1" />
                <Skeleton className="h-9 flex-1" />
              </View>
            </View>
          ))}
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 dark:text-red-400 text-sm text-center mb-4">{error}</Text>
          <TouchableOpacity className="bg-primary rounded-lg px-5 py-2.5" onPress={() => load()}>
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={storefronts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStorefront}
          contentContainerClassName={cn('p-4 pb-28 gap-3', storefronts.length === 0 && 'flex-1')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#059669"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-lg font-bold text-gray-700 dark:text-zinc-300 mb-1.5">No storefronts yet</Text>
              <Text className="text-sm text-gray-400 dark:text-zinc-500 text-center mb-5">
                Create your first storefront to get started
              </Text>
              <TouchableOpacity
                className="bg-primary rounded-[10px] px-6 py-3"
                onPress={() => navigation.navigate('CreateStorefront')}
                activeOpacity={0.8}
              >
                <Text className="text-white font-bold text-[15px]">+ Create Storefront</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      <TouchableOpacity
        className="absolute bottom-6 left-5 right-5 bg-primary rounded-xl py-4 items-center flex-row justify-center gap-2 shadow-lg"
        onPress={() => navigation.navigate('CreateStorefront')}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text className="text-white text-base font-bold">New Storefront</Text>
      </TouchableOpacity>
    </View>
  );
}

function NotifCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-lg bg-red-500 justify-center items-center px-1">
      <Text className="text-white text-[10px] font-extrabold">{count > 9 ? '9+' : count}</Text>
    </View>
  );
}
