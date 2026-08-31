import React, { useCallback, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react-native';
import StatusBadge from '../../components/StatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import { getOrderById, type OrderResponse } from '../../api';
import { playStatusChangeSound } from '../../utils/audioAlert';
import type { NavigationProp, RouteProps } from '../../types';

interface Props {
  navigation: NavigationProp<'OrderReceiptTracker'>;
  route: RouteProps<'OrderReceiptTracker'>;
}

// Statuses that mean "the order is settled" — stop polling once reached. CONFIRMED is
// deliberately NOT terminal: the lifecycle is PENDING -> CONFIRMED -> COMPLETED, so a
// confirmed order is still in progress until the store marks it completed.
const TERMINAL_STATUSES = new Set(['REJECTED', 'CANCELLED', 'COMPLETED']);
const POLL_INTERVAL_MS = 5000;

function parseItems(raw: string): { id: string; name: string; qty: number; price: number }[] {
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export default function OrderReceiptTrackerScreen({ navigation, route }: Props) {
  const { orderId, slug, storefrontId } = route.params;
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      const data = await getOrderById(storefrontId, orderId);
      if (lastStatusRef.current && lastStatusRef.current !== data.status) {
        playStatusChangeSound();
      }
      lastStatusRef.current = data.status;
      setOrder(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load order status.');
    } finally {
      setLoading(false);
    }
  }, [storefrontId, orderId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      fetchOrder();

      const intervalId = setInterval(() => {
        if (cancelled) return;
        if (lastStatusRef.current && TERMINAL_STATUSES.has(lastStatusRef.current)) return;
        fetchOrder();
      }, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }, [fetchOrder])
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-gray-50 gap-3">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (!order) {
    return (
      <View className="flex-1 items-center justify-center p-6 bg-gray-50 gap-3">
        <ErrorBanner message={error ?? 'Order not found.'} />
        <TouchableOpacity className="mt-2" onPress={() => navigation.navigate('Storefront', { slug })}>
          <Text className="text-primary font-bold text-sm">Back to Storefront</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const items = parseItems(order.orderItems);
  const isTerminal = TERMINAL_STATUSES.has(order.status);
  const isRejectedOrCancelled = order.status === 'REJECTED' || order.status === 'CANCELLED';

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom', 'left', 'right']}>
      <ScrollView contentContainerClassName="p-4 pb-10">
        {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

        <View className="bg-white rounded-2xl p-6 items-center mb-5 border border-gray-200 gap-2">
          {isRejectedOrCancelled ? (
            <XCircle size={48} color="#DC2626" strokeWidth={1.5} />
          ) : order.status === 'CONFIRMED' || order.status === 'COMPLETED' ? (
            <CheckCircle2 size={48} color="#059669" strokeWidth={1.5} />
          ) : (
            <Clock size={48} color="#D97706" strokeWidth={1.5} />
          )}

          <Text className="text-lg font-extrabold text-gray-900 mt-2">Order #{order.id}</Text>
          <StatusBadge status={order.status} />

          <Text className="text-sm text-gray-600 text-center mt-2 leading-5">
            {order.status === 'PENDING' && 'Waiting for the store to confirm your order.'}
            {order.status === 'CONFIRMED' && 'Your order has been confirmed and is being prepared.'}
            {order.status === 'COMPLETED' && 'Your order is complete. Enjoy!'}
            {order.status === 'REJECTED' && 'This order was rejected by the store.'}
            {order.status === 'CANCELLED' && 'This order was cancelled.'}
          </Text>

          {!isTerminal && (
            <View className="flex-row items-center gap-2 mt-3">
              <ActivityIndicator size="small" color="#9CA3AF" />
              <Text className="text-xs text-gray-400">Checking for updates…</Text>
            </View>
          )}
        </View>

        <Text className="text-base font-bold text-gray-900 mb-2.5">Order Details</Text>
        <View className="bg-white rounded-2xl p-4 mb-5 border border-gray-200">
          {items.map((item) => (
            <View key={item.id} className="flex-row justify-between items-center py-2">
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-gray-800">{item.name}</Text>
                <Text className="text-[13px] text-gray-500 mt-0.5">₦{item.price.toLocaleString()} × {item.qty}</Text>
              </View>
              <Text className="text-sm font-bold text-gray-800">₦{(item.price * item.qty).toLocaleString()}</Text>
            </View>
          ))}
          <View className="h-px bg-gray-100 my-2.5" />
          <View className="flex-row justify-between">
            <Text className="text-base font-bold text-gray-900">Total</Text>
            <Text className="text-lg font-extrabold text-primary">₦{order.total.toLocaleString()}</Text>
          </View>
          {order.tableLabel ? (
            <View className="flex-row items-center gap-1 mt-2.5">
              <MapPin size={12} color="#6B7280" strokeWidth={2.2} />
              <Text className="text-[13px] text-gray-500">{order.tableLabel}</Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          className="bg-primary rounded-xl py-4 items-center"
          onPress={() => navigation.navigate('Storefront', { slug })}
        >
          <Text className="text-white text-base font-bold">Back to Storefront</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
