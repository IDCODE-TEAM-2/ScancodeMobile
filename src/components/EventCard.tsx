import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MapPin, Star, Ticket, Sparkles, ChevronRight } from 'lucide-react-native';
import AppImage from './AppImage';
import { parseStorefrontData } from '../utils/parseStorefrontData';
import type { StorefrontResponse } from '../api';

interface EventCardProps {
  item: StorefrontResponse;
  isDark: boolean;
  onPress: () => void;
  ctaLabel?: string;
  ratingAverage?: number | null;
}

export default function EventCard({
  item,
  isDark,
  onPress,
  ctaLabel = 'View & RSVP',
  ratingAverage,
}: EventCardProps) {
  const parsedData = parseStorefrontData(item.data);
  const location = parsedData.location || parsedData.venue;
  const banner = item.bannerUrl || (parsedData.images && parsedData.images[0]) || item.logoUrl;

  return (
    <TouchableOpacity
      className="bg-white dark:bg-[#18181B] rounded-2xl mb-4 border border-green-300 dark:border-zinc-800 overflow-hidden shadow-sm"
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View className="h-36 w-full bg-gray-200 relative justify-center items-center overflow-hidden">
        {banner ? (
          <AppImage
            uri={banner}
            className="w-full h-full"
            fallbackIcon={<Ticket size={32} color="#b3b3b6ff" strokeWidth={1.8} />}
          />
        ) : (
          <View className="items-center justify-center">
            <Sparkles size={32} color="#b3b3b6ff" strokeWidth={1.8} />
          </View>
        )}
        <View className="absolute top-3 left-3 bg-gray-600 rounded-full px-3 py-1 flex-row items-center gap-1.5 shadow-md">
          <Ticket size={12} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-[11px] font-extrabold text-white uppercase tracking-wider">Event</Text>
        </View>
        {item.logoUrl ? (
          <View className="absolute bottom-2.5 left-3 w-10 h-10 rounded-full border-2 border-white dark:border-zinc-900 overflow-hidden bg-white shadow">
            <AppImage uri={item.logoUrl} className="w-full h-full" />
          </View>
        ) : null}
      </View>

      <View className="p-3.5">
        <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
          {item.name}
        </Text>
        {item.description ? (
          <Text className="text-xs text-gray-500 dark:text-zinc-400 mt-1" numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}

        <View className="flex-row items-center justify-between mt-3 pt-2.5 border-t border-gray-100 dark:border-zinc-800">
          <View className="flex-row items-center gap-3 flex-1 mr-2">
            {!!location && (
              <View className="flex-row items-center gap-1">
                <MapPin size={12} color={isDark ? '#8f8f91ff' : '#6d6c6fff'} strokeWidth={2} />
                <Text className="text-xs text-black dark:text-white font-semibold" numberOfLines={1}>
                  {location}
                </Text>
              </View>
            )}
            <View className="flex-row items-center gap-1">
              <Star size={12} color="#F59E0B" fill={ratingAverage ? '#F59E0B' : 'none'} strokeWidth={2} />
              <Text className="text-xs text-gray-600 dark:text-zinc-300 font-medium">
                {ratingAverage ? ratingAverage.toFixed(1) : 'Featured'}
              </Text>
            </View>
          </View>

          <View className="flex-row items-center gap-1 bg-gray-200 dark:bg-gray-950/50 px-2.5 py-1 rounded-lg">
            <Text className="text-xs font-bold text-black dark:text-white">{ctaLabel}</Text>
            <ChevronRight size={13} color={isDark ? '#d8cce4ff' : '#4c4c50ff'} strokeWidth={2.5} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
