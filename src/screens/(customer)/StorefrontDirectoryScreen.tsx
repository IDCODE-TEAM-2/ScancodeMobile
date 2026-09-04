import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Star, MapPin, Store, QrCode, LogOut, ArrowDownAZ, ArrowLeft, LocateFixed, Settings as SettingsIcon } from 'lucide-react-native';
import Skeleton from '../../components/Skeleton';
import {
  getAllStorefronts,
  getStorefrontRatings,
  getMyStorefronts,
  deleteToken,
  type StorefrontResponse,
  type StorefrontRating,
} from '../../api';
import type { NavigationProp, NigeriaState } from '../../types';
import { parseStorefrontData } from '../../utils/parseStorefrontData';
import { detectCurrentState } from '../../utils/geoProximity';
import { useAppContext } from '../../context/AppContext';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { confirmAction } from '../../utils/alerts';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'StorefrontDirectory'>;
}

type SortMode = 'rating' | 'location' | 'alphabetical' | 'nearby';

const BASE_SORT_OPTIONS: { mode: SortMode; label: string }[] = [
  { mode: 'rating', label: 'Top Rated' },
  { mode: 'location', label: 'Location' },
  { mode: 'alphabetical', label: 'A–Z' },
];

export default function StorefrontDirectoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { appState, setAppState, isDark } = useAppContext();
  const isVendor = appState === 'admin';

  const [storefronts, setStorefronts] = useState<StorefrontResponse[]>([]);
  const [myStorefronts, setMyStorefronts] = useState<StorefrontResponse[]>([]);
  const [ratings, setRatings] = useState<StorefrontRating[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>('rating');
  const [nearbyState, setNearbyState] = useState<NigeriaState | null>(null);

  useEffect(() => {
    detectCurrentState().then(setNearbyState);
  }, []);

  const sortOptions = useMemo(
    () => (nearbyState ? [{ mode: 'nearby' as const, label: 'Near You' }, ...BASE_SORT_OPTIONS] : BASE_SORT_OPTIONS),
    [nearbyState]
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [all, ratingsData, mine] = await Promise.all([
        getAllStorefronts().catch(() => []),
        getStorefrontRatings().catch(() => []),
        isVendor ? getMyStorefronts().catch(() => []) : Promise.resolve([]),
      ]);
      setStorefronts(all);
      setRatings(ratingsData);
      setMyStorefronts(mine);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setLoading(false);
    }
  }, [isVendor]);

  useFocusRefresh(load);

  const ratingFor = useCallback(
    (storefrontId: number) => ratings.find((r) => r.storefrontId === storefrontId),
    [ratings]
  );

  const sorted = useMemo(() => {
    const list = [...storefronts];
    if (sortMode === 'alphabetical') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'location') {
      list.sort((a, b) => {
        const la = parseStorefrontData(a.data).location ?? '';
        const lb = parseStorefrontData(b.data).location ?? '';
        return la.localeCompare(lb) || a.name.localeCompare(b.name);
      });
    } else if (sortMode === 'nearby' && nearbyState) {
      list.sort((a, b) => {
        const aNear = parseStorefrontData(a.data).location === nearbyState ? 0 : 1;
        const bNear = parseStorefrontData(b.data).location === nearbyState ? 0 : 1;
        if (aNear !== bNear) return aNear - bNear;
        return (ratingFor(b.id)?.average ?? 0) - (ratingFor(a.id)?.average ?? 0);
      });
    } else {
      list.sort((a, b) => (ratingFor(b.id)?.average ?? 0) - (ratingFor(a.id)?.average ?? 0));
    }
    return list;
  }, [storefronts, sortMode, ratingFor, nearbyState]);

  const handleLogout = () => {
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

  const iconColor = isDark ? '#D1D5DB' : '#4B5563';

  const renderCard = (item: StorefrontResponse) => {
    const rating = ratingFor(item.id);
    const location = parseStorefrontData(item.data).location;
    return (
      <TouchableOpacity
        key={item.id}
        className="flex-row bg-white dark:bg-[#18181B] rounded-2xl p-3.5 mb-3 border border-gray-200 dark:border-zinc-800 shadow-sm"
        onPress={() => navigation.navigate('Storefront', { slug: item.slug, name: item.name })}
        activeOpacity={0.75}
      >
        <View className="w-16 h-16 rounded-xl bg-gray-100 dark:bg-zinc-800 overflow-hidden items-center justify-center mr-3">
          {item.logoUrl ? (
            <Image source={{ uri: item.logoUrl }} className="w-16 h-16" />
          ) : (
            <Store size={22} color={isDark ? '#6B7280' : '#D1D5DB'} strokeWidth={1.8} />
          )}
        </View>
        <View className="flex-1">
          <Text className="text-[15px] font-bold text-gray-900 dark:text-white" numberOfLines={1}>{item.name}</Text>
          <Text className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 uppercase tracking-wide">{item.businessType}</Text>
          <View className="flex-row items-center gap-3 mt-1.5">
            <View className="flex-row items-center gap-1">
              <Star size={13} color="#F59E0B" fill={rating ? '#F59E0B' : 'none'} strokeWidth={2} />
              <Text className="text-xs text-gray-600 dark:text-zinc-300 font-semibold">
                {rating ? rating.average.toFixed(1) : 'New'}{rating ? ` (${rating.count})` : ''}
              </Text>
            </View>
            {!!location && (
              <View className="flex-row items-center gap-1">
                <MapPin size={12} color={isDark ? '#9CA3AF' : '#9CA3AF'} strokeWidth={2} />
                <Text className="text-xs text-gray-500 dark:text-zinc-400">{location}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View className="flex-1 bg-gray-100 dark:bg-[#09090B]">
      <View className="bg-white dark:bg-[#18181B] border-b border-gray-200 dark:border-zinc-800" style={{ paddingTop: insets.top }}>
        <View className="flex-row justify-between items-center px-5 py-4">
          <View className="flex-row items-center gap-2">
            {navigation.canGoBack() && (
              <TouchableOpacity onPress={() => navigation.goBack()} className="p-1 -ml-1" accessibilityLabel="Go back">
                <ArrowLeft size={20} color={iconColor} strokeWidth={2.2} />
              </TouchableOpacity>
            )}
            <Text className="text-xl font-bold text-gray-900 dark:text-white">Discover</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              onPress={() => navigation.navigate('CameraQRScanner', undefined)}
              className="p-2"
              accessibilityLabel="Scan a table QR code"
            >
              <QrCode size={19} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')} className="p-2" accessibilityLabel="Settings">
              <SettingsIcon size={19} color={iconColor} strokeWidth={2} />
            </TouchableOpacity>
            {!isVendor && (
              <TouchableOpacity onPress={handleLogout} className="p-2" accessibilityLabel="Sign out">
                <LogOut size={19} color={iconColor} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {loading ? (
        <View className="p-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <View key={i} className="flex-row bg-white dark:bg-[#18181B] rounded-2xl p-3.5 border border-gray-200 dark:border-zinc-800">
              <Skeleton className="w-16 h-16 rounded-xl mr-3" />
              <View className="flex-1 justify-center gap-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => renderCard(item)}
          contentContainerClassName="p-4 pb-8"
          ListHeaderComponent={
            <View>
              {isVendor && myStorefronts.length > 0 && (
                <View className="mb-5">
                  <Text className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2.5 uppercase tracking-wide">Your Storefronts</Text>
                  {myStorefronts.map((s) => renderCard(s))}
                  <Text className="text-sm font-bold text-gray-700 dark:text-zinc-300 mb-2.5 mt-2 uppercase tracking-wide">All Storefronts</Text>
                </View>
              )}

              <View className="flex-row gap-2 mb-3.5 flex-wrap">
                {sortOptions.map((opt) => {
                  const isSelected = sortMode === opt.mode;
                  return (
                    <TouchableOpacity
                      key={opt.mode}
                      className={cn(
                        'flex-row items-center gap-1 rounded-full px-3.5 py-2',
                        isSelected ? 'bg-primary' : 'bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800'
                      )}
                      onPress={() => setSortMode(opt.mode)}
                    >
                      {opt.mode === 'alphabetical' && (
                        <ArrowDownAZ size={13} color={isSelected ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} strokeWidth={2} />
                      )}
                      {opt.mode === 'nearby' && (
                        <LocateFixed size={13} color={isSelected ? '#FFFFFF' : (isDark ? '#9CA3AF' : '#6B7280')} strokeWidth={2} />
                      )}
                      <Text className={cn('text-xs font-semibold', isSelected ? 'text-white' : 'text-gray-600 dark:text-zinc-300')}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {sortMode === 'nearby' && nearbyState && (
                <View className="flex-row items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-2 mb-3.5">
                  <LocateFixed size={13} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
                  <Text className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                    Showing storefronts near {nearbyState} first
                  </Text>
                </View>
              )}
            </View>
          }
          ListEmptyComponent={
            <View className="items-center justify-center p-10">
              <Text className="text-sm text-gray-400 dark:text-zinc-500 text-center">No storefronts published yet.</Text>
            </View>
          }
        />
      )}
    </View>
  );
}
