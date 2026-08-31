import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { MapPin, ShoppingBag, Bell, Zap, Volume2, VolumeX, Music2, Check } from 'lucide-react-native';
import type { NavigationProp, RouteProps } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import { playOrderAlarmSound, playStatusChangeSound, getCustomAlarmUri, setCustomAlarmUri, initAudioAlert } from '../../utils/audioAlert';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { getOrders, updateOrderStatus, type OrderResponse } from '../../api';
import { cn } from '../../utils/cn';

export interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  options?: string;
}

export interface LiveOrder {
  id: number;
  orderNumber: string;
  tableNumber?: string;
  customerName?: string;
  totalAmount: number;
  // Real backend orders can carry statuses (e.g. PREPARING, COMPLETED) beyond
  // the four this screen's UI actively manages — kept as `string` so we don't
  // drop/mis-map data we don't have an action for yet.
  status: string;
  createdAt: string;
  items: OrderItem[];
}

interface Props {
  navigation: NavigationProp<'LiveOrdersManager'>;
  route: RouteProps<'LiveOrdersManager'>;
}

function parseOrderItems(raw: string): OrderItem[] {
  try {
    const parsed = JSON.parse(raw) as { id: string; name: string; qty: number; price: number }[];
    return parsed.map((item, idx) => ({
      id: Number(item.id) || idx,
      name: item.name,
      quantity: item.qty,
      price: item.price,
    }));
  } catch {
    return [];
  }
}

function mapOrder(order: OrderResponse): LiveOrder {
  return {
    id: order.id,
    orderNumber: `ORD-${order.id}`,
    tableNumber: order.tableLabel ?? order.tableCode ?? undefined,
    customerName: order.customerName,
    totalAmount: order.total,
    status: order.status,
    createdAt: new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    items: parseOrderItems(order.orderItems),
  };
}

export default function LiveOrdersManagerScreen({ route }: Props) {
  const storefrontName = route.params?.name || 'Storefront';
  const storefrontId = route.params?.storefrontId;
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customToneUri, setCustomToneUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load persisted custom alarm tone on mount
  useEffect(() => {
    initAudioAlert().then(() => {
      setCustomToneUri(getCustomAlarmUri());
    });
  }, []);

  async function handlePickCustomTone() {
    try {
      // Attempt to use expo-document-picker if available
      let DocumentPicker: any = null;
      try {
        DocumentPicker = require('expo-document-picker');
      } catch {
        Alert.alert(
          'Not Available',
          'expo-document-picker is required to pick a custom tone. Run: expo install expo-document-picker',
        );
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const asset = result.assets[0];
      const uri = asset.uri;
      await setCustomAlarmUri(uri);
      setCustomToneUri(uri);

      const fileName = asset.name || uri.split('/').pop() || 'custom tone';
      Alert.alert('Custom Tone Set', `"${fileName}" will be used for new order alarms.`);
    } catch (err) {
      Alert.alert('Error', 'Failed to pick audio file. Please try again.');
    }
  }

  async function handleClearCustomTone() {
    await setCustomAlarmUri(null);
    setCustomToneUri(null);
    Alert.alert('Tone Cleared', 'Order alarms will now use the default synthesized tone.');
  }

  function handleSoundToggle() {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    if (nextState) {
      playOrderAlarmSound();
    }
  }

  function handleTriggerTestOrder() {
    if (soundEnabled) {
      playOrderAlarmSound();
    }
    const newId = Date.now();
    const newOrder: LiveOrder = {
      id: newId,
      orderNumber: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      tableNumber: `Table ${Math.floor(1 + Math.random() * 15)}`,
      customerName: 'Incoming Guest',
      totalAmount: 12500,
      status: 'PENDING',
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      items: [
        { id: newId + 1, name: 'Chef BBQ Ribs', quantity: 1, price: 9500 },
        { id: newId + 2, name: 'Fresh Iced Tea', quantity: 2, price: 1500 },
      ],
    };
    setOrders((prev) => [newOrder, ...prev]);
  }

  const fetchOrders = useCallback(async (isRefresh = false) => {
    if (!storefrontId) {
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getOrders(storefrontId);
      setOrders(data.map(mapOrder));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not load orders.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storefrontId]);

  useFocusRefresh(fetchOrders);

  function handleUpdateStatus(orderId: number, newStatus: 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED') {
    const actionLabel =
      newStatus === 'CONFIRMED' ? 'Confirm' :
      newStatus === 'COMPLETED' ? 'Complete' :
      newStatus === 'REJECTED' ? 'Reject' : 'Cancel';

    Alert.alert(
      `${actionLabel} Order`,
      `Are you sure you want to change order #${orderId} to ${newStatus}?`,
      [
        { text: 'Back', style: 'cancel' },
        {
          text: actionLabel,
          style: newStatus === 'CONFIRMED' || newStatus === 'COMPLETED' ? 'default' : 'destructive',
          onPress: async () => {
            try {
              if (storefrontId) {
                await updateOrderStatus(storefrontId, orderId, newStatus);
              }
              if (soundEnabled) {
                playStatusChangeSound();
              }
              setOrders((prev) =>
                prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
              );
            } catch {
              Alert.alert('Error', 'Failed to update order status. Please try again.');
            }
          },
        },
      ]
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  function renderOrderCard({ item }: { item: LiveOrder }) {
    const isPending = item.status === 'PENDING';

    return (
      <View className={cn('bg-white rounded-xl p-4 shadow-sm', isPending && 'border-l-4 border-amber-500')}>
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className="text-base font-extrabold text-gray-900">{item.orderNumber}</Text>
              <StatusBadge status={item.status} />
            </View>
            <View className="flex-row items-center gap-1 mt-0.5">
              {item.tableNumber ? (
                <>
                  <MapPin size={11} color="#6B7280" strokeWidth={2.2} />
                  <Text className="text-[13px] text-gray-500">{item.tableNumber}</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={11} color="#6B7280" strokeWidth={2.2} />
                  <Text className="text-[13px] text-gray-500">Delivery / Takeout</Text>
                </>
              )}
              {item.customerName ? <Text className="text-[13px] text-gray-500"> • {item.customerName}</Text> : null}
            </View>
          </View>
          <Text className="text-xs text-gray-400">{item.createdAt}</Text>
        </View>

        <View className="border-t border-b border-gray-100 py-2 my-2 gap-1.5">
          {item.items.map((it) => (
            <View key={it.id} className="flex-row items-center">
              <Text className="font-bold text-primary w-7 text-[13px]">{it.quantity}x</Text>
              <View className="flex-1">
                <Text className="text-sm text-gray-900 font-medium">{it.name}</Text>
                {it.options ? <Text className="text-xs text-gray-500">{it.options}</Text> : null}
              </View>
              <Text className="text-[13px] font-semibold text-indigo-800">₦{(it.price * it.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View className="mt-1">
          <Text className="text-sm text-gray-500 mb-3">
            Total: <Text className="text-base font-extrabold text-gray-900">₦{item.totalAmount.toLocaleString()}</Text>
          </Text>

          {isPending ? (
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                className="flex-1 rounded-lg py-2.5 items-center bg-red-100"
                onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
              >
                <Text className="text-red-600 font-bold text-sm">Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-lg py-2.5 items-center bg-emerald-600"
                onPress={() => handleUpdateStatus(item.id, 'CONFIRMED')}
              >
                <Text className="text-white font-bold text-sm">Confirm Order</Text>
              </TouchableOpacity>
            </View>
          ) : item.status === 'CONFIRMED' ? (
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                className="self-end"
                onPress={() => handleUpdateStatus(item.id, 'CANCELLED')}
              >
                <Text className="text-xs text-red-500 font-semibold">Cancel Order</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 rounded-lg py-2.5 items-center bg-emerald-600"
                onPress={() => handleUpdateStatus(item.id, 'COMPLETED')}
              >
                <Text className="text-white font-bold text-sm">Mark Completed</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-100">
      <View className="flex-row justify-between items-center px-5 py-3.5 bg-white border-b border-gray-200">
        <View>
          <Text className="text-lg font-bold text-gray-900">{storefrontName}</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            {pendingCount > 0 && <Bell size={12} color="#6B7280" strokeWidth={2.2} />}
            <Text className="text-[13px] text-gray-500">
              {pendingCount > 0
                ? `${pendingCount} Pending Order${pendingCount > 1 ? 's' : ''}`
                : 'All orders up to date'}
            </Text>
          </View>
        </View>

        <View className="flex-row items-center gap-2">
          <TouchableOpacity
            className="bg-indigo-50 rounded-full px-2.5 py-1.5 border border-indigo-200 flex-row items-center gap-1"
            onPress={handleTriggerTestOrder}
          >
            <Zap size={12} color="#4F46E5" strokeWidth={2.2} />
            <Text className="text-xs font-bold text-indigo-600">Test Alarm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={cn('rounded-full px-3 py-1.5 flex-row items-center gap-1', soundEnabled ? 'bg-indigo-100' : 'bg-gray-100')}
            onPress={handleSoundToggle}
          >
            {soundEnabled ? (
              <Volume2 size={12} color="#3730A3" strokeWidth={2.2} />
            ) : (
              <VolumeX size={12} color="#3730A3" strokeWidth={2.2} />
            )}
            <Text className="text-xs font-semibold text-indigo-800">{soundEnabled ? 'Sound On' : 'Muted'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-amber-100 rounded-full px-2.5 py-1.5 border border-amber-200 flex-row items-center gap-1"
            onPress={customToneUri ? handleClearCustomTone : handlePickCustomTone}
            activeOpacity={0.8}
          >
            <Music2 size={12} color="#92400E" strokeWidth={2.2} />
            <Text className="text-xs font-bold text-amber-800">{customToneUri ? 'Custom' : 'Set Tone'}</Text>
            {customToneUri && <Check size={12} color="#92400E" strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row bg-white px-4 py-2 gap-2 border-b border-gray-200">
        {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED'] as const).map((tab) => {
          const active = activeTab === tab;
          const count =
            tab === 'ALL' ? orders.length : orders.filter((o) => o.status === tab).length;

          return (
            <TouchableOpacity
              key={tab}
              className={cn('px-3 py-1.5 rounded-lg', active ? 'bg-primary' : 'bg-gray-100')}
              onPress={() => setActiveTab(tab)}
            >
              <Text className={cn('text-xs font-semibold', active ? 'text-white' : 'text-gray-600')}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#6C63FF" />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderCard}
          contentContainerClassName={cn('p-4 gap-3', filteredOrders.length === 0 && 'flex-1')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              tintColor="#6C63FF"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-8">
              <Text className="text-base font-bold text-gray-600 mb-1">No {activeTab.toLowerCase()} orders</Text>
              <Text className="text-[13px] text-gray-400 text-center">
                {storefrontId
                  ? 'New incoming customer orders will appear here automatically.'
                  : 'No storefront was specified for this screen.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
