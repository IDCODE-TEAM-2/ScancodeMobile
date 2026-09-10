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
import { Plus, Trash2, X, Users, Link2, CheckCircle2, Lock, Unlock } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import {
  getRegistrationForm,
  saveRegistrationForm,
  listGuests,
  checkInGuest,
  listAllAccessContent,
  createAccessContent,
  type RegistrationFormResponse,
  type FormField,
  type GuestResponse,
  type AccessContentResponse,
} from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'AccessPageManager'>;
  route: RouteProps<'AccessPageManager'>;
}

const FIELD_TYPES: FormField['type'][] = ['TEXT', 'EMAIL', 'PHONE', 'TEXTAREA', 'DATE', 'SELECT', 'CHECKBOX'];

function makeFieldKey(label: string, existing: FormField[]) {
  const base = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'field';
  let key = base;
  let i = 2;
  while (existing.some((f) => f.key === key)) {
    key = `${base}_${i}`;
    i++;
  }
  return key;
}

export default function AccessPageManagerScreen({ route }: Props) {
  const { storefrontId, slug } = route.params;

  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<RegistrationFormResponse | null>(null);
  const [guests, setGuests] = useState<GuestResponse[]>([]);
  const [content, setContent] = useState<AccessContentResponse[]>([]);

  const [editingForm, setEditingForm] = useState(false);
  const [fields, setFields] = useState<FormField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<FormField['type']>('TEXT');
  const [newFieldOptions, setNewFieldOptions] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [savingForm, setSavingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [manualCode, setManualCode] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  const [addingContent, setAddingContent] = useState(false);
  const [contentTitle, setContentTitle] = useState('');
  const [contentBody, setContentBody] = useState('');
  const [contentGated, setContentGated] = useState(true);
  const [savingContent, setSavingContent] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [formData, guestData, contentData] = await Promise.all([
        getRegistrationForm(storefrontId),
        listGuests(storefrontId),
        listAllAccessContent(storefrontId),
      ]);
      setForm(formData);
      setGuests(guestData);
      setContent(contentData);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setLoading(false);
    }
  }, [storefrontId]);

  useFocusRefresh(load);

  const handleToggleOpen = async () => {
    if (!form) return;
    const next = { ...form, isOpen: !form.isOpen };
    setForm(next);
    try {
      await saveRegistrationForm(storefrontId, {
        eventTypeOverride: form.eventType ?? undefined,
        title: form.title,
        description: form.description,
        fields: form.fields,
        ticketTiers: form.ticketTiers,
        isOpen: next.isOpen,
      });
    } catch {
      setForm(form);
      Alert.alert('Error', 'Could not update registration status.');
    }
  };

  const startEditingForm = () => {
    if (!form) return;
    setFields(form.fields);
    setFormError(null);
    setEditingForm(true);
  };

  const handleAddField = () => {
    if (!newFieldLabel.trim()) return;
    const field: FormField = {
      key: makeFieldKey(newFieldLabel, fields),
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      options: newFieldType === 'SELECT'
        ? newFieldOptions.split(',').map((o) => o.trim()).filter(Boolean)
        : undefined,
    };
    setFields((prev) => [...prev, field]);
    setNewFieldLabel('');
    setNewFieldOptions('');
    setNewFieldType('TEXT');
    setNewFieldRequired(false);
  };

  const handleRemoveField = (key: string) => {
    setFields((prev) => prev.filter((f) => f.key !== key));
  };

  const handleSaveForm = async () => {
    if (!form) return;
    setSavingForm(true);
    setFormError(null);
    try {
      const updated = await saveRegistrationForm(storefrontId, {
        eventTypeOverride: form.eventType ?? undefined,
        title: form.title,
        description: form.description,
        fields,
        ticketTiers: form.ticketTiers,
        isOpen: form.isOpen,
      });
      setForm(updated);
      setEditingForm(false);
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Failed to save the registration form.');
    } finally {
      setSavingForm(false);
    }
  };

  const handleManualCheckIn = async () => {
    if (!manualCode.trim()) return;
    setCheckingIn(true);
    try {
      const res = await checkInGuest(storefrontId, manualCode.trim());
      Alert.alert(res.alreadyCheckedIn ? 'Already Checked In' : 'Checked In', `${res.guestName} (${res.ticketTier})`);
      setManualCode('');
      await load();
    } catch (e: unknown) {
      Alert.alert('Check-In Failed', e instanceof Error ? e.message : 'That guest code was not found.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleQuickCheckIn = async (guest: GuestResponse) => {
    setCheckingIn(true);
    try {
      await checkInGuest(storefrontId, guest.guestCode);
      await load();
    } catch (e: unknown) {
      Alert.alert('Check-In Failed', e instanceof Error ? e.message : 'Could not check in this guest.');
    } finally {
      setCheckingIn(false);
    }
  };

  const handleAddContent = async () => {
    if (!contentTitle.trim() || !contentBody.trim()) return;
    setSavingContent(true);
    try {
      const created = await createAccessContent(storefrontId, {
        title: contentTitle.trim(),
        body: contentBody.trim(),
        requiresCheckIn: contentGated,
      });
      setContent((prev) => [...prev, created]);
      setContentTitle('');
      setContentBody('');
      setContentGated(true);
      setAddingContent(false);
    } catch (e: unknown) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Failed to add content.');
    } finally {
      setSavingContent(false);
    }
  };

  const handleCopyLink = async () => {
    if (!slug) return;
    await Clipboard.setStringAsync(`https://scancode.ng/store/${slug}`);
    Alert.alert('Copied', 'Guest link copied to clipboard.');
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-[#09090B]">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (editingForm) {
    return (
      <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-[#09090B]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">Registration Form</Text>
            <TouchableOpacity onPress={() => setEditingForm(false)} className="p-1">
              <X size={20} color="#9CA3AF" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {formError && (
            <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 mb-4">
              <Text className="text-red-600 dark:text-red-300 text-sm">{formError}</Text>
            </View>
          )}

          <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-2">Form Fields</Text>
          {fields.length === 0 ? (
            <Text className="text-[13px] text-gray-400 dark:text-zinc-500 mb-3">No fields yet — add one below.</Text>
          ) : (
            fields.map((f) => (
              <View key={f.key} className="flex-row items-center justify-between bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 rounded-xl px-3.5 py-2.5 mb-2">
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{f.label}{f.required ? ' *' : ''}</Text>
                  <Text className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">
                    {f.type}{f.options?.length ? ` — ${f.options.join(', ')}` : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveField(f.key)}>
                  <Trash2 size={15} color="#DC2626" strokeWidth={2} />
                </TouchableOpacity>
              </View>
            ))
          )}

          <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mt-2 mb-2 border border-gray-200 dark:border-zinc-800">
            <Text className="text-sm font-bold text-gray-900 dark:text-white mb-3">Add Field</Text>
            <TextInput
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-gray-900 dark:text-white mb-2.5"
              value={newFieldLabel}
              onChangeText={setNewFieldLabel}
              placeholder="Field label (e.g. Dietary Requirements)"
              placeholderTextColor="#9CA3AF"
            />
            <View className="flex-row flex-wrap gap-1.5 mb-2.5">
              {FIELD_TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  className={cn('rounded-lg px-3 py-1.5', newFieldType === t ? 'bg-emerald-600' : 'bg-gray-100 dark:bg-zinc-800')}
                  onPress={() => setNewFieldType(t)}
                >
                  <Text className={cn('text-xs font-semibold', newFieldType === t ? 'text-white' : 'text-gray-600 dark:text-zinc-300')}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {newFieldType === 'SELECT' && (
              <TextInput
                className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-gray-900 dark:text-white mb-2.5"
                value={newFieldOptions}
                onChangeText={setNewFieldOptions}
                placeholder="Comma-separated options (e.g. Small, Medium, Large)"
                placeholderTextColor="#9CA3AF"
              />
            )}
            <TouchableOpacity
              className="flex-row items-center gap-2 mb-2.5"
              onPress={() => setNewFieldRequired((v) => !v)}
            >
              <Switch value={newFieldRequired} onValueChange={setNewFieldRequired} trackColor={{ false: '#71717A', true: '#059669' }} />
              <Text className="text-xs text-gray-500 dark:text-zinc-400">Required</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-row gap-1.5 bg-emerald-600 rounded-xl py-3 justify-center items-center"
              onPress={handleAddField}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
              <Text className="text-white text-sm font-bold">Add Field</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={cn('rounded-2xl py-4 items-center mt-4 bg-emerald-600', savingForm && 'opacity-70')}
            onPress={handleSaveForm}
            disabled={savingForm}
            activeOpacity={0.85}
          >
            {savingForm ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Save Form</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-[#09090B]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="p-5 pb-16" keyboardShouldPersistTaps="handled">
        {form && (
          <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-4 border border-gray-200 dark:border-zinc-800">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-[15px] font-bold text-gray-900 dark:text-white flex-1 mr-2">{form.title}</Text>
              <View className={cn('rounded-full px-2.5 py-[3px]', form.isOpen ? 'bg-emerald-100 dark:bg-emerald-950/60' : 'bg-gray-100 dark:bg-zinc-800')}>
                <Text className={cn('text-[11px] font-semibold', form.isOpen ? 'text-emerald-800 dark:text-emerald-300' : 'text-gray-500 dark:text-zinc-400')}>
                  {form.isOpen ? 'Open' : 'Closed'}
                </Text>
              </View>
            </View>
            {!!form.description && <Text className="text-[13px] text-gray-500 dark:text-zinc-400 mb-3">{form.description}</Text>}

            <View className="flex-row gap-2 mb-2">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1.5 border-[1.5px] border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg py-2"
                onPress={startEditingForm}
              >
                <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">Edit Fields ({form.fields.length})</Text>
              </TouchableOpacity>
              {!!slug && (
                <TouchableOpacity
                  className="flex-1 flex-row items-center justify-center gap-1.5 border-[1.5px] border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg py-2"
                  onPress={handleCopyLink}
                >
                  <Link2 size={13} color="#059669" strokeWidth={2.2} />
                  <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">Copy Link</Text>
                </TouchableOpacity>
              )}
            </View>

            <View className="flex-row justify-between items-center border-t border-gray-100 dark:border-zinc-800 pt-2.5 mt-1">
              <View className="flex-row items-center gap-2">
                <Switch value={form.isOpen} onValueChange={handleToggleOpen} trackColor={{ false: '#71717A', true: '#059669' }} />
                <Text className="text-xs text-gray-500 dark:text-zinc-400">Accepting registrations</Text>
              </View>
            </View>
          </View>
        )}

        <View className="flex-row items-center gap-1.5 mb-2">
          <Users size={15} color="#374151" strokeWidth={2} />
          <Text className="text-sm font-bold text-gray-900 dark:text-white">Guests ({guests.length})</Text>
        </View>

        <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-3 border border-gray-200 dark:border-zinc-800">
          <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Check In by Code</Text>
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 border-[1.5px] border-gray-300 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#18181B]"
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Guest code"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <TouchableOpacity
              className={cn('bg-emerald-600 rounded-xl px-4 justify-center items-center', checkingIn && 'opacity-70')}
              onPress={handleManualCheckIn}
              disabled={checkingIn}
            >
              <Text className="text-white text-sm font-bold">Check In</Text>
            </TouchableOpacity>
          </View>
        </View>

        {guests.length === 0 ? (
          <View className="bg-white dark:bg-[#18181B] rounded-2xl p-6 items-center border border-gray-200 dark:border-zinc-800 mb-4">
            <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center">No guests have RSVPed yet.</Text>
          </View>
        ) : (
          guests.map((g) => (
            <View key={g.id} className="bg-white dark:bg-[#18181B] rounded-2xl p-3.5 mb-2 border border-gray-200 dark:border-zinc-800 flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                <Text className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{g.name}</Text>
                <Text className="text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5">{g.ticketTier} · {g.email}</Text>
              </View>
              {g.checkedIn ? (
                <View className="flex-row items-center gap-1">
                  <CheckCircle2 size={16} color="#059669" strokeWidth={2} />
                  <Text className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold">Checked In</Text>
                </View>
              ) : (
                <TouchableOpacity
                  className="border-[1.5px] border-emerald-600/30 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-2.5 py-1.5"
                  onPress={() => handleQuickCheckIn(g)}
                  disabled={checkingIn}
                >
                  <Text className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">Check In</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}

        <View className="flex-row items-center justify-between mt-5 mb-2">
          <Text className="text-sm font-bold text-gray-900 dark:text-white">Exclusive Content ({content.length})</Text>
          <TouchableOpacity onPress={() => setAddingContent((v) => !v)} className="p-1">
            {addingContent ? <X size={18} color="#9CA3AF" strokeWidth={2} /> : <Plus size={18} color="#059669" strokeWidth={2.2} />}
          </TouchableOpacity>
        </View>

        {addingContent && (
          <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-3 border border-gray-200 dark:border-zinc-800">
            <TextInput
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-gray-900 dark:text-white mb-2.5"
              value={contentTitle}
              onChangeText={setContentTitle}
              placeholder="Title (e.g. Venue Directions)"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              className="bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl px-3.5 py-3 text-sm text-gray-900 dark:text-white mb-2.5 h-[80px]"
              value={contentBody}
              onChangeText={setContentBody}
              placeholder="Content shown to guests…"
              placeholderTextColor="#9CA3AF"
              multiline
              textAlignVertical="top"
            />
            <TouchableOpacity className="flex-row items-center gap-2 mb-3" onPress={() => setContentGated((v) => !v)}>
              <Switch value={contentGated} onValueChange={setContentGated} trackColor={{ false: '#71717A', true: '#059669' }} />
              <Text className="text-xs text-gray-500 dark:text-zinc-400">Only unlock after check-in</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={cn('flex-row gap-1.5 bg-emerald-600 rounded-xl py-3 justify-center items-center', savingContent && 'opacity-70')}
              onPress={handleAddContent}
              disabled={savingContent}
              activeOpacity={0.8}
            >
              {savingContent ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-sm font-bold">Add Content</Text>}
            </TouchableOpacity>
          </View>
        )}

        {content.map((c) => (
          <View key={c.id} className="bg-white dark:bg-[#18181B] rounded-2xl p-3.5 mb-2 border border-gray-200 dark:border-zinc-800">
            <View className="flex-row items-center justify-between mb-1">
              <Text className="text-sm font-semibold text-gray-800 dark:text-zinc-200 flex-1 mr-2">{c.title}</Text>
              {c.requiresCheckIn ? (
                <Lock size={13} color="#9CA3AF" strokeWidth={2} />
              ) : (
                <Unlock size={13} color="#059669" strokeWidth={2} />
              )}
            </View>
            <Text className="text-[13px] text-gray-500 dark:text-zinc-400">{c.body}</Text>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
