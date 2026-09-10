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
import { getRegistrationForm, rsvpGuest, getPublicAccessContent, type RegistrationFormResponse, type PublicAccessContentResponse } from '../../api';
import type { RouteProps } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  route: RouteProps<'AccessPageGuest'>;
}

const FIXED_KEYS = new Set(['name', 'email', 'phone']);

export default function AccessPageGuestScreen({ route }: Props) {
  const { storefrontId } = route.params;

  const [form, setForm] = useState<RegistrationFormResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [ticketTier, setTicketTier] = useState('');
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<PublicAccessContentResponse[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const data = await getRegistrationForm(storefrontId);
        setForm(data);
        setTicketTier(data.ticketTiers[0] ?? '');
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [storefrontId]);

  const setResponse = (key: string, value: string) => {
    setResponses((prev) => ({ ...prev, [key]: value }));
  };

  const customFields = form?.fields.filter((f) => !FIXED_KEYS.has(f.key)) ?? [];

  const handleSubmit = async () => {
    if (!form) return;
    if (!name.trim() || !email.trim() || !phone.trim()) {
      setError('Please fill in your name, email, and phone number.');
      return;
    }
    const missing = customFields.filter((f) => f.required && !responses[f.key]?.trim());
    if (missing.length > 0) {
      setError(`Please fill in: ${missing.map((f) => f.label).join(', ')}`);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await rsvpGuest(storefrontId, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ticketTier: ticketTier || 'General',
        responses,
      });
      setSubmitted(true);
      try {
        setContent(await getPublicAccessContent(storefrontId));
      } catch {
        // Exclusive content is a bonus, not required for a successful RSVP.
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to submit your RSVP. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (notFound || !form) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 p-6">
        <TicketX size={40} color="#9CA3AF" strokeWidth={1.6} />
        <Text className="text-base font-bold text-gray-700 mt-3">Event Page Not Found</Text>
        <Text className="text-sm text-gray-400 text-center mt-1.5">
          This link may be invalid or the event is no longer active.
        </Text>
      </View>
    );
  }

  if (!form.isOpen) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50 dark:bg-[#09090B] p-6">
        <TicketX size={40} color="#9CA3AF" strokeWidth={1.6} />
        <Text className="text-base font-bold text-gray-700 dark:text-zinc-300 mt-3">Registration Closed</Text>
        <Text className="text-sm text-gray-400 dark:text-zinc-500 text-center mt-1.5">
          "{form.title}" is not currently accepting RSVPs.
        </Text>
      </View>
    );
  }

  if (submitted) {
    return (
      <ScrollView className="flex-1 bg-gray-50 dark:bg-[#09090B]" contentContainerClassName="p-6 items-center justify-center flex-grow">
        <CheckCircle2 size={48} color="#059669" strokeWidth={1.8} />
        <Text className="text-lg font-bold text-gray-900 dark:text-white mt-3 text-center">You're on the list!</Text>
        <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center mt-1.5 mb-5">
          Welcome to {form.title}. Show this screen at the door to check in.
        </Text>
        {content.filter((c) => !c.requiresCheckIn && c.unlocked).map((c) => (
          <View key={c.id} className="bg-white dark:bg-[#18181B] rounded-2xl border border-gray-200 dark:border-zinc-800 p-4 w-full mb-3">
            <View className="flex-row items-center gap-1.5 mb-2">
              <Sparkles size={15} color="#D97706" strokeWidth={2} />
              <Text className="text-sm font-bold text-gray-900 dark:text-white">{c.title}</Text>
            </View>
            <Text className="text-[13px] text-gray-600 dark:text-zinc-300 leading-5">{c.body}</Text>
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView className="flex-1 bg-gray-50 dark:bg-[#09090B]" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled">
        <Text className="text-[22px] font-bold text-gray-900 dark:text-white mb-1">{form.title}</Text>
        {form.description ? (
          <Text className="text-sm text-gray-500 dark:text-zinc-400 mb-6 leading-5">{form.description}</Text>
        ) : (
          <View className="mb-6" />
        )}

        {error && (
          <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3 mb-4">
            <Text className="text-red-600 dark:text-red-300 text-sm">{error}</Text>
          </View>
        )}

        <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Full Name <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#18181B] mb-4"
          value={name}
          onChangeText={setName}
          placeholder="Enter your full name"
          placeholderTextColor="#9CA3AF"
        />

        <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Email <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#18181B] mb-4"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor="#9CA3AF"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Phone Number <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#18181B] mb-4"
          value={phone}
          onChangeText={setPhone}
          placeholder="08012345678"
          placeholderTextColor="#9CA3AF"
          keyboardType="phone-pad"
        />

        {form.ticketTiers.length > 0 && (
          <>
            <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">Ticket Type</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {form.ticketTiers.map((tier) => (
                <TouchableOpacity
                  key={tier}
                  className={cn(
                    'border-[1.5px] rounded-xl px-3.5 py-2.5',
                    ticketTier === tier
                      ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                      : 'bg-white dark:bg-[#18181B] border-gray-300 dark:border-zinc-800'
                  )}
                  onPress={() => setTicketTier(tier)}
                >
                  <Text className={cn('text-sm font-semibold', ticketTier === tier ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-zinc-400')}>
                    {tier}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {customFields.map((f) => (
          <View key={f.key} className="mb-4">
            <Text className="text-sm font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
              {f.label} {f.required && <Text className="text-red-600">*</Text>}
            </Text>

            {f.type === 'CHECKBOX' ? (
              <View className="flex-row gap-2.5">
                {['Yes', 'No'].map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className={cn(
                      'flex-1 border-[1.5px] rounded-xl py-3 items-center',
                      responses[f.key] === opt
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'bg-white dark:bg-[#18181B] border-gray-300 dark:border-zinc-800'
                    )}
                    onPress={() => setResponse(f.key, opt)}
                  >
                    <Text className={cn('font-semibold text-sm', responses[f.key] === opt ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-zinc-400')}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : f.type === 'SELECT' ? (
              <View className="flex-row flex-wrap gap-2">
                {(f.options ?? []).map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    className={cn(
                      'border-[1.5px] rounded-xl px-3.5 py-2.5',
                      responses[f.key] === opt
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                        : 'bg-white dark:bg-[#18181B] border-gray-300 dark:border-zinc-800'
                    )}
                    onPress={() => setResponse(f.key, opt)}
                  >
                    <Text className={cn('text-sm font-semibold', responses[f.key] === opt ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-zinc-400')}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <TextInput
                className={cn(
                  'border-[1.5px] border-gray-300 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-gray-900 dark:text-white bg-white dark:bg-[#18181B]',
                  f.type === 'TEXTAREA' && 'h-[80px]'
                )}
                value={responses[f.key] ?? ''}
                onChangeText={(v) => setResponse(f.key, v)}
                placeholder={f.placeholder || (f.type === 'DATE' ? 'YYYY-MM-DD' : `Enter ${f.label.toLowerCase()}`)}
                placeholderTextColor="#9CA3AF"
                multiline={f.type === 'TEXTAREA'}
                textAlignVertical={f.type === 'TEXTAREA' ? 'top' : 'center'}
              />
            )}
          </View>
        ))}

        <TouchableOpacity
          className={cn('rounded-2xl py-4 items-center mt-2 bg-emerald-600', submitting && 'opacity-70')}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">RSVP</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
