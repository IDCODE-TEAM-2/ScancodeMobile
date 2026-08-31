import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { CheckCircle2, Sparkles, TicketX } from 'lucide-react-native';
import { getAccessPageBySlug, submitAccessPageGuestEntry } from '../../api';
import type { AccessPage, RouteProps } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  route: RouteProps<'AccessPageGuest'>;
}

export default function AccessPageGuestScreen({ route }: Props) {
  const { accessPageSlug } = route.params;

  const [page, setPage] = useState<AccessPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getAccessPageBySlug(accessPageSlug);
        setPage(data);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [accessPageSlug]);

  const setResponse = (fieldId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async () => {
    if (!page) return;
    const missing = page.fields.filter((f) => f.required && !responses[f.id]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const labeled: Record<string, string> = {};
      for (const f of page.fields) {
        if (responses[f.id] !== undefined) labeled[f.label] = responses[f.id];
      }
      await submitAccessPageGuestEntry(page.id, labeled);
      setSubmitted(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to check in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  if (notFound || !page) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <TicketX size={40} color="#9CA3AF" strokeWidth={1.6} />
        <Text className="text-base font-bold text-gray-700 mt-3">Event Page Not Found</Text>
        <Text className="text-sm text-gray-400 text-center mt-1.5">
          This link may be invalid or the event page is no longer active.
        </Text>
      </View>
    );
  }

  if (!page.isActive) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <TicketX size={40} color="#9CA3AF" strokeWidth={1.6} />
        <Text className="text-base font-bold text-gray-700 mt-3">Check-In Closed</Text>
        <Text className="text-sm text-gray-400 text-center mt-1.5">
          "{page.title}" is not currently accepting guest check-ins.
        </Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <ScrollView className="flex-1 bg-gray-50" contentContainerClassName="p-6 items-center justify-center flex-grow">
        <CheckCircle2 size={48} color="#059669" strokeWidth={1.8} />
        <Text className="text-lg font-bold text-gray-900 mt-3 text-center">You're checked in!</Text>
        <Text className="text-sm text-gray-500 text-center mt-1.5 mb-5">Welcome to {page.title}.</Text>
        {page.exclusiveContent && (
          <View className="bg-white rounded-2xl border border-gray-200 p-4 w-full">
            <View className="flex-row items-center gap-1.5 mb-2">
              <Sparkles size={15} color="#D97706" strokeWidth={2} />
              <Text className="text-sm font-bold text-gray-900">Exclusive Content</Text>
            </View>
            <Text className="text-[13px] text-gray-600 leading-5">{page.exclusiveContent}</Text>
          </View>
        )}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled">
        <Text className="text-[22px] font-bold text-gray-900 mb-1">{page.title}</Text>
        {page.description ? (
          <Text className="text-sm text-gray-500 mb-6 leading-5">{page.description}</Text>
        ) : (
          <View className="mb-6" />
        )}

        {error && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-sm">{error}</Text>
          </View>
        )}

        {page.fields.map((f) => (
          <View key={f.id} className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">
              {f.label} {f.required && <Text className="text-red-600">*</Text>}
            </Text>

            {f.type === 'yesno' ? (
              <View className="flex-row gap-2.5">
                {['Yes', 'No'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className={cn(
                      'flex-1 border-[1.5px] rounded-xl py-3 items-center bg-white',
                      responses[f.id] === opt ? 'border-primary bg-violet-50' : 'border-gray-300'
                    )}
                    onPress={() => setResponse(f.id, opt)}
                  >
                    <Text className={cn('font-semibold text-sm', responses[f.id] === opt ? 'text-primary' : 'text-gray-500')}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : f.type === 'dropdown' ? (
              <View className="flex-row flex-wrap gap-2">
                {(f.options ?? []).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className={cn(
                      'border-[1.5px] rounded-xl px-3.5 py-2.5 bg-white',
                      responses[f.id] === opt ? 'border-primary bg-violet-50' : 'border-gray-300'
                    )}
                    onPress={() => setResponse(f.id, opt)}
                  >
                    <Text className={cn('text-sm font-semibold', responses[f.id] === opt ? 'text-primary' : 'text-gray-500')}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white"
                value={responses[f.id] ?? ''}
                onChangeText={(v) => setResponse(f.id, v)}
                placeholder={f.type === 'number' ? '0' : f.type === 'date' ? 'YYYY-MM-DD' : `Enter ${f.label.toLowerCase()}`}
                placeholderTextColor="#9CA3AF"
                keyboardType={f.type === 'number' ? 'number-pad' : 'default'}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          className={cn('rounded-2xl py-4 items-center mt-2', submitting ? 'bg-primary/55' : 'bg-primary')}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Check In</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
