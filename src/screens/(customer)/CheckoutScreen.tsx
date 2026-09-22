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
import {
  CheckCircle2,
  WifiOff,
  Phone,
  CreditCard,
  Copy,
  Check,
  User,
  Mail,
  BadgeCheck,
  Edit2,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createOrder,
  getMe,
  getStoreConfig,
  getStorefrontBySlug,
  getToken,
  type OrderResponse,
} from '../../api';
import { payWithPaystack } from '../../utils/paystack';
import * as Haptics from '../../utils/haptics';
import { isOffline, queueOrder } from '../../utils/offlineQueue';
import { formatMoney } from '../../utils/currency';
import type { CartItem, NavigationProp, RouteProps } from '../../types';
import { useCart } from '../../context/CartContext';
import { useAppContext } from '../../context/AppContext';
import { parseStorefrontData } from '../../utils/parseStorefrontData';
import { cn } from '../../utils/cn';

// Table/room concept only exists for these business types — a plain product or business-
// card storefront has nowhere to deliver a "table," so the field never applies to it.
const TABLE_AWARE_BUSINESS_TYPES = new Set(['RESTAURANT', 'HOTEL']);
const GUEST_CONTACT_KEY = '@scancode_customer_contact';

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
  const [vendor, setVendor] = useState<{
    name: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    phone?: string;
    businessType?: string;
    bankAccounts?: { bankName: string; accountNumber: string; accountName?: string; isPrimary?: boolean }[];
  } | null>(null);

  // Customer Contact State
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [manualTableCode, setManualTableCode] = useState('');
  // Already known (customer scanned a table's QR code) — never ask again. Otherwise, only
  // restaurant/hotel storefronts have a table/room to ask for in the first place.
  const needsTableInput = !table && TABLE_AWARE_BUSINESS_TYPES.has(vendor?.businessType ?? '');
  const tableCode = table || manualTableCode;

  const [vatRate, setVatRate] = useState(0.075);
  const [deliveryFee, setDeliveryFee] = useState(0);

  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<OrderResponse | null>(null);
  const [queuedLocally, setQueuedLocally] = useState(false);
  const [isPayingWithPaystack, setIsPayingWithPaystack] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);

  async function handleCopyAccountNumber(numberToCopy?: string) {
    if (!numberToCopy) return;
    await Clipboard.setStringAsync(numberToCopy);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  }

  async function handlePayWithPaystack() {
    if (!placedOrder) return;
    setIsPayingWithPaystack(true);
    const payerEmail = customerEmail.trim() || placedOrder.customerEmail || 'customer@scancode.ng';

    // try/finally guarantees the Pay button is always re-enabled even if payWithPaystack
    // throws or the WebView dismiss event bypasses the onCancel callback (e.g. on Android
    // back-button press before the JS bridge fires).
    try {
      await payWithPaystack({
        purpose: 'ORDER',
        payload: {
          orderId: placedOrder.id,
          amount: placedOrder.total,
          slug,
          storefrontId: storefrontId ?? placedOrder.storefrontId,
          email: payerEmail,
          customerName: customerName.trim() || placedOrder.customerName,
          customerPhone: customerPhone.trim() || placedOrder.customerPhone,
        },
        title: 'Order Payment',
        onSuccess: () => {
          setIsPayingWithPaystack(false);
          if (storefrontId) clearCart(storefrontId);
          Alert.alert('Payment Successful!', 'Your payment has been received and verified.', [
            {
              text: 'Track Order',
              onPress: () =>
                navigation.navigate('OrderReceiptTracker', {
                  orderId: placedOrder.id,
                  slug,
                  storefrontId: storefrontId ?? placedOrder.storefrontId,
                }),
            },
          ]);
        },
        onError: (msg) => {
          setIsPayingWithPaystack(false);
          Alert.alert('Payment Error', msg);
        },
        onCancel: () => {
          setIsPayingWithPaystack(false);
        },
      });
    } finally {
      // Belt-and-suspenders: ensure the button is never permanently stuck.
      setIsPayingWithPaystack(false);
    }
  }

  // Load customer profile if authenticated, or prefill guest details from device storage
  useEffect(() => {
    let isMounted = true;

    async function resolveCustomer() {
      try {
        const token = await getToken();
        if (token) {
          const me = await getMe();
          if (isMounted && me) {
            setIsSignedIn(true);
            setCustomerName(me.username || '');
            setCustomerEmail(me.email || '');
          }
        }
      } catch {
        // Guest user or unauthenticated
      }

      // Check stored contact details for returning guests or pre-filling phone
      try {
        const saved = await AsyncStorage.getItem(GUEST_CONTACT_KEY);
        if (saved && isMounted) {
          const parsed = JSON.parse(saved);
          if (parsed) {
            setCustomerName((prev) => prev || parsed.name || '');
            setCustomerEmail((prev) => prev || parsed.email || '');
            setCustomerPhone((prev) => prev || parsed.phone || '');
          }
        }
      } catch {
        // Non-blocking
      }
    }

    resolveCustomer();

    return () => {
      isMounted = false;
    };
  }, []);

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
          accountName: customData.bankAccounts?.find((a) => a.isPrimary)?.accountName
            ?? customData.bankAccounts?.[0]?.accountName,
          phone: customData.phone,
          businessType: sf.businessType,
          bankAccounts: customData.bankAccounts,
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
  const vat = Number((subtotal * vatRate).toFixed(2));
  const total = subtotal + vat + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Cart', 'Your cart has no items.');
      return;
    }
    if (!storefrontId) {
      Alert.alert('Storefront Missing', 'Could not resolve the storefront identifier.');
      return;
    }

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      Alert.alert('Name Required', 'Please enter your full name for the order.');
      return;
    }

    const trimmedEmail = customerEmail.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      Alert.alert('Valid Email Required', 'Please enter a valid email address to receive your payment receipt.');
      return;
    }

    const trimmedPhone = customerPhone.trim();
    if (!trimmedPhone || trimmedPhone.length < 7) {
      Alert.alert('Phone Required', 'Please enter a valid phone number so the vendor can reach you.');
      return;
    }

    if (needsTableInput && !manualTableCode.trim()) {
      Alert.alert(
        vendor?.businessType === 'HOTEL' ? 'Room Code Required' : 'Table Code Required',
        `Please enter your ${vendor?.businessType === 'HOTEL' ? 'room' : 'table'} code so staff know where to bring your order.`
      );
      return;
    }

    // Persist customer contact details for returning guests
    AsyncStorage.setItem(
      GUEST_CONTACT_KEY,
      JSON.stringify({
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
      })
    ).catch(() => {});

    const body = {
      customerName: trimmedName,
      customerEmail: trimmedEmail,
      customerPhone: trimmedPhone,
      tableCode: tableCode.trim() || undefined,
      notes: orderNotes.trim() || undefined,
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
      Haptics.notifySuccess();
      setPlacedOrder(order);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete order.';
      Alert.alert('Order Failed', msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const primaryAccount =
    vendor?.bankAccounts?.find((a) => a.isPrimary) ?? vendor?.bankAccounts?.[0];
  const bankName = primaryAccount?.bankName || vendor?.bankName;
  const accountNumber = primaryAccount?.accountNumber || vendor?.accountNumber;
  const accountName = primaryAccount?.accountName || vendor?.accountName || vendor?.name;
  const hasBankDetails = Boolean(bankName && accountNumber);

  function leaveAfterPlacedOrder(next: () => void) {
    if (storefrontId) clearCart(storefrontId);
    next();
  }

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
                <Text className="font-bold text-primary">{formatMoney(total)}</Text> has been saved on
                this device and will be sent automatically as soon as you're back online.
              </Text>

              <TouchableOpacity
                className="rounded-xl py-3 items-center mt-2 self-stretch border-[1.5px] border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
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
              <Text className="text-sm text-gray-600 dark:text-zinc-400 text-center mb-4">
                Your order code is registered as <Text className="font-bold text-amber-600 dark:text-amber-400">PENDING PAYMENT</Text>
              </Text>

              <View className="bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl px-5 py-3 mb-4 items-center border border-emerald-100 dark:border-emerald-900">
                <Text className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 tracking-wide">YOUR ORDER CODE</Text>
                <Text className="text-2xl font-extrabold text-emerald-800 dark:text-emerald-300">#{placedOrder.id}</Text>
              </View>

              {/* Order recipient confirmation card */}
              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-3.5 mb-4 border border-gray-200 dark:border-zinc-800 w-full shadow-sm gap-1.5">
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-gray-500 dark:text-zinc-400">Recipient:</Text>
                  <Text className="text-xs font-bold text-gray-800 dark:text-zinc-200">
                    {placedOrder.customerName || customerName}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-gray-500 dark:text-zinc-400">Contact:</Text>
                  <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    {placedOrder.customerPhone || customerPhone}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center">
                  <Text className="text-xs text-gray-500 dark:text-zinc-400">Receipt Email:</Text>
                  <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                    {placedOrder.customerEmail || customerEmail}
                  </Text>
                </View>
                {tableCode ? (
                  <View className="flex-row justify-between items-center">
                    <Text className="text-xs text-gray-500 dark:text-zinc-400">
                      {vendor?.businessType === 'HOTEL' ? 'Room:' : 'Table:'}
                    </Text>
                    <Text className="text-xs font-bold text-primary">{tableCode}</Text>
                  </View>
                ) : null}
              </View>

              {vendor?.phone ? (
                <View className="flex-row items-center gap-2 bg-white dark:bg-[#18181B] rounded-2xl p-3.5 mb-4 border border-gray-200 dark:border-zinc-800 w-full shadow-sm">
                  <Phone size={18} color="#374151" strokeWidth={2} />
                  <View className="flex-1">
                    <Text className="text-[12px] text-gray-500 dark:text-zinc-400">
                      {vendor.businessType === 'HOTEL'
                        ? 'Front desk contact'
                        : vendor.businessType === 'RESTAURANT'
                        ? 'Restaurant / waiter contact'
                        : 'Contact'}
                    </Text>
                    <Text className="text-sm font-bold text-gray-900 dark:text-white">{vendor.phone}</Text>
                  </View>
                </View>
              ) : null}

              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 w-full shadow-sm">
                <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center">Payment Due</Text>
                <Text className="text-[28px] font-extrabold text-primary text-center mt-1">
                  {formatMoney(placedOrder.total)}
                </Text>

                <View className="h-px bg-gray-100 dark:bg-zinc-700 my-3" />

                {/* Primary Online Payment with Paystack */}
                <TouchableOpacity
                  className={cn(
                    'bg-emerald-600 rounded-xl py-3.5 px-4 items-center self-stretch flex-row justify-center gap-2 shadow-sm',
                    isPayingWithPaystack && 'opacity-70',
                  )}
                  onPress={handlePayWithPaystack}
                  disabled={isPayingWithPaystack}
                  activeOpacity={0.85}
                >
                  {isPayingWithPaystack ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <CreditCard size={18} color="#FFFFFF" strokeWidth={2.5} />
                      <Text className="text-white text-[15px] font-bold">
                        Pay {formatMoney(placedOrder.total)} with Paystack
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* Or Divider */}
                <View className="flex-row items-center gap-2 my-3 self-stretch">
                  <View className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                  <Text className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase">
                    Or Transfer to Store Bank
                  </Text>
                  <View className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                </View>

                {hasBankDetails ? (
                  <View className="bg-gray-100 dark:bg-zinc-800 rounded-xl p-3 gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-[13px] text-gray-500 dark:text-zinc-400">Bank Name:</Text>
                      <Text className="text-[13px] font-semibold text-gray-800 dark:text-zinc-200">{bankName}</Text>
                    </View>
                    <View className="flex-row justify-between items-center">
                      <Text className="text-[13px] text-gray-500 dark:text-zinc-400">Account Number:</Text>
                      <TouchableOpacity
                        onPress={() => handleCopyAccountNumber(accountNumber)}
                        className="flex-row items-center gap-1.5 py-1 px-2 rounded-lg bg-gray-200/70 dark:bg-zinc-700/60"
                        activeOpacity={0.7}
                      >
                        <Text className="text-sm font-extrabold text-gray-900 dark:text-white font-mono">{accountNumber}</Text>
                        {copiedAccount ? (
                          <View className="flex-row items-center gap-1 bg-emerald-600 px-1.5 py-0.5 rounded">
                            <Check size={10} color="#FFFFFF" strokeWidth={3} />
                            <Text className="text-[10px] text-white font-bold">Copied</Text>
                          </View>
                        ) : (
                          <Copy size={13} color="#6B7280" strokeWidth={2} />
                        )}
                      </TouchableOpacity>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-[13px] text-gray-500 dark:text-zinc-400">Account Name:</Text>
                      <Text className="text-[13px] font-semibold text-gray-800 dark:text-zinc-200">{accountName}</Text>
                    </View>
                  </View>
                ) : (
                  <Text className="text-xs text-gray-500 dark:text-zinc-400 text-center">
                    This store has not published bank transfer details. Pay online with Paystack.
                  </Text>
                )}
              </View>

              <TouchableOpacity
                className="bg-primary rounded-xl py-3 items-center mt-2 self-stretch"
                onPress={() =>
                  leaveAfterPlacedOrder(() =>
                    navigation.navigate('OrderReceiptTracker', {
                      orderId: placedOrder.id,
                      slug,
                      storefrontId: storefrontId ?? placedOrder.storefrontId,
                    }),
                  )
                }
              >
                <Text className="text-white text-base font-bold">Track Order Status</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="rounded-xl py-3.5 items-center mt-2.5 self-stretch border-[1.5px] border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800"
                onPress={() => leaveAfterPlacedOrder(() => navigation.navigate('Storefront', { slug }))}
              >
                <Text className="text-gray-600 dark:text-zinc-200 text-[15px] font-semibold">Return to Storefront</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <Text className="text-base font-bold text-gray-900 dark:text-white mb-2.5 mt-2">Order Summary</Text>

              {/* Order Items & Breakdown */}
              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
                {cart.map((item) => (
                  <View key={item.id} className="flex-row justify-between items-center py-2">
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-gray-800 dark:text-zinc-100">{item.name}</Text>
                      <Text className="text-[13px] text-gray-500 dark:text-zinc-400 mt-0.5">
                        {formatMoney(item.price)} × {item.qty}
                      </Text>
                    </View>
                    <Text className="text-sm font-bold text-gray-800 dark:text-zinc-200">
                      {formatMoney(item.price * item.qty)}
                    </Text>
                  </View>
                ))}

                <View className="h-px bg-gray-100 dark:bg-zinc-700 my-2.5" />

                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-600 dark:text-zinc-400">Subtotal</Text>
                  <Text className="text-sm font-medium text-gray-800 dark:text-zinc-200">{formatMoney(subtotal)}</Text>
                </View>
                <View className="flex-row justify-between py-1">
                  <Text className="text-sm text-gray-600 dark:text-zinc-400">VAT ({(vatRate * 100).toFixed(1)}%)</Text>
                  <Text className="text-sm font-medium text-gray-800 dark:text-zinc-200">{formatMoney(vat)}</Text>
                </View>
                {deliveryFee > 0 && (
                  <View className="flex-row justify-between py-1">
                    <Text className="text-sm text-gray-600 dark:text-zinc-400">Delivery Fee</Text>
                    <Text className="text-sm font-medium text-gray-800 dark:text-zinc-200">{formatMoney(deliveryFee)}</Text>
                  </View>
                )}

                <View className="h-px bg-gray-100 dark:bg-zinc-700 my-2.5" />

                <View className="flex-row justify-between py-1">
                  <Text className="text-base font-bold text-gray-900 dark:text-white">Total</Text>
                  <Text className="text-lg font-extrabold text-primary">{formatMoney(total)}</Text>
                </View>
              </View>

              {/* Customer Contact Details */}
              <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
                <View className="flex-row items-center justify-between mb-3">
                  <View className="flex-row items-center gap-2">
                    <User size={18} color={isDark ? '#E4E4E7' : '#1F2937'} strokeWidth={2.2} />
                    <Text className="text-base font-bold text-gray-900 dark:text-white">
                      {isSignedIn && !isEditingDetails ? 'Customer Account' : 'Your Details'}
                    </Text>
                  </View>
                  {isSignedIn && (
                    <TouchableOpacity
                      onPress={() => setIsEditingDetails(!isEditingDetails)}
                      className="flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-zinc-800"
                      activeOpacity={0.7}
                    >
                      <Edit2 size={12} color={isDark ? '#A1A1AA' : '#4B5563'} />
                      <Text className="text-[11px] font-semibold text-gray-600 dark:text-zinc-300">
                        {isEditingDetails ? 'Cancel Edit' : 'Edit Details'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {isSignedIn && !isEditingDetails ? (
                  <View className="gap-2.5">
                    <View className="flex-row items-center justify-between bg-emerald-50 dark:bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-800/50">
                      <View className="flex-row items-center gap-2">
                        <BadgeCheck size={18} color="#059669" strokeWidth={2.2} />
                        <Text className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          Signed in as {customerName || 'Customer'}
                        </Text>
                      </View>
                      <Text className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">Verified</Text>
                    </View>

                    <View className="flex-row items-center gap-2 py-1">
                      <Mail size={15} color={isDark ? '#71717A' : '#9CA3AF'} />
                      <Text className="text-sm text-gray-700 dark:text-zinc-300">{customerEmail || 'No email associated'}</Text>
                    </View>

                    <View>
                      <Text className="text-[12px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                        Phone Number *
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        placeholder="e.g. 08012345678"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        keyboardType="phone-pad"
                        editable={!isSubmitting}
                      />
                    </View>

                    <View>
                      <Text className="text-[12px] font-semibold text-gray-600 dark:text-zinc-400 mb-1">
                        Special Instructions / Notes (Optional)
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                        value={orderNotes}
                        onChangeText={setOrderNotes}
                        placeholder="e.g. Less spicy, call on arrival..."
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        multiline
                        numberOfLines={2}
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>
                ) : (
                  <View className="gap-3">
                    <Text className="text-xs text-gray-500 dark:text-zinc-400">
                      Please provide your contact details for order tracking and your payment receipt.
                    </Text>

                    <View>
                      <Text className="text-[12px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Full Name *
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                        value={customerName}
                        onChangeText={setCustomerName}
                        placeholder="e.g. Jane Doe"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        autoCapitalize="words"
                        editable={!isSubmitting}
                      />
                    </View>

                    <View>
                      <Text className="text-[12px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Email Address (for payment receipt) *
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                        value={customerEmail}
                        onChangeText={setCustomerEmail}
                        placeholder="e.g. jane@example.com"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        editable={!isSubmitting}
                      />
                    </View>

                    <View>
                      <Text className="text-[12px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Phone Number *
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                        value={customerPhone}
                        onChangeText={setCustomerPhone}
                        placeholder="e.g. 08012345678"
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        keyboardType="phone-pad"
                        editable={!isSubmitting}
                      />
                    </View>

                    <View>
                      <Text className="text-[12px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                        Special Instructions / Notes (Optional)
                      </Text>
                      <TextInput
                        className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                        value={orderNotes}
                        onChangeText={setOrderNotes}
                        placeholder="e.g. Extra napkins, no pepper..."
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        multiline
                        numberOfLines={2}
                        editable={!isSubmitting}
                      />
                    </View>
                  </View>
                )}
              </View>

              {needsTableInput && (
                <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800 shadow-sm">
                  <Text className="text-[13px] font-semibold text-gray-700 dark:text-zinc-300 mb-1">
                    {vendor?.businessType === 'HOTEL' ? 'Room Code' : 'Table Code'} *
                  </Text>
                  <TextInput
                    className="border border-gray-300 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 dark:text-zinc-100 bg-gray-50 dark:bg-zinc-900"
                    value={manualTableCode}
                    onChangeText={setManualTableCode}
                    placeholder={vendor?.businessType === 'HOTEL' ? 'e.g. Room 204' : 'e.g. T-04'}
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    editable={!isSubmitting}
                  />
                </View>
              )}

              <TouchableOpacity
                className={cn('bg-primary rounded-xl py-3.5 items-center mt-2 self-stretch', isSubmitting && 'opacity-60')}
                onPress={handlePlaceOrder}
                disabled={isSubmitting || isLoadingConfig}
                activeOpacity={0.8}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-bold">Confirm & Pay {formatMoney(total)}</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
