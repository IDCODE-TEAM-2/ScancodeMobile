import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import Toast from 'react-native-toast-message';
import { Bell, Music2, Banknote, Megaphone, Mic2, MapPin, Check } from 'lucide-react-native';
import type { NavigationProp, RouteProps } from '../../types';
import ErrorBanner from '../../components/ErrorBanner';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { useAppContext } from '../../context/AppContext';
import {
  getStorefrontWaiterCalls,
  getStorefrontRequests,
  getStorefrontTips,
  acknowledgeWaiterCall,
  acknowledgeStoreRequest,
  acknowledgeTip,
  type WaiterCallRecord,
  type StoreRequestRecord,
  type TipRecord,
} from '../../api';
import { formatMoney } from '../../utils/currency';
import { cn } from '../../utils/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'WAITER_CALLS' | 'REQUESTS' | 'TIPS';

interface Props {
  navigation: NavigationProp<'ToolbarRequestsAdmin'>;
  route: RouteProps<'ToolbarRequestsAdmin'>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

function RequestTypeLabel({ type, isDark }: { type: StoreRequestRecord['requestType']; isDark: boolean }) {
  const config = {
    SHOUTOUT: { icon: Megaphone, label: 'Shoutout' },
    SONG: { icon: Music2, label: 'Song' },
    KARAOKE: { icon: Mic2, label: 'Karaoke' },
  }[type];
  const Icon = config.icon;
  return (
    <View className="flex-row items-center gap-1.5">
      <Icon size={14} color={isDark ? '#F3F4F6' : '#111827'} strokeWidth={2.2} />
      <Text className="text-[15px] font-extrabold text-gray-900 dark:text-white">{config.label}</Text>
    </View>
  );
}

function recipientLabel(tip: TipRecord): string {
  if (tip.recipient === 'OTHER' && tip.customRecipient) return tip.customRecipient;
  return tip.recipient.charAt(0) + tip.recipient.slice(1).toLowerCase();
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusPill({ status, isDark }: { status: 'PENDING' | 'ACKNOWLEDGED'; isDark: boolean }) {
  const isPending = status === 'PENDING';
  return (
    <View
      className={cn(
        'rounded-full px-2 py-[3px] flex-row items-center gap-1',
        isPending
          ? 'bg-amber-100 dark:bg-amber-950/50'
          : 'bg-emerald-100 dark:bg-emerald-950/50'
      )}
    >
      {isPending ? (
        <Bell size={10} color={isDark ? '#FCD34D' : '#92400E'} strokeWidth={2.5} />
      ) : (
        <Check size={10} color={isDark ? '#6EE7B7' : '#374151'} strokeWidth={2.5} />
      )}
      <Text
        className={cn(
          'text-[11px] font-bold',
          isPending
            ? 'text-amber-800 dark:text-amber-300'
            : 'text-emerald-800 dark:text-emerald-300'
        )}
      >
        {isPending ? 'Pending' : 'Acknowledged'}
      </Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ToolbarRequestsAdminScreen({ route }: Props) {
  const { storefrontId, name } = route.params;
  const storefrontName = name || 'Storefront';
  const { isDark } = useAppContext();

  const [activeTab, setActiveTab] = useState<Tab>('WAITER_CALLS');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [waiterCalls, setWaiterCalls] = useState<WaiterCallRecord[]>([]);
  const [requests, setRequests] = useState<StoreRequestRecord[]>([]);
  const [tips, setTips] = useState<TipRecord[]>([]);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const [calls, reqs, tipData] = await Promise.all([
        getStorefrontWaiterCalls(storefrontId),
        getStorefrontRequests(storefrontId),
        getStorefrontTips(storefrontId),
      ]);
      setWaiterCalls(calls);
      setRequests(reqs);
      setTips(tipData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [storefrontId]);

  useFocusRefresh(loadAll);

  // ─── Acknowledge Handlers ───────────────────────────────────────────────────

  const handleAckCall = async (item: WaiterCallRecord) => {
    if (item.status === 'ACKNOWLEDGED') return;
    try {
      await acknowledgeWaiterCall(storefrontId, item.id);
      setWaiterCalls((prev) =>
        prev.map((c) => c.id === item.id ? { ...c, status: 'ACKNOWLEDGED' } : c)
      );
      Toast.show({ type: 'success', text1: 'Call Acknowledged', text2: `Table ${item.tableNumber} call has been marked as acknowledged.` });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to acknowledge. Please try again.' });
    }
  };

  const handleAckRequest = async (item: StoreRequestRecord) => {
    if (item.status === 'ACKNOWLEDGED') return;
    try {
      await acknowledgeStoreRequest(storefrontId, item.id);
      setRequests((prev) =>
        prev.map((r) => r.id === item.id ? { ...r, status: 'ACKNOWLEDGED' } : r)
      );
      Toast.show({ type: 'success', text1: 'Request Acknowledged', text2: `${item.requestType.toLowerCase()} request has been acknowledged.` });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to acknowledge. Please try again.' });
    }
  };

  const handleAckTip = async (item: TipRecord) => {
    if (item.status === 'ACKNOWLEDGED') return;
    try {
      await acknowledgeTip(storefrontId, item.id);
      setTips((prev) =>
        prev.map((t) => t.id === item.id ? { ...t, status: 'ACKNOWLEDGED' } : t)
      );
      Toast.show({ type: 'success', text1: 'Tip Confirmed', text2: `${formatMoney(item.amount)} tip for ${recipientLabel(item)} marked as received.` });
    } catch {
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to acknowledge. Please try again.' });
    }
  };

  // ─── Badge Counts ───────────────────────────────────────────────────────────

  const pendingCalls = waiterCalls.filter((c) => c.status === 'PENDING').length;
  const pendingRequests = requests.filter((r) => r.status === 'PENDING').length;
  const pendingTips = tips.filter((t) => t.status === 'PENDING').length;

  const TAB_CONFIG: { key: Tab; label: string; icon: typeof Bell; count: number }[] = [
    { key: 'WAITER_CALLS', label: 'Calls', icon: Bell, count: pendingCalls },
    { key: 'REQUESTS', label: 'Requests', icon: Music2, count: pendingRequests },
    { key: 'TIPS', label: 'Tips', icon: Banknote, count: pendingTips },
  ];

  // ─── Render Functions ───────────────────────────────────────────────────────

  const renderCallCard = ({ item }: { item: WaiterCallRecord }) => (
    <View
      className={cn(
        'bg-white dark:bg-[#18181B] rounded-2xl p-4 gap-2.5 shadow-sm border border-transparent dark:border-zinc-800',
        item.status === 'PENDING' && 'border-l-4 border-l-amber-500'
      )}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <MapPin size={13} color={isDark ? '#E4E4E7' : '#111827'} strokeWidth={2.2} />
            <Text className="text-[15px] font-extrabold text-gray-900 dark:text-white">{item.tableNumber}</Text>
          </View>
          <Text className="text-[13px] text-gray-500 dark:text-zinc-400 font-medium">{item.callTarget}</Text>
        </View>
        <View className="items-end gap-1.5">
          <Text className="text-[11px] text-gray-400 dark:text-zinc-500">{formatTime(item.createdAt)}</Text>
          <StatusPill status={item.status} isDark={isDark} />
        </View>
      </View>

      <Text className="text-sm text-gray-700 dark:text-zinc-300 leading-5">{item.message}</Text>

      {item.status === 'PENDING' && (
        <TouchableOpacity
          className="bg-emerald-600 rounded-[10px] py-2.5 items-center flex-row justify-center gap-1.5"
          onPress={() => handleAckCall(item)}
          activeOpacity={0.8}
        >
          <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-white text-[13px] font-bold">Mark as Acknowledged</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderRequestCard = ({ item }: { item: StoreRequestRecord }) => (
    <View
      className={cn(
        'bg-white dark:bg-[#18181B] rounded-2xl p-4 gap-2.5 shadow-sm border border-transparent dark:border-zinc-800',
        item.status === 'PENDING' && 'border-l-4 border-l-amber-500'
      )}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 gap-1.5">
          <RequestTypeLabel type={item.requestType} isDark={isDark} />
          {item.amount > 0 && (
            <Text className="self-start bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[13px] font-extrabold px-2 py-0.5 rounded-lg overflow-hidden">
              {formatMoney(item.amount)}
            </Text>
          )}
        </View>
        <View className="items-end gap-1.5">
          <Text className="text-[11px] text-gray-400 dark:text-zinc-500">{formatTime(item.createdAt)}</Text>
          <StatusPill status={item.status} isDark={isDark} />
        </View>
      </View>

      <Text className="text-sm text-gray-700 dark:text-zinc-300 leading-5">{item.details}</Text>

      {item.status === 'PENDING' && (
        <TouchableOpacity
          className="bg-emerald-600 rounded-[10px] py-2.5 items-center flex-row justify-center gap-1.5"
          onPress={() => handleAckRequest(item)}
          activeOpacity={0.8}
        >
          <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-white text-[13px] font-bold">Mark as Acknowledged</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderTipCard = ({ item }: { item: TipRecord }) => (
    <View
      className={cn(
        'bg-white dark:bg-[#18181B] rounded-2xl p-4 gap-2.5 shadow-sm border border-transparent dark:border-zinc-800',
        item.status === 'PENDING' && 'border-l-4 border-l-amber-500'
      )}
    >
      <View className="flex-row justify-between items-start">
        <View className="flex-1 gap-0.5">
          <View className="flex-row items-center gap-1.5">
            <Banknote size={14} color={isDark ? '#E4E4E7' : '#111827'} strokeWidth={2.2} />
            <Text className="text-[15px] font-extrabold text-gray-900 dark:text-white">{formatMoney(item.amount)}</Text>
          </View>
          <Text className="text-[13px] text-gray-500 dark:text-zinc-400 font-medium">For: {recipientLabel(item)}</Text>
        </View>
        <View className="items-end gap-1.5">
          <Text className="text-[11px] text-gray-400 dark:text-zinc-500">{formatTime(item.createdAt)}</Text>
          <StatusPill status={item.status} isDark={isDark} />
        </View>
      </View>

      {item.status === 'PENDING' && (
        <TouchableOpacity
          className="bg-emerald-600 rounded-[10px] py-2.5 items-center flex-row justify-center gap-1.5"
          onPress={() => handleAckTip(item)}
          activeOpacity={0.8}
        >
          <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
          <Text className="text-white text-[13px] font-bold">Confirm Tip Received</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const currentData =
    activeTab === 'WAITER_CALLS' ? waiterCalls :
      activeTab === 'REQUESTS' ? requests : tips;

  const renderItem = ({ item }: { item: WaiterCallRecord | StoreRequestRecord | TipRecord }) => {
    if (activeTab === 'WAITER_CALLS') return renderCallCard({ item: item as WaiterCallRecord });
    if (activeTab === 'REQUESTS') return renderRequestCard({ item: item as StoreRequestRecord });
    return renderTipCard({ item: item as TipRecord });
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  const EmptyIcon = activeTab === 'WAITER_CALLS' ? Bell : activeTab === 'REQUESTS' ? Music2 : Banknote;

  return (
    <View className="flex-1 bg-gray-100 dark:bg-[#09090B]">
      {/* Header */}
      <View className="flex-row justify-between items-center px-5 py-3.5 bg-white dark:bg-[#18181B] border-b border-gray-200 dark:border-zinc-800">
        <View>
          <Text className="text-lg font-bold text-gray-900 dark:text-white">{storefrontName}</Text>
          <View className="flex-row items-center gap-1 mt-0.5">
            {pendingCalls + pendingRequests + pendingTips > 0 ? (
              <Text className="text-[13px] text-gray-500 dark:text-zinc-400">
                {pendingCalls + pendingRequests + pendingTips} pending item(s) need attention
              </Text>
            ) : (
              <View className="flex-row items-center gap-1">
                <Text className="text-[13px] text-gray-500 dark:text-zinc-400">All activity acknowledged</Text>
                <Check size={12} color={isDark ? '#9CA3AF' : '#6B7280'} strokeWidth={2.5} />
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Tab Bar */}
      <View className="flex-row bg-white dark:bg-[#18181B] px-4 py-2 gap-2 border-b border-gray-200 dark:border-zinc-800">
        {TAB_CONFIG.map((tab) => {
          const isActive = activeTab === tab.key;
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              className={cn(
                'flex-1 flex-row items-center justify-center py-2 rounded-[10px] gap-1',
                isActive ? 'bg-primary' : 'bg-gray-100 dark:bg-zinc-800'
              )}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Icon size={13} color={isActive ? '#FFFFFF' : isDark ? '#9CA3AF' : '#4B5563'} strokeWidth={2.2} />
              <Text className={cn('text-xs font-bold', isActive ? 'text-white' : 'text-gray-600 dark:text-zinc-300')}>
                {tab.label}
              </Text>
              {tab.count > 0 && (
                <View className="bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-extrabold">{tab.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

      {loading ? (
        <View className="flex-1 items-center justify-center p-6">
          <ActivityIndicator size="large" color="#059669" />
          <Text className="mt-2.5 text-sm text-gray-500 dark:text-zinc-400">Loading activity...</Text>
        </View>
      ) : (
        <FlatList
          data={currentData as any[]}
          keyExtractor={(item: any) => String(item.id)}
          renderItem={renderItem as any}
          contentContainerClassName={cn('p-4 gap-3', currentData.length === 0 && 'flex-1')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadAll(true)}
              tintColor="#059669"
            />
          }
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center p-10">
              <EmptyIcon size={44} color={isDark ? '#52525B' : '#D1D5DB'} strokeWidth={1.5} />
              <Text className="text-[17px] font-bold text-gray-700 dark:text-zinc-300 mt-3 mb-1.5">
                No {activeTab === 'WAITER_CALLS' ? 'calls' : activeTab === 'REQUESTS' ? 'requests' : 'tips'} yet
              </Text>
              <Text className="text-[13px] text-gray-400 dark:text-zinc-500 text-center leading-[19px]">
                Customer activity from the Storefront Toolbar will appear here.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
