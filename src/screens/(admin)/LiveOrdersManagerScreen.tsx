import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MapPin, ShoppingBag, Bell, Zap, Volume2, VolumeX, Music2, Check } from 'lucide-react-native';
import * as Haptics from '../../utils/haptics';
import type { NavigationProp, RouteProps } from '../../types';
import StatusBadge from '../../components/StatusBadge';
import ErrorBanner from '../../components/ErrorBanner';
import { playOrderAlarmSound, playStatusChangeSound, getCustomAlarmUri, setCustomAlarmUri, initAudioAlert } from '../../utils/audioAlert';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { getOrders, updateOrderStatus, type OrderResponse } from '../../api';
import { useAppContext } from '../../context/AppContext';
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
  const insets = useSafeAreaInsets();
  const { theme } = useAppContext();
  const storefrontName = route.params?.name || 'Storefront';
  const storefrontId = route.params?.storefrontId;
  const [orders, setOrders] = useState<LiveOrder[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'REJECTED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [customToneUri, setCustomToneUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const oledDark = theme === 'dark';

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
    Haptics.tapLight();
    if (nextState) {
      playOrderAlarmSound();
    }
  }

  function handleTriggerTestOrder() {
    Haptics.tapLight();
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

  async function handleUpdateStatus(orderId: number, newStatus: 'CONFIRMED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED') {
    // Instant optimistic update so buttons respond immediately on touch
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    if (soundEnabled) {
      playStatusChangeSound();
    }
    if (newStatus === 'CONFIRMED' || newStatus === 'COMPLETED') {
      Haptics.notifySuccess();
    } else {
      Haptics.notifyWarning();
    }

    if (storefrontId) {
      try {
        await updateOrderStatus(storefrontId, orderId, newStatus);
      } catch {
        // Fallback gracefully for local/mock test orders
      }
    }
  }

  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'ALL') return true;
    return o.status === activeTab;
  });

  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;

  function renderOrderCard({ item }: { item: LiveOrder }) {
    const isPending = item.status === 'PENDING';

    return (
      <View
        className={cn(
          'rounded-xl p-4 shadow-sm border',
          oledDark ? 'bg-[#0F0F11] border-[#1F1F23]' : 'bg-white border-transparent',
          isPending && (oledDark ? 'border-l-4 border-l-amber-500' : 'border-l-4 border-l-amber-500')
        )}
      >
        <View className="flex-row justify-between items-start mb-3">
          <View>
            <View className="flex-row items-center gap-2">
              <Text className={cn('text-base font-extrabold', oledDark ? 'text-white' : 'text-gray-900')}>{item.orderNumber}</Text>
              <StatusBadge status={item.status} />
            </View>
            <View className="flex-row items-center gap-1 mt-0.5">
              {item.tableNumber ? (
                <>
                  <MapPin size={11} color={oledDark ? '#A1A1AA' : '#6B7280'} strokeWidth={2.2} />
                  <Text className={cn('text-[13px]', oledDark ? 'text-zinc-400' : 'text-gray-500')}>{item.tableNumber}</Text>
                </>
              ) : (
                <>
                  <ShoppingBag size={11} color={oledDark ? '#A1A1AA' : '#6B7280'} strokeWidth={2.2} />
                  <Text className={cn('text-[13px]', oledDark ? 'text-zinc-400' : 'text-gray-500')}>Delivery / Takeout</Text>
                </>
              )}
              {item.customerName ? <Text className={cn('text-[13px]', oledDark ? 'text-zinc-400' : 'text-gray-500')}> • {item.customerName}</Text> : null}
            </View>
          </View>
          <Text className={cn('text-xs', oledDark ? 'text-zinc-500' : 'text-gray-400')}>{item.createdAt}</Text>
        </View>

        <View className={cn('border-t border-b py-2 my-2 gap-1.5', oledDark ? 'border-[#1F1F23]' : 'border-gray-100')}>
          {item.items.map((it) => (
            <View key={it.id} className="flex-row items-center">
              <Text className="font-bold text-primary w-7 text-[13px]">{it.quantity}x</Text>
              <View className="flex-1">
                <Text className={cn('text-sm font-medium', oledDark ? 'text-zinc-100' : 'text-gray-900')}>{it.name}</Text>
                {it.options ? <Text className={cn('text-xs', oledDark ? 'text-zinc-500' : 'text-gray-500')}>{it.options}</Text> : null}
              </View>
              <Text className={cn('text-[13px] font-semibold', oledDark ? 'text-emerald-400' : 'text-emerald-800')}>₦{(it.price * it.quantity).toLocaleString()}</Text>
            </View>
          ))}
        </View>

        <View className="mt-1">
          <Text className={cn('text-sm mb-3', oledDark ? 'text-zinc-400' : 'text-gray-500')}>
            Total: <Text className={cn('text-base font-extrabold', oledDark ? 'text-white' : 'text-gray-900')}>₦{item.totalAmount.toLocaleString()}</Text>
          </Text>

          {isPending ? (
            <View className="flex-row gap-2.5">
              <TouchableOpacity
                className={cn('flex-1 rounded-lg py-2.5 items-center', oledDark ? 'bg-red-950' : 'bg-red-100')}
                onPress={() => handleUpdateStatus(item.id, 'REJECTED')}
              >
                <Text className={cn('font-bold text-sm', oledDark ? 'text-red-400' : 'text-red-600')}>Reject</Text>
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
                <Text className={cn('text-xs font-semibold', oledDark ? 'text-red-400' : 'text-red-500')}>Cancel Order</Text>
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
    <View className={cn('flex-1', oledDark ? 'bg-[#09090B]' : 'bg-gray-100')}>
      {/* Header with Business Name & Centered Sound Controls */}
      <View className={cn('px-5 py-4 border-b items-center', oledDark ? 'bg-[#09090B] border-[#1F1F23]' : 'bg-white border-gray-200')}>
        <Text className={cn('text-xl font-extrabold text-center', oledDark ? 'text-white' : 'text-gray-900')}>{storefrontName}</Text>
        <View className="flex-row items-center justify-center gap-1.5 mt-1">
          {pendingCount > 0 && <Bell size={13} color={oledDark ? '#F59E0B' : '#D97706'} strokeWidth={2.2} />}
          <Text className={cn('text-[13px]', pendingCount > 0 ? (oledDark ? 'text-amber-400 font-semibold' : 'text-amber-600 font-semibold') : (oledDark ? 'text-zinc-400' : 'text-gray-500'))}>
            {pendingCount > 0
              ? `${pendingCount} Pending Order${pendingCount > 1 ? 's' : ''}`
              : 'All orders up to date'}
          </Text>
        </View>

        {/* Sound testing and alarm controls centered beneath business name */}
        <View className="flex-row items-center justify-center gap-2 mt-3.5 flex-wrap">
          <TouchableOpacity
            className={cn('rounded-full px-3 py-1.5 border flex-row items-center gap-1.5 shadow-sm', oledDark ? 'bg-emerald-950/60 border-emerald-800' : 'bg-emerald-50 border-emerald-200')}
            onPress={handleTriggerTestOrder}
            activeOpacity={0.8}
          >
            <Zap size={13} color={oledDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            <Text className={cn('text-xs font-bold', oledDark ? 'text-emerald-300' : 'text-emerald-700')}>Test Alarm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={cn(
              'rounded-full px-3 py-1.5 border flex-row items-center gap-1.5 shadow-sm',
              soundEnabled
                ? (oledDark ? 'bg-emerald-950/60 border-emerald-800' : 'bg-emerald-100 border-emerald-300')
                : (oledDark ? 'bg-zinc-900 border-zinc-700' : 'bg-gray-100 border-gray-200')
            )}
            onPress={handleSoundToggle}
            activeOpacity={0.8}
          >
            {soundEnabled ? (
              <Volume2 size={13} color={oledDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            ) : (
              <VolumeX size={13} color={oledDark ? '#71717A' : '#6B7280'} strokeWidth={2.2} />
            )}
            <Text className={cn('text-xs font-semibold', soundEnabled ? (oledDark ? 'text-emerald-300 font-bold' : 'text-emerald-800 font-bold') : (oledDark ? 'text-zinc-400' : 'text-gray-600'))}>
              {soundEnabled ? 'Sound On' : 'Muted'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className={cn(
              'rounded-full px-3 py-1.5 border flex-row items-center gap-1.5 shadow-sm',
              oledDark ? 'bg-amber-950/60 border-amber-800' : 'bg-amber-50 border-amber-200'
            )}
            onPress={customToneUri ? handleClearCustomTone : handlePickCustomTone}
            activeOpacity={0.8}
          >
            <Music2 size={13} color={oledDark ? '#FBBF24' : '#B45309'} strokeWidth={2.2} />
            <Text className={cn('text-xs font-bold', oledDark ? 'text-amber-300' : 'text-amber-800')}>
              {customToneUri ? 'Custom Tone' : 'Set Tone'}
            </Text>
            {customToneUri && <Check size={12} color={oledDark ? '#FBBF24' : '#B45309'} strokeWidth={2.5} />}
          </TouchableOpacity>
        </View>
      </View>

      <View className={cn('flex-row px-4 py-2 gap-2 border-b', oledDark ? 'bg-[#09090B] border-[#1F1F23]' : 'bg-white border-gray-200')}>
        {(['ALL', 'PENDING', 'CONFIRMED', 'COMPLETED', 'REJECTED'] as const).map((tab) => {
          const active = activeTab === tab;
          const count =
            tab === 'ALL' ? orders.length : orders.filter((o) => o.status === tab).length;

          return (
            <TouchableOpacity
              key={tab}
              className={cn('px-3 py-1.5 rounded-lg', active ? 'bg-primary' : oledDark ? 'bg-zinc-900' : 'bg-gray-100')}
              onPress={() => { Haptics.tapLight(); setActiveTab(tab); }}
            >
              <Text className={cn('text-xs font-semibold', active ? 'text-white' : oledDark ? 'text-zinc-400' : 'text-gray-600')}>
                {tab} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? <ErrorBanner message={error} onDismiss={() => setError(null)} /> : null}

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#059669" />
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
              tintColor="#059669"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-8">
              <Text className={cn('text-base font-bold mb-1', oledDark ? 'text-zinc-300' : 'text-gray-600')}>No {activeTab.toLowerCase()} orders</Text>
              <Text className={cn('text-[13px] text-center', oledDark ? 'text-zinc-500' : 'text-gray-400')}>
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
