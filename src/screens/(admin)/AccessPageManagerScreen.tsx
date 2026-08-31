import React, { useCallback, useState } from 'react';
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
  Switch,
} from 'react-native';
import { Plus, Trash2, X, Users, Link2, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import {
  getAccessPages,
  createAccessPage,
  updateAccessPage,
  deleteAccessPage,
  getAccessPageGuests,
  type CreateAccessPageBody,
} from '../../api';
import type {
  AccessPage,
  AccessPageField,
  AccessPageFieldType,
  AccessPageGuestEntry,
  AccessPageType,
  NavigationProp,
  RouteProps,
} from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'AccessPageManager'>;
  route: RouteProps<'AccessPageManager'>;
}

const TYPE_OPTIONS: { type: AccessPageType; label: string }[] = [
  { type: 'CUSTOM', label: 'Custom Event' },
  { type: 'WEDDING', label: 'Wedding' },
  { type: 'CONFERENCE', label: 'Conference / Summit' },
  { type: 'CONCERT', label: 'Concert' },
];

const FIELD_TYPES: AccessPageFieldType[] = ['text', 'number', 'date', 'yesno', 'dropdown'];

function makeFieldId() {
  return `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function presetFields(type: AccessPageType): AccessPageField[] {
  switch (type) {
    case 'WEDDING':
      return [
        { id: makeFieldId(), label: 'Guest Name', type: 'text', required: true },
        { id: makeFieldId(), label: 'Attending', type: 'yesno', required: true },
        { id: makeFieldId(), label: 'Number of Guests', type: 'number' },
        { id: makeFieldId(), label: 'Meal Preference', type: 'dropdown', options: ['Chicken', 'Fish', 'Vegetarian'] },
      ];
    case 'CONFERENCE':
      return [
        { id: makeFieldId(), label: 'Full Name', type: 'text', required: true },
        { id: makeFieldId(), label: 'Organization', type: 'text' },
        { id: makeFieldId(), label: 'Email', type: 'text', required: true },
        { id: makeFieldId(), label: 'Session Track', type: 'dropdown', options: ['General', 'Technical', 'Business'] },
      ];
    case 'CONCERT':
      return [
        { id: makeFieldId(), label: 'Full Name', type: 'text', required: true },
        { id: makeFieldId(), label: 'Ticket Type', type: 'dropdown', options: ['General Admission', 'VIP', 'Backstage'] },
        { id: makeFieldId(), label: 'Phone Number', type: 'text', required: true },
      ];
    default:
      return [];
  }
}

export default function AccessPageManagerScreen({ route }: Props) {
  const { storefrontId } = route.params;

  const [pages, setPages] = useState<AccessPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [expandedGuests, setExpandedGuests] = useState<number | null>(null);
  const [guests, setGuests] = useState<AccessPageGuestEntry[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);

  const [type, setType] = useState<AccessPageType>('CUSTOM');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [exclusiveContent, setExclusiveContent] = useState('');
  const [fields, setFields] = useState<AccessPageField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<AccessPageFieldType>('text');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getAccessPages(storefrontId);
      setPages(data);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setLoading(false);
    }
  }, [storefrontId]);

  useFocusRefresh(load);

  const resetForm = () => {
    setType('CUSTOM');
    setTitle('');
    setDescription('');
    setExclusiveContent('');
    setFields([]);
    setNewFieldLabel('');
    setNewFieldType('text');
    setNewFieldOptions('');
    setError(null);
  };

  const handleSelectType = (t: AccessPageType) => {
    setType(t);
    setFields(presetFields(t));
  };

  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const field: AccessPageField = {
      id: makeFieldId(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      options: newFieldType === 'dropdown'
        ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined,
    };
    setFields((prev) => [...prev, field]);
    setNewFieldLabel('');
    setNewFieldOptions('');
    setNewFieldType('text');
  };

  const handleRemoveField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setError('Please enter a title for this event page.');
      return;
    }
    if (fields.length === 0) {
      setError('Add at least one field for guests to fill in.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body: CreateAccessPageBody = {
        type,
        title: title.trim(),
        description: description.trim() || undefined,
        fields,
        exclusiveContent: exclusiveContent.trim() || undefined,
      };
      await createAccessPage(storefrontId, body);
      setFormOpen(false);
      resetForm();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create access page.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (p: AccessPage) => {
    await updateAccessPage(p.id, { isActive: !p.isActive });
    await load();
  };

  const handleDelete = (p: AccessPage) => {
    Alert.alert('Delete Access Page', `Remove "${p.title}"? Guest check-in data will be lost.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAccessPage(p.id);
          await load();
        },
      },
    ]);
  };

  const handleCopyLink = async (slug: string) => {
    await Clipboard.setStringAsync(`https://scancode.live/access/${slug}`);
    Alert.alert('Copied', 'Guest link copied to clipboard.');
  };

  const handleToggleGuests = async (p: AccessPage) => {
    if (expandedGuests === p.id) {
      setExpandedGuests(null);
      return;
    }
    setExpandedGuests(p.id);
    setGuestsLoading(true);
    try {
      const data = await getAccessPageGuests(p.id);
      setGuests(data);
    } finally {
      setGuestsLoading(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (formOpen) {
    return (
      <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-lg font-bold text-gray-900">New Access Page</Text>
            <TouchableOpacity onPress={() => { setFormOpen(false); resetForm(); }} className="p-1">
              <X size={20} color="#4B5563" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Event Type</Text>
          <View className="flex-row flex-wrap gap-2 mb-4">
            {TYPE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                className={cn(
                  'border-[1.5px] rounded-xl px-3.5 py-2.5 bg-white',
                  type === opt.type ? 'border-primary bg-violet-50' : 'border-gray-300'
                )}
                onPress={() => handleSelectType(opt.type)}
              >
                <Text className={cn('text-sm font-semibold', type === opt.type ? 'text-primary' : 'text-gray-500')}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Title <Text className="text-red-600">*</Text></Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Tolu & Ada's Wedding"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Description</Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4 h-[70px]"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional details shown to guests…"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Exclusive Content</Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4 h-[70px]"
            value={exclusiveContent}
            onChangeText={setExclusiveContent}
            placeholder="Shown to guests after they check in (e.g. venue directions, wifi code)…"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          <Text className="text-sm font-semibold text-gray-700 mb-2">Guest Form Fields</Text>
          {fields.length === 0 ? (
            <Text className="text-[13px] text-gray-400 mb-3">No fields yet — add one below.</Text>
          ) : (
            fields.map((f) => (
              <View key={f.id} className="flex-row items-center justify-between bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 mb-2">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-800">{f.label}{f.required ? ' *' : ''}</Text>
                  <Text className="text-[11px] text-gray-400 mt-0.5">
                    {f.type}{f.options?.length ? ` — ${f.options.join(', ')}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveField(f.id)}>
                  <Trash2 size={15} color="#DC2626" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View className="bg-white rounded-2xl p-4 mt-2 mb-2 border border-gray-200">
            <Text className="text-sm font-bold text-gray-900 mb-3">Add Field</Text>
            <TextInput
              className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2.5"
              value={newFieldLabel}
              onChangeText={setNewFieldLabel}
              placeholder="Field label (e.g. Dietary Requirements)"
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row flex-wrap gap-1.5 mb-2.5">
              {FIELD_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  className={cn('rounded-lg px-3 py-1.5', newFieldType === t ? 'bg-primary' : 'bg-gray-100')}
                  onPress={() => setNewFieldType(t)}
                >
                  <Text className={cn('text-xs font-semibold', newFieldType === t ? 'text-white' : 'text-gray-600')}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {newFieldType === 'dropdown' && (
              <TextInput
                className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2.5"
                value={newFieldOptions}
                onChangeText={setNewFieldOptions}
                placeholder="Comma-separated options (e.g. Small, Medium, Large)"
                placeholderTextColor="#9CA3AF"
              />
            )}
            <TouchableOpacity
              className="flex-row gap-1.5 bg-primary rounded-xl py-3 justify-center items-center"
              onPress={handleAddCustomField}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-white text-sm font-bold">Add Field</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={cn('rounded-2xl py-4 items-center mt-4', saving ? 'bg-primary/55' : 'bg-primary')}
            onPress={handleCreate}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Create Access Page</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-5 pb-24">
        {pages.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-200 mt-4">
            <Text className="text-sm text-gray-500 text-center">No access pages yet. Create one for your next event.</Text>
          </View>
        ) : (
          pages.map((p) => (
            <View key={p.id} className="bg-white rounded-2xl p-4 mb-3 border border-gray-200">
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-[15px] font-bold text-gray-900 flex-1 mr-2">{p.title}</Text>
                <View className={cn('rounded-full px-2.5 py-[3px]', p.isActive ? 'bg-emerald-100' : 'bg-gray-100')}>
                  <Text className={cn('text-[11px] font-semibold', p.isActive ? 'text-emerald-800' : 'text-gray-500')}>
                    {p.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <Text className="text-xs text-gray-400 uppercase tracking-wide mb-3">{p.type}</Text>

              <View className="flex-row gap-2 mb-2">
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1.5 border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2"
                  onPress={() => handleCopyLink(p.slug)}
                >
                  <Link2 size={13} color="#4F46E5" strokeWidth={2.2} />
                  <Text className="text-indigo-600 font-semibold text-xs">Copy Link</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1.5 border-[1.5px] border-primary/20 bg-violet-50 rounded-lg py-2"
                  onPress={() => handleToggleGuests(p)}
                >
                  <Users size={13} color="#4F46E5" strokeWidth={2.2} />
                  <Text className="text-indigo-600 font-semibold text-xs">Guests</Text>
                  {expandedGuests === p.id ? (
                    <ChevronUp size={13} color="#4F46E5" strokeWidth={2.2} />
                  ) : (
                    <ChevronDown size={13} color="#4F46E5" strokeWidth={2.2} />
                  )}
                </TouchableOpacity>
              </View>

              <View className="flex-row justify-between items-center border-t border-gray-100 pt-2.5 mt-1">
                <View className="flex-row items-center gap-2">
                  <Switch
                    value={p.isActive}
                    onValueChange={() => handleToggleActive(p)}
                    trackColor={{ false: '#D1D5DB', true: '#6C63FF' }}
                  />
                  <Text className="text-xs text-gray-500">Accepting check-ins</Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(p)}>
                  <Trash2 size={16} color="#DC2626" strokeWidth={2} />
                </TouchableOpacity>
              </View>

              {expandedGuests === p.id && (
                <View className="mt-3 border-t border-gray-100 pt-3">
                  {guestsLoading ? (
                    <ActivityIndicator color="#6C63FF" />
                  ) : guests.length === 0 ? (
                    <Text className="text-xs text-gray-400">No guests have checked in yet.</Text>
                  ) : (
                    guests.map((g) => (
                      <View key={g.id} className="bg-gray-50 rounded-lg p-2.5 mb-1.5">
                        {Object.entries(g.responses).map(([k, v]) => (
                          <Text key={k} className="text-xs text-gray-600">
                            <Text className="font-semibold">{k}:</Text> {v}
                          </Text>
                        ))}
                        <Text className="text-[10px] text-gray-400 mt-1">
                          Checked in {new Date(g.checkedInAt).toLocaleString()}
                        </Text>
                      </View>
                    ))
                  )}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 left-5 right-5 bg-primary rounded-xl py-4 items-center flex-row justify-center gap-2 shadow-lg"
        onPress={() => { resetForm(); setFormOpen(true); }}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text className="text-white text-base font-bold">New Access Page</Text>
      </TouchableOpacity>
    </View>
  );
}
