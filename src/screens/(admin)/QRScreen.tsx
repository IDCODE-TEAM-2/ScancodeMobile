import React from 'react';
import { View, Text, TouchableOpacity, Share, ScrollView } from 'react-native';
import { Share2 } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import type { NavigationProp, RouteProps } from '../../types';

interface Props {
  navigation: NavigationProp<'QR'>;
  route: RouteProps<'QR'>;
}

export default function QRScreen({ route }: Props) {
  const { slug, name } = route.params;
  const storeUrl = `https://scancode.ng/store/${slug}`;

  async function handleShare() {
    try {
      await Share.share({
        message: `Check out ${name} on ScanCode: ${storeUrl}`,
        url: storeUrl,
      });
    } catch {
      // ignore
    }
  }

  return (
    <ScrollView contentContainerClassName="flex-grow">
      <View className="flex-1 bg-gray-100 p-5 justify-center">
        <View className="bg-white rounded-2xl p-6 items-center shadow-sm">
          <Text className="text-[22px] font-extrabold text-gray-900 text-center mb-1">{name}</Text>
          <Text className="text-sm text-primary font-semibold mb-6">/store/{slug}</Text>

          <View className="p-4 bg-white rounded-xl border border-gray-200 mb-5">
            <QRCode value={storeUrl} size={200} backgroundColor="#ffffff" color="#111827" />
          </View>

          <Text className="text-[13px] text-gray-500 text-center leading-[18px] mb-6">
            Customers can scan this code with their smartphone camera to view your digital menu and place orders.
          </Text>

          <TouchableOpacity
            className="bg-primary rounded-xl py-3.5 px-6 w-full items-center flex-row justify-center gap-2"
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Share2 size={18} color="#FFFFFF" strokeWidth={2.2} />
            <Text className="text-white text-base font-bold">Share Storefront Link</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}
