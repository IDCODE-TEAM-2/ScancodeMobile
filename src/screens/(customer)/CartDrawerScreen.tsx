import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShoppingCart, Minus, Plus, X } from 'lucide-react-native';
import { useCart, EMPTY_CART } from '../../context/CartContext';
import { getStoreConfig } from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'CartDrawer'>;
  route: RouteProps<'CartDrawer'>;
}

export default function CartDrawerScreen({ navigation, route }: Props) {
  const { slug, storefrontId, name, table } = route.params;
  const { carts, updateCartQty, removeCartItem } = useCart();
  const cart = carts[storefrontId] ?? EMPTY_CART;

  const [vatRate, setVatRate] = useState(0.075);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);

  useEffect(() => {
    let isMounted = true;
    getStoreConfig(storefrontId)
      .then((config) => {
        if (!isMounted) return;
        const rawVat = config.vatRate ?? 7.5;
        setVatRate(rawVat > 1 ? rawVat / 100 : rawVat);
        setDeliveryFee(config.deliveryFee ?? 0);
      })
      .catch(() => {
        // Keep sensible defaults if config can't be loaded.
      })
      .finally(() => {
        if (isMounted) setIsLoadingConfig(false);
      });
    return () => {
      isMounted = false;
    };
  }, [storefrontId]);

  const summary = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    const appliedDelivery = subtotal > 0 ? deliveryFee : 0;
    const appliedVat = subtotal * vatRate;
    const grandTotal = subtotal + appliedDelivery + appliedVat;
    return { subtotal, appliedDelivery, appliedVat, grandTotal };
  }, [cart, vatRate, deliveryFee]);

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['bottom', 'left', 'right']}>
      {cart.length === 0 ? (
        <View className="flex-1 items-center justify-center p-8 gap-1.5">
          <ShoppingCart size={40} color="#D1D5DB" strokeWidth={1.5} />
          <Text className="text-base font-bold text-gray-800 mt-2">Your cart is empty</Text>
          <Text className="text-[13px] text-gray-500 text-center">Add items from the menu to get started.</Text>
          <TouchableOpacity
            className="mt-4 bg-primary rounded-[10px] px-5 py-3"
            onPress={() => navigation.navigate('Storefront', { slug, name, tableCode: table })}
            activeOpacity={0.8}
          >
            <Text className="text-white font-bold text-sm">Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView contentContainerClassName="p-4 pb-2" showsVerticalScrollIndicator={false}>
            {cart.map((item) => (
              <View key={item.id} className="flex-row justify-between items-center py-3 border-b border-gray-100">
                <View className="flex-1 mr-3">
                  <Text className="text-[15px] font-semibold text-gray-800">{item.name}</Text>
                  <Text className="text-[13px] text-primary font-bold mt-0.5">₦{(item.price * item.qty).toLocaleString()}</Text>
                </View>

                <View className="flex-row items-center">
                  <TouchableOpacity className="w-8 h-8 rounded-2xl bg-gray-100 justify-center items-center ml-1.5" onPress={() => updateCartQty(storefrontId, item.id, -1)}>
                    <Minus size={14} color="#1F2937" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <Text className="text-sm font-bold text-gray-800 mx-1.5 min-w-[16px] text-center">{item.qty}</Text>
                  <TouchableOpacity className="w-8 h-8 rounded-2xl bg-gray-100 justify-center items-center ml-1.5" onPress={() => updateCartQty(storefrontId, item.id, 1)}>
                    <Plus size={14} color="#1F2937" strokeWidth={2.5} />
                  </TouchableOpacity>
                  <TouchableOpacity className="w-8 h-8 rounded-2xl bg-gray-100 justify-center items-center ml-1.5" onPress={() => removeCartItem(storefrontId, item.id)}>
                    <X size={14} color="#1F2937" strokeWidth={2.5} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mt-4">
              {isLoadingConfig ? (
                <ActivityIndicator color="#059669" />
              ) : (
                <>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-sm text-gray-600">Subtotal</Text>
                    <Text className="text-sm font-medium text-gray-800">₦{summary.subtotal.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-sm text-gray-600">VAT ({(vatRate * 100).toFixed(1)}%)</Text>
                    <Text className="text-sm font-medium text-gray-800">₦{summary.appliedVat.toLocaleString()}</Text>
                  </View>
                  {summary.appliedDelivery > 0 && (
                    <View className="flex-row justify-between py-1.5">
                      <Text className="text-sm text-gray-600">Logistics / Delivery Fee</Text>
                      <Text className="text-sm font-medium text-gray-800">₦{summary.appliedDelivery.toLocaleString()}</Text>
                    </View>
                  )}
                  <View className="h-px bg-gray-200 my-2.5" />
                  <View className="flex-row justify-between py-1.5">
                    <Text className="text-base font-bold text-gray-800">Total Amount</Text>
                    <Text className="text-lg font-extrabold text-primary">₦{summary.grandTotal.toLocaleString()}</Text>
                  </View>
                </>
              )}
            </View>
          </ScrollView>

          <View className="p-4 border-t border-gray-100">
            <TouchableOpacity
              className={cn('rounded-xl py-4 items-center', isLoadingConfig ? 'bg-primary/60' : 'bg-primary')}
              disabled={isLoadingConfig}
              onPress={() =>
                navigation.navigate('Checkout', { slug, storefrontId, cart, table })
              }
            >
              <Text className="text-white text-base font-bold">Confirm & Proceed to Checkout</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
