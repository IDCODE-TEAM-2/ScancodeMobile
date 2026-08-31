import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { ShoppingBag, Bell, Settings2, Calendar, Plus, LayoutGrid, Landmark, Compass, Package } from 'lucide-react-native';
import { getMyStorefronts, deleteToken, type StorefrontResponse } from '../../api';
import type { NavigationProp } from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
// Gated behind __DEV__ below — safe to leave imported, it won't render in production builds.
import DevTestBanner from '../../components/DevTestBanner';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'Dashboard'>;
}

export default function DashboardScreen({ navigation }: Props) {
  const { setAppState } = useAppContext();
  const [storefronts, setStorefronts] = useState<StorefrontResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyStorefronts();
      setStorefronts(data);
    } catch (err: unknown) {
      // A 401 here is already handled globally (see App.tsx's onUnauthorized
      // subscription, which logs the user out) — this just surfaces anything else.
      setError(err instanceof Error ? err.message : 'Failed to load storefronts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusRefresh(load);

  async function handleLogout() {
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
  }

  function renderStorefront({ item }: { item: StorefrontResponse }) {
    const published = item.isPublished;
    return (
      <View className="bg-white rounded-xl p-4 shadow-sm">
        <View className="flex-row justify-between items-start mb-1.5">
          <Text className="text-base font-bold text-gray-900 flex-1 mr-2">{item.name}</Text>
          <View className={cn('rounded-full px-2.5 py-[3px]', published ? 'bg-emerald-100' : 'bg-amber-100')}>
            <Text className={cn('text-xs font-semibold', published ? 'text-emerald-800' : 'text-amber-800')}>
              {published ? 'Published' : 'QR Locked'}
            </Text>
          </View>
        </View>

        {item.description ? (
          <Text className="text-[13px] text-gray-500 mb-1.5" numberOfLines={2}>{item.description}</Text>
        ) : null}

        <Text className="text-xs text-gray-400 mb-3 uppercase tracking-wide">{item.businessType}</Text>

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

        {/* Operations row — always visible */}
        <View className="flex-row gap-2 mt-2">
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2 items-center flex-row justify-center gap-1"
            onPress={() =>
              navigation.navigate('LiveOrdersManager', {
                storefrontId: item.id,
                slug: item.slug,
                name: item.name,
              })
            }
            activeOpacity={0.7}
          >
            <ShoppingBag size={13} color="#4F46E5" strokeWidth={2.2} />
            <Text className="text-indigo-600 font-semibold text-xs">Orders</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2 items-center flex-row justify-center gap-1"
            onPress={() =>
              navigation.navigate('ToolbarRequestsAdmin', {
                storefrontId: item.id,
                name: item.name,
                slug: item.slug,
              })
            }
            activeOpacity={0.7}
          >
            <Bell size={13} color="#4F46E5" strokeWidth={2.2} />
            <Text className="text-indigo-600 font-semibold text-xs">Activity</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2 items-center flex-row justify-center gap-1"
            onPress={() =>
              navigation.navigate('StoreChargesConfig', {
                storefrontId: item.id,
                name: item.name,
                slug: item.slug,
              })
            }
            activeOpacity={0.7}
          >
            <Settings2 size={13} color="#4F46E5" strokeWidth={2.2} />
            <Text className="text-indigo-600 font-semibold text-xs">Config</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex-1 border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2 items-center flex-row justify-center gap-1"
            onPress={() =>
              navigation.navigate('EventsManager', {
                storefrontId: item.id,
                name: item.name,
                slug: item.slug,
              })
            }
            activeOpacity={0.7}
          >
            <Calendar size={13} color="#4F46E5" strokeWidth={2.2} />
            <Text className="text-indigo-600 font-semibold text-xs">Events</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className="border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2 items-center flex-row justify-center gap-1 mt-2"
          onPress={() =>
            navigation.navigate('ProductCatalogEditor', {
              storefrontId: item.id,
              slug: item.slug,
              name: item.name,
            })
          }
          activeOpacity={0.7}
        >
          <Package size={13} color="#4F46E5" strokeWidth={2.2} />
          <Text className="text-indigo-600 font-semibold text-xs">Product Catalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-row justify-between items-center px-5 py-4 bg-white border-b border-gray-200">
        <Text className="text-xl font-bold text-gray-900">My Storefronts</Text>
        <View className="flex-row items-center gap-1">
          <TouchableOpacity onPress={() => navigation.navigate('StorefrontDirectory')} className="p-2" accessibilityLabel="Discover storefronts">
            <Compass size={19} color="#4B5563" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Services')} className="p-2" accessibilityLabel="Services menu">
            <LayoutGrid size={19} color="#4B5563" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('MerchantProfileBank', undefined)} className="p-2" accessibilityLabel="Bank profile">
            <Landmark size={19} color="#4B5563" strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} className="px-2 py-1.5 ml-1">
            <Text className="text-red-500 font-semibold text-sm">Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dev-only role switcher / test utilities — never rendered in a production build */}
      {__DEV__ && <DevTestBanner />}

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : error ? (
        <View className="flex-1 items-center justify-center p-6">
          <Text className="text-red-600 text-sm text-center mb-4">{error}</Text>
          <TouchableOpacity className="bg-primary rounded-lg px-5 py-2.5" onPress={() => load()}>
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={storefronts}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderStorefront}
          contentContainerClassName={cn('p-4 gap-3', storefronts.length === 0 && 'flex-1')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor="#6C63FF"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-6">
              <Text className="text-lg font-bold text-gray-700 mb-1.5">No storefronts yet</Text>
              <Text className="text-sm text-gray-400 text-center mb-5">
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
