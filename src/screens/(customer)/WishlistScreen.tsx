import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Heart } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart, EMPTY_FAVORITES } from '../../context/CartContext';
import { useAppContext } from '../../context/AppContext';
import type { NavigationProp, RouteProps } from '../../types';

interface Props {
  navigation: NavigationProp<'Wishlist'>;
  route: RouteProps<'Wishlist'>;
}

export default function WishlistScreen({ navigation, route }: Props) {
  const { slug, storefrontId, name } = route.params;
  const { favorites, toggleFavorite, addToCart } = useCart();
  const { isDark } = useAppContext();
  const items = favorites[storefrontId] ?? EMPTY_FAVORITES;

  const handleAddToCart = (productId: string) => {
    const product = items.find((p) => p.id === productId);
    if (!product) return;
    const added = addToCart(storefrontId, product);
    if (!added) {
      Alert.alert('Limit Reached', `Only ${product.stock} items available in stock.`);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-[#09090B]" edges={['bottom', 'left', 'right']}>
      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8 gap-1.5">
          <Heart size={40} color={isDark ? '#52525B' : '#D1D5DB'} strokeWidth={1.5} />
          <Text className="text-base font-bold text-gray-800 dark:text-zinc-200 mt-2">No favorites yet</Text>
          <Text className="text-[13px] text-gray-500 dark:text-zinc-400 text-center">Tap the heart on any item to save it here.</Text>
          <TouchableOpacity
            className="mt-4 bg-primary rounded-xl px-5 py-3"
            onPress={() => navigation.navigate('Storefront', { slug, name })}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerClassName="p-4" showsVerticalScrollIndicator={false}>
          {items.map((item) => (
            <View key={item.id} className="flex-row justify-between items-center py-3.5 border-b border-gray-100 dark:border-zinc-800">
              <View className="flex-1 mr-3">
                <Text className="text-[15px] font-semibold text-gray-800 dark:text-zinc-100">{item.name}</Text>
                <Text className="text-xs text-gray-400 dark:text-zinc-400 mt-0.5" numberOfLines={2}>{item.description}</Text>
                <Text className="text-[13px] font-bold text-primary mt-1">₦{item.price.toLocaleString()}</Text>
              </View>

              <View className="flex-row items-center gap-2">
                <TouchableOpacity className="bg-primary py-1.5 px-3.5 rounded-full" onPress={() => handleAddToCart(item.id)}>
                  <Text className="text-white text-[13px] font-semibold"> + </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 justify-center items-center"
                  onPress={() => toggleFavorite(storefrontId, item)}
                  activeOpacity={0.75}
                  accessibilityLabel="Remove from favorites"
                >
                  <Heart size={16} color="#EF4444" fill="#EF4444" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
