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
import { CheckCircle2, WifiOff } from 'lucide-react-native';
import { createOrder, getStoreConfig, getStorefrontBySlug, type OrderResponse } from '../../api';
import * as Haptics from '../../utils/haptics';
import { isOffline, queueOrder } from '../../utils/offlineQueue';
import type { CartItem, NavigationProp, RouteProps } from '../../types';
import { useCart } from '../../context/CartContext';
import { useAppContext } from '../../context/AppContext';
import { parseStorefrontData } from '../../utils/parseStorefrontData';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'Checkout'>;
  route: RouteProps<'Checkout'>;
}

export default function CheckoutScreen({ navigation, route }: Props) {
  const { slug, storefrontId: initialStorefrontId, cart: initialCart, table } = route.params;
  const { clearCart } = useCart();
  const { isDark } = useAppContext();

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
  const [queuedLocally, setQueuedLocally] = useState(false);

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
          const rawVat = config.vatRate ?? 7.5;
          setVatRate(rawVat > 1 ? rawVat / 100 : rawVat);
          setDeliveryFee(config.deliveryFee ?? 0);
        }
      } catch {
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
      Alert.alert('Storefront Missing', 'Could not resolve the storefront identifier.');
      return;
    }

    const body = {
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerEmail: customerEmail.trim() || undefined,
      tableCode: tableCode.trim() || undefined,
      items: cart.map((i) => ({
        id: String(i.id),
        name: i.name,
        qty: i.qty,
        price: i.price,
      })),
      subtotal,
      vat,
      delivery: deliveryFee,
      total,
    };

    setIsSubmitting(true);

    const offline = await isOffline();
    if (offline) {
      try {
        await queueOrder(storefrontId, body);
        clearCart(storefrontId);
        Haptics.notifySuccess();
        setQueuedLocally(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Could not queue order offline.';
        Alert.alert('Offline Save Failed', msg);
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    try {
      const order = await createOrder(storefrontId, body);
      clearCart(storefrontId);
      Haptics.notifySuccess();
      setPlacedOrder(order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete order.';
      Alert.alert('Order Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const bankName = vendor?.bankName || 'GTBank PLC';
  const accountNumber = vendor?.accountNumber || '0123456789';
  const accountName = vendor?.name || 'Store Management';

  return (
    <SafeAreaView className="flex-1 bg-gray-50 dark:bg-[#09090B]">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="p-4 pb-10">
          {queuedLocally ? (
            <View className="items-center py-6">
              <View className="w-16 h-16 rounded-full bg-amber-100 dark:bg-amber-950/60 justify-center items-center mb-4">
                <WifiOff size={30} color="#D97706" strokeWidth={2} />
              </View>
              <Text className="text-[22px] font-extrabold text-gray-900 dark:text-white text-center mb-1.5">Order Queued</Text>
              <Text className="text-sm text-gray-600 dark:text-zinc-400 text-center mb-6 leading-5">
                No internet connection right now. Your order for{' '}
                <Text className="font-bold text-primary">₦{total.toLocaleString()}</Text> has been saved on
                this device and will be sent automatically as soon as you're back online.
              </Text>

              <TouchableOpacity
                className="rounded-xl py-4 items-center mt-2 self-stretch border-[1.5px] border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                onPress={() => navigation.navigate('Storefront', { slug })}
              >
                <Text className="text-gray-600 dark:text-zinc-200 text-[15px] font-semibold">Return to Storefront</Text>
              </TouchableOpacity>
            </View>
          ) : placedOrder ? (
            <View className="items-center py-6">
              <View className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 justify-center items-center mb-4">
                <CheckCircle2 size={34} color="#059669" strokeWidth={2} />
              </View>
              <Text className="text-[22px] font-extrabold text-gray-900 dark:text-white text-center mb-1.5">Order Placed Successfully!</Text>
              <Text className="text-sm text-gray-600 dark:text-zinc-400 text-center mb-6">
                Order #{placedOrder.id} is registered as <Text className="font-bold text-amber-600 dark:text-amber-400">PENDING PAYMENT</Text>
              </Text>

              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 w-full shadow-sm">
                <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center">Payment Due</Text>
                <Text className="text-[28px] font-extrabold text-primary text-center mt-1">₦{placedOrder.total.toLocaleString()}</Text>

                <View className="h-px bg-gray-100 dark:bg-zinc-700 my-2.5" />

                <Text className="text-[13px] text-gray-600 dark:text-zinc-300 mb-3 leading-[18px]">
                  Please transfer the exact total amount to the store account below:
                </Text>

                <View className="bg-gray-100 dark:bg-zinc-800 rounded-xl p-3 gap-1.5">
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-gray-500 dark:text-zinc-400">Bank Name:</Text>
                    <Text className="text-[13px] font-semibold text-gray-800 dark:text-zinc-200">{bankName}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-gray-500 dark:text-zinc-400">Account Number:</Text>
                    <Text className="text-sm font-extrabold text-gray-900 dark:text-white">{accountNumber}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-[13px] text-gray-500 dark:text-zinc-400">Account Name:</Text>
                    <Text className="text-[13px] font-semibold text-gray-800 dark:text-zinc-200">{accountName}</Text>
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
                className="rounded-xl py-3.5 items-center mt-2.5 self-stretch border-[1.5px] border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                onPress={() => navigation.navigate('Storefront', { slug })}
              >
                <Text className="text-gray-600 dark:text-zinc-200 text-[15px] font-semibold">Return to Storefront</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-2.5 mt-2">Order Summary</Text>

              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
                {cart.map((item) => (
                  <View key={item.id} className="flex-row justify-between items-center py-2">
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-800 dark:text-zinc-100">{item.name}</Text>
                      <Text className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">₦{item.price.toLocaleString()} × {item.qty}</Text>
                    </View>
                    <Text className="text-sm font-bold text-gray-800 dark:text-zinc-200">₦{(item.price * item.qty).toLocaleString()}</Text>
                  </View>
                ))}

                <View className="h-px bg-gray-100 dark:bg-zinc-700 my-2.5" />

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-600 dark:text-zinc-400">Subtotal</Text>
                  <Text className="text-sm font-medium text-gray-800 dark:text-zinc-200">₦{subtotal.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-600 dark:text-zinc-400">VAT ({(vatRate * 100).toFixed(1)}%)</Text>
                  <Text className="text-sm font-medium text-gray-800 dark:text-zinc-200">₦{vat.toLocaleString()}</Text>
                </View>
                {deliveryFee > 0 && (
                  <View className="flex-row justify-between py-1">
                    <Text className="text-sm text-gray-600 dark:text-zinc-400">Delivery Fee</Text>
                    <Text className="text-sm font-medium text-gray-800 dark:text-zinc-200">₦{deliveryFee.toLocaleString()}</Text>
                  </View>
                )}

                <View className="h-px bg-gray-100 dark:bg-zinc-700 my-2.5" />

                <View className="flex-row justify-between py-1">
                  <Text className="text-base font-bold text-gray-900 dark:text-white">Total</Text>
                  <Text className="text-lg font-extrabold text-primary">₦{total.toLocaleString()}</Text>
                </View>
              </View>

              <Text className="text-base font-bold text-gray-900 dark:text-white mb-2.5 mt-2">Customer Details</Text>

              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
                <Text className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 mb-1 mt-2">Full Name *</Text>
                <TextInput
                  className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="e.g. John Doe"
                  placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                  editable={!isSubmitting}
                />

                <Text className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 mb-1 mt-2">Phone Number *</Text>
                <TextInput
                  className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                  value={customerPhone}
                  onChangeText={setCustomerPhone}
                  keyboardType="phone-pad"
                  placeholder="e.g. 08012345678"
                  placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                  editable={!isSubmitting}
                />

                <Text className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 mb-1 mt-2">Email Address (Optional)</Text>
                <TextInput
                  className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                  value={customerEmail}
                  onChangeText={setCustomerEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  placeholder="you@example.com"
                  placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                  editable={!isSubmitting}
                />

                <Text className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 mb-1 mt-2">Table / Room Code (Optional)</Text>
                <TextInput
                  className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                  value={tableCode}
                  onChangeText={setTableCode}
                  placeholder="e.g. T-04"
                  placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
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
