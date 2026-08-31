import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCircle2 } from 'lucide-react-native';
import { createOrder, getStoreConfig, getStorefrontBySlug, type OrderResponse } from '../../api';
import type { CartItem, NavigationProp, RouteProps } from '../../types';
import { useCart } from '../../context/CartContext';
import { parseStorefrontData } from '../../utils/parseStorefrontData';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'Checkout'>;
  route: RouteProps<'Checkout'>;
}

export default function CheckoutScreen({ navigation, route }: Props) {
  const { slug, storefrontId: initialStorefrontId, cart: initialCart, table } = route.params;
  const { clearCart } = useCart();

  const [cart] = useState<CartItem[]>(initialCart || []);
  const [storefrontId, setStorefrontId] = useState<number | null>(initialStorefrontId || null);
  const [vendor, setVendor] = useState<{ name: string; bankName?: string; accountNumber?: string } | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [tableCode, setTableCode] = useState(table || '');

  const [vatRate, setVatRate] = useState(0.075);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadStorefrontData() {
      try {
        setIsLoadingConfig(true);

        const sf = await getStorefrontBySlug(slug);
        if (!isMounted) return;

        const activeStoreId = storefrontId ?? sf.id;
        if (!storefrontId) setStorefrontId(sf.id);
        const customData = parseStorefrontData(sf.data);
        setVendor({
          name: sf.name,
          bankName: customData.bankName,
          accountNumber: customData.accountNumber,
        });

        const config = await getStoreConfig(activeStoreId).catch(() => null);
        if (isMounted && config) {
          // vatRate's canonical form is a fraction, but normalize defensively —
          // see the comment on StoreConfigResponse in api.ts.
          const rawVat = config.vatRate ?? 7.5;
          setVatRate(rawVat > 1 ? rawVat / 100 : rawVat);
          setDeliveryFee(config.deliveryFee ?? 0);
        }
      } catch (err) {
        // Fall back to defaults
      } finally {
        if (isMounted) setIsLoadingConfig(false);
      }
    }

    loadStorefrontData();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const vat = Math.round(subtotal * vatRate);
  const total = subtotal + vat + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Your cart has no items.');
      return;
    }
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Required Fields', 'Please enter your name and phone number.');
      return;
    }

    if (!storefrontId) {
      Alert.alert('Error', 'Storefront ID not available. Please try again.');
      return;
    }

    try {
      setIsSubmitting(true);
      const order = await createOrder(storefrontId, {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        items: cart.map((i) => ({ id: i.id, name: i.name, qty: i.qty, price: i.price })),
        subtotal,
        vat,
        delivery: deliveryFee,
        total,
        tableCode: tableCode.trim() || undefined,
      });

      setPlacedOrder(order);
      clearCart(storefrontId);
    } catch (err: unknown) {
      Alert.alert(
        'Order Failed',
        err instanceof Error ? err.message : 'Could not place order. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const bankName = vendor?.bankName || 'Access Bank PLC';
  const accountNumber = vendor?.accountNumber || '0123456789';
  const accountName = vendor?.name || 'Store Management';

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="p-4 pb-10">
          {placedOrder ? (
            <View className="items-center py-6">
              <View className="w-16 h-16 rounded-full bg-emerald-100 justify-center items-center mb-4">
                <CheckCircle2 size={34} color="#059669" strokeWidth={2} />
              </View>
              <Text className="text-[22px] font-extrabold text-gray-900 text-center mb-1.5">Order Placed Successfully!</Text>
              <Text className="text-sm text-gray-600 text-center mb-6">
                Order #{placedOrder.id} is registered as <Text className="font-bold text-amber-600">PENDING PAYMENT</Text>
              </Text>

              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200 w-full">
                <Text className="text-sm text-gray-500 text-center">Payment Due</Text>
                <Text className="text-[28px] font-extrabold text-primary text-center mt-1">₦{placedOrder.total.toLocaleString()}</Text>

                <View className="h-px bg-gray-100 my-2.5" />

                <Text className="text-[13px] text-gray-600 mb-3 leading-[18px]">
                  Please transfer the exact total amount to the store account below:
                </Text>

                <View className="bg-gray-100 rounded-[10px] p-3 gap-1.5">
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-gray-500">Bank Name:</Text>
                    <Text className="text-[13px] font-semibold text-gray-800">{bankName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-gray-500">Account Number:</Text>
                    <Text className="text-sm font-extrabold text-gray-900">{accountNumber}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-gray-500">Account Name:</Text>
                    <Text className="text-[13px] font-semibold text-gray-800">{accountName}</Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                className="bg-primary rounded-xl py-4 items-center mt-2 self-stretch"
                onPress={() =>
                  navigation.navigate('OrderReceiptTracker', {
                    orderId: placedOrder.id,
                    slug,
                    storefrontId: storefrontId ?? placedOrder.storefrontId,
                  })
                }
              >
                <Text className="text-white text-base font-bold">Track Order Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-xl py-3.5 items-center mt-2.5 self-stretch border-[1.5px] border-gray-300"
                onPress={() => navigation.navigate('Storefront', { slug })}
              >
                <Text className="text-gray-600 text-[15px] font-semibold">Return to Storefront</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-base font-bold text-gray-900 mb-2.5 mt-2">Order Summary</Text>

              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                {cart.map((item) => (
                  <View key={item.id} className="flex-row justify-between items-center py-2">
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-800">{item.name}</Text>
                      <Text className="text-[13px] text-gray-500 mt-0.5">₦{item.price.toLocaleString()} × {item.qty}</Text>
                    </View>
                    <Text className="text-sm font-bold text-gray-800">₦{(item.price * item.qty).toLocaleString()}</Text>
                  </View>
                ))}

                <View className="h-px bg-gray-100 my-2.5" />

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-600">Subtotal</Text>
                  <Text className="text-sm font-medium text-gray-800">₦{subtotal.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-600">VAT ({(vatRate * 100).toFixed(1)}%)</Text>
                  <Text className="text-sm font-medium text-gray-800">₦{vat.toLocaleString()}</Text>
                </View>
                {deliveryFee > 0 && (
                  <View className="flex-row justify-between py-1">
                    <Text className="text-sm text-gray-600">Delivery Fee</Text>
                    <Text className="text-sm font-medium text-gray-800">₦{deliveryFee.toLocaleString()}</Text>
                  </View>
                )}

                <View className="h-px bg-gray-100 my-2.5" />

                <View className="flex-row justify-between py-1">
                  <Text className="text-base font-bold text-gray-900">Total</Text>
                  <Text className="text-lg font-extrabold text-primary">₦{total.toLocaleString()}</Text>
                </View>
              </View>

              <Text className="text-base font-bold text-gray-900 mb-2.5 mt-2">Customer Details</Text>

              <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
                <Text className="text-[13px] font-semibold text-gray-700 mb-1 mt-2">Full Name *</Text>
                <TextInput
                  className="border border-gray-300 rounded-[10px] px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor="#9CA3AF"
                  editable={!isSubmitting}
                />

                <Text className="text-[13px] font-semibold text-gray-700 mb-1 mt-2">Phone Number *</Text>
                <TextInput
                  className="border border-gray-300 rounded-[10px] px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. 08012345678"
                  placeholderTextColor="#9CA3AF"
                  editable={!isSubmitting}
                />

                <Text className="text-[13px] font-semibold text-gray-700 mb-1 mt-2">Email Address (Optional)</Text>
                <TextInput
                  className="border border-gray-300 rounded-[10px] px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor="#9CA3AF"
                  editable={!isSubmitting}
                />

                <Text className="text-[13px] font-semibold text-gray-700 mb-1 mt-2">Table / Room Code (Optional)</Text>
                <TextInput
                  className="border border-gray-300 rounded-[10px] px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
                  value={tableCode}
                  onChangeText={setTableCode}
                  placeholder="e.g. T-04"
                  placeholderTextColor="#9CA3AF"
                  editable={!isSubmitting}
                />
              </View>

              <TouchableOpacity
                className={cn('bg-primary rounded-xl py-4 items-center mt-2 self-stretch', isSubmitting && 'opacity-60')}
                onPress={handlePlaceOrder}
                disabled={isSubmitting || isLoadingConfig}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-bold">Confirm & Pay ₦{total.toLocaleString()}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
