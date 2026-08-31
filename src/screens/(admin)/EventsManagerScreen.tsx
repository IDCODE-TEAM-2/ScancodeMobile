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
} from 'react-native';
import { Plus, Trash2 } from 'lucide-react-native';
import { getStorefrontEvents, updateStorefrontEvents } from '../../api';
import { DAYS_OF_WEEK, type DayEvent, type DayOfWeek, type WeeklyEvents } from '../../types';
import type { NavigationProp, RouteProps } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'EventsManager'>;
  route: RouteProps<'EventsManager'>;
}

function makeEventId() {
  return `ev-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export default function EventsManagerScreen({ route }: Props) {
  const { storefrontId } = route.params;

  const [events, setEvents] = useState<WeeklyEvents>({});
  const [activeDay, setActiveDay] = useState<DayOfWeek>('Monday');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newTime, setNewTime] = useState('');
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const loadEvents = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getStorefrontEvents(storefrontId);
      setEvents(data);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setIsLoading(false);
    }
  }, [storefrontId]);

  useFocusRefresh(loadEvents);

  const handleAddEvent = () => {
    if (!newTime.trim() || !newName.trim()) {
      Alert.alert('Missing details', 'Please enter a time and an event name.');
      return;
    }
    const newEvent: DayEvent = {
      id: makeEventId(),
      time: newTime.trim(),
      name: newName.trim(),
      description: newDescription.trim() || undefined,
    };
    setEvents((prev) => ({
      ...prev,
      [activeDay]: [...(prev[activeDay] ?? []), newEvent],
    }));
    setNewTime('');
    setNewName('');
    setNewDescription('');
  };

  const handleRemoveEvent = (day: DayOfWeek, eventId: string) => {
    setEvents((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((e) => e.id !== eventId),
    }));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setFeedbackMsg(null);
      await updateStorefrontEvents(storefrontId, events);
      setFeedbackMsg({ type: 'success', text: 'Weekly events updated!' });
    } catch (err: unknown) {
      setFeedbackMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save weekly events.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
        <Text className="mt-3 text-sm text-gray-600">Loading weekly events...</Text>
      </View>
    );
  }

  const activeDayEvents = events[activeDay] ?? [];

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className="bg-white border-b border-gray-200">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-3 py-2.5 gap-2">
          {DAYS_OF_WEEK.map((day) => {
            const active = day === activeDay;
            const count = events[day]?.length ?? 0;
            return (
              <TouchableOpacity
                key={day}
                className={cn('px-3.5 py-2 rounded-[10px]', active ? 'bg-primary' : 'bg-gray-100')}
                onPress={() => setActiveDay(day)}
              >
                <Text className={cn('text-[13px] font-bold', active ? 'text-white' : 'text-gray-600')}>
                  {day.slice(0, 3)}{count > 0 ? ` (${count})` : ''}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView contentContainerClassName="p-5" keyboardShouldPersistTaps="handled">
        {feedbackMsg && (
          <View
            className={cn(
              'p-3.5 rounded-xl mb-4 border',
              feedbackMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
            )}
          >
            <Text
              className={cn(
                'text-[13px] font-semibold text-center',
                feedbackMsg.type === 'success' ? 'text-emerald-900' : 'text-red-900'
              )}
            >
              {feedbackMsg.text}
            </Text>
          </View>
        )}

        <Text className="text-base font-bold text-gray-900 mb-3">{activeDay} Events</Text>

        {activeDayEvents.length === 0 ? (
          <View className="bg-white rounded-2xl p-5 items-center border border-gray-200 mb-4">
            <Text className="text-[13px] text-gray-500 text-center">No events scheduled for {activeDay} yet.</Text>
          </View>
        ) : (
          activeDayEvents.map((event) => (
            <View key={event.id} className="flex-row justify-between items-start bg-white rounded-2xl p-3.5 mb-2.5 border border-gray-200">
              <View className="flex-1 mr-2.5">
                <Text className="text-xs font-black text-primary mb-0.5">{event.time}</Text>
                <Text className="text-[15px] font-bold text-gray-900">{event.name}</Text>
                {!!event.description && <Text className="text-xs text-gray-500 mt-0.5">{event.description}</Text>}
              </View>
              <TouchableOpacity
                className="w-[30px] h-[30px] rounded-full bg-red-50 justify-center items-center"
                onPress={() => handleRemoveEvent(activeDay, event.id)}
                accessibilityLabel={`Remove ${event.name}`}
              >
                <Trash2 size={16} color="#DC2626" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View className="bg-white rounded-2xl p-4 mt-2 mb-5 border border-gray-200">
          <Text className="text-sm font-bold text-gray-900 mb-3">Add Event to {activeDay}</Text>
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2.5"
            value={newTime}
            onChangeText={setNewTime}
            placeholder="e.g. 8:00 PM"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2.5"
            value={newName}
            onChangeText={setNewName}
            placeholder="Event name"
            placeholderTextColor="#9CA3AF"
          />
          <TextInput
            className="bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-900 mb-2.5 min-h-[70px]"
            value={newDescription}
            onChangeText={setNewDescription}
            placeholder="Description (optional)"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity
            className="flex-row gap-1.5 bg-primary rounded-xl py-3 justify-center items-center"
            onPress={handleAddEvent}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
            <Text className="text-white text-sm font-bold">Add Event</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className={cn('rounded-2xl py-4 items-center justify-center', isSaving ? 'bg-gray-400' : 'bg-emerald-600')}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white text-[15px] font-bold">Save Weekly Events</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
