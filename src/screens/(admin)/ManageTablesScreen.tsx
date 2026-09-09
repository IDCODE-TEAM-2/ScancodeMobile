import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Plus, Trash2, QrCode, Share2, ChevronDown, ChevronUp, Check, X } from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { listStoreTables, createStoreTable, deleteStoreTable, type StoreTableResponse } from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'ManageTables'>;
  route: RouteProps<'ManageTables'>;
}

export default function ManageTablesScreen({ route }: Props) {
  const { storefrontId, slug } = route.params;

  const [tables, setTables] = useState<StoreTableResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [labelInput, setLabelInput] = useState('');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  // Delete confirmation is inline (not Alert.alert) — RN's Alert with multiple buttons
  // does not reliably render on web, which made the delete button appear totally dead there.
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listStoreTables(storefrontId);
      setTables(data);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setLoading(false);
    }
  }, [storefrontId]);

  useFocusRefresh(load);

  function tableUrl(table: StoreTableResponse): string {
    return `https://scancode.ng/store/${slug}?table=${encodeURIComponent(table.tableCode)}`;
  }

  async function handleAddTable() {
    const label = labelInput.trim();
    if (!label) {
      setErrorMsg('Enter a name like "Table 1" before adding.');
      return;
    }
    setErrorMsg(null);
    setCreating(true);
    try {
      const created = await createStoreTable(storefrontId, label);
      setTables((prev) => [...prev, created]);
      setLabelInput('');
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not create this table.');
    } finally {
      setCreating(false);
    }
  }

  async function handleConfirmDelete(table: StoreTableResponse) {
    setConfirmingDeleteId(null);
    setDeletingId(table.id);
    try {
      await deleteStoreTable(storefrontId, table.id);
      setTables((prev) => prev.filter((t) => t.id !== table.id));
      if (expandedId === table.id) setExpandedId(null);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not delete this table.');
    } finally {
      setDeletingId(null);
    }
  }

  async function handleShareTable(table: StoreTableResponse) {
    try {
      await Share.share({
        message: `Scan to order at ${table.label}: ${tableUrl(table)}`,
        url: tableUrl(table),
      });
    } catch {
      // ignore
    }
  }

  function renderTable({ item }: { item: StoreTableResponse }) {
    const isExpanded = expandedId === item.id;
    const isConfirmingDelete = confirmingDeleteId === item.id;
    return (
      <View className="bg-white rounded-2xl mb-3 border border-gray-200 shadow-sm overflow-hidden">
        <TouchableOpacity
          className="flex-row items-center justify-between p-4"
          onPress={() => setExpandedId(isExpanded ? null : item.id)}
          activeOpacity={0.7}
        >
          <View className="flex-row items-center gap-2.5 flex-1">
            <View className="w-9 h-9 rounded-full bg-emerald-50 items-center justify-center">
              <QrCode size={18} color="#059669" strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text className="text-[15px] font-bold text-gray-900" numberOfLines={1}>{item.label}</Text>
              <Text className="text-xs text-gray-400" numberOfLines={1}>{item.tableCode}</Text>
            </View>
          </View>
          <View className="flex-row items-center gap-3">
            {isConfirmingDelete ? (
              <>
                <TouchableOpacity
                  onPress={() => setConfirmingDeleteId(null)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <X size={18} color="#6B7280" strokeWidth={2.4} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleConfirmDelete(item)}
                  disabled={deletingId === item.id}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deletingId === item.id ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Check size={18} color="#DC2626" strokeWidth={2.6} />
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => setConfirmingDeleteId(item.id)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Trash2 size={18} color="#DC2626" strokeWidth={2} />
              </TouchableOpacity>
            )}
            {isExpanded ? (
              <ChevronUp size={18} color="#9CA3AF" strokeWidth={2.2} />
            ) : (
              <ChevronDown size={18} color="#9CA3AF" strokeWidth={2.2} />
            )}
          </View>
        </TouchableOpacity>
        {isConfirmingDelete && (
          <View className="px-4 pb-3 -mt-1">
            <Text className="text-xs text-red-600">
              Delete "{item.label}"? Its QR code stops working immediately. Tap ✓ to confirm.
            </Text>
          </View>
        )}

        {isExpanded && (
          <View className="items-center px-4 pb-5 pt-1 border-t border-gray-100">
            <View className="p-3 bg-white rounded-xl border border-gray-200 my-4">
              <QRCode value={tableUrl(item)} size={160} backgroundColor="#ffffff" color="#111827" />
            </View>
            <Text className="text-[13px] text-gray-500 text-center leading-[18px] mb-4">
              Print this and place it on {item.label.toLowerCase()}. Scanning it opens your menu with this table
              pre-filled, so orders arrive already labeled for staff.
            </Text>
            <TouchableOpacity
              className="bg-primary rounded-xl py-3 px-5 w-full items-center flex-row justify-center gap-2"
              onPress={() => handleShareTable(item)}
              activeOpacity={0.8}
            >
              <Share2 size={16} color="#FFFFFF" strokeWidth={2.2} />
              <Text className="text-white text-sm font-bold">Share / Print QR</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white p-4 border-b border-gray-200">
        <View className="flex-row gap-2.5">
          <TextInput
            className="flex-1 border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 bg-gray-50"
            value={labelInput}
            onChangeText={(text) => {
              setLabelInput(text);
              if (errorMsg) setErrorMsg(null);
            }}
            placeholder="e.g. Table 1"
            placeholderTextColor="#9CA3AF"
            editable={!creating}
            onSubmitEditing={handleAddTable}
          />
          <TouchableOpacity
            className={cn('bg-primary rounded-xl px-4 items-center justify-center', creating && 'opacity-60')}
            onPress={handleAddTable}
            disabled={creating}
          >
            {creating ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Plus size={20} color="#FFFFFF" strokeWidth={2.4} />}
          </TouchableOpacity>
        </View>
        {errorMsg && (
          <Text className="text-xs text-red-600 font-medium mt-2">{errorMsg}</Text>
        )}
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#059669" />
        </View>
      ) : (
        <FlatList
          data={tables}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderTable}
          contentContainerClassName="p-4 pb-28"
          ListEmptyComponent={
            <View className="items-center py-16 px-6">
              <QrCode size={40} color="#D1D5DB" strokeWidth={1.5} />
              <Text className="text-gray-500 text-center mt-3 text-sm">
                No tables yet. Add one above — each table gets its own printable QR code that pre-fills the table
                number when a customer scans it.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
