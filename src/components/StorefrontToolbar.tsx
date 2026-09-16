import React, { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, HandCoins, Music2, Star, X, Check, Copy, CreditCard } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  createStoreFeedback,
  createStoreRequest,
  createStoreTip,
  createWaiterCall,
  getStoreConfig,
  type StoreRequestType,
} from '../api';
import { DAYS_OF_WEEK, type WeeklyEvents } from '../types';
import { useAppContext } from '../context/AppContext';
import { payWithPaystack } from '../utils/paystack';
import { cn } from '../utils/cn';

export type { DayEvent, WeeklyEvents } from '../types';

type ToolPopup = 'assistance' | 'request' | 'tip' | 'feedback' | 'events';

interface PendingPayment {
  id: number;
  type: 'REQUEST' | 'TIP';
  title: string;
  details: string;
  amount: number;
}

import type { BankAccount } from '../types';

interface StorefrontToolbarProps {
  storefrontId?: number | null;
  tableCode?: string | null;
  vendor?: {
    name?: string;
    bankName?: string;
    accountNumber?: string;
    bankAccounts?: BankAccount[];
  } | null;
  weeklyEvents?: WeeklyEvents;
}

const DEFAULT_CALL_ENTITIES = ['Waiter', 'Bouncer', 'Services'];
const REQUEST_TYPES: StoreRequestType[] = ['SHOUTOUT', 'SONG', 'KARAOKE'];

function getPresetMessages(entity: string): string[] {
  const key = entity.toLowerCase();
  if (key.includes('waiter') || key.includes('server')) {
    return ['Bring the bill', 'Water', 'Extra cutlery', 'Extra napkins', 'Package leftovers', 'Custom message'];
  }
  if (key.includes('bouncer') || key.includes('security')) {
    return ['Need security', 'Unwanted guest', 'Harassment', 'Escort me out', 'Medical emergency', 'Custom message'];
  }
  return ['Call Manager', 'Clean restroom', 'Taxi request', 'Wi-Fi help', 'Custom message'];
}

function money(value: number) {
  return `₦${value.toLocaleString()}`;
}

export default function StorefrontToolbar({
  storefrontId,
  tableCode,
  vendor,
  weeklyEvents,
}: StorefrontToolbarProps) {
  const { isDark } = useAppContext();
  const [activePopup, setActivePopup] = useState<ToolPopup | null>(null);
  const [callEntities, setCallEntities] = useState(DEFAULT_CALL_ENTITIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [isPayingOnline, setIsPayingOnline] = useState(false);

  const handleCopyAccount = async () => {
    if (!vendor?.accountNumber) return;
    await Clipboard.setStringAsync(vendor.accountNumber);
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handlePayOnline = async () => {
    if (!pendingPayment || !storefrontId) return;
    setIsPayingOnline(true);
    await payWithPaystack({
      purpose: pendingPayment.type,
      payload: {
        storefrontId,
        id: pendingPayment.id,
        amount: pendingPayment.amount,
        title: pendingPayment.title,
      },
      title: `${pendingPayment.title} Payment`,
      onSuccess: () => {
        setIsPayingOnline(false);
        setPendingPayment(null);
        Alert.alert('Payment Confirmed!', 'Your payment was successfully received and verified.');
      },
      onError: (msg) => {
        setIsPayingOnline(false);
        Alert.alert('Payment Error', msg);
      },
      onCancel: () => {
        setIsPayingOnline(false);
      },
    });
  };

  const [tableNumber, setTableNumber] = useState(tableCode ?? '');
  const [callTarget, setCallTarget] = useState(DEFAULT_CALL_ENTITIES[0]);
  const [selectedPreset, setSelectedPreset] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const [requestType, setRequestType] = useState<StoreRequestType>('SHOUTOUT');
  const [requestDetails, setRequestDetails] = useState('');
  const [requestAmount, setRequestAmount] = useState(5000);

  const [tipRecipient, setTipRecipient] = useState('Waiter');
  const [customTipRecipient, setCustomTipRecipient] = useState('');
  const [tipAmount, setTipAmount] = useState(100);

  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    setTableNumber(tableCode ?? '');
  }, [tableCode]);

  useEffect(() => {
    if (!storefrontId) return;

    let isMounted = true;
    getStoreConfig(storefrontId)
      .then((config) => {
        if (!isMounted || !config.callEntities?.length) return;
        setCallEntities(config.callEntities);
        setCallTarget(config.callEntities[0]);
      })
      .catch(() => {
        // Fall back to default entities
      });

    return () => {
      isMounted = false;
    };
  }, [storefrontId]);

  const currentPresetMessages = useMemo(
    () => getPresetMessages(callTarget),
    [callTarget]
  );

  const totalEvents = useMemo(() => {
    if (!weeklyEvents) return 0;
    return Object.values(weeklyEvents).reduce((sum, list) => sum + (list?.length ?? 0), 0);
  }, [weeklyEvents]);

  const closePopup = () => setActivePopup(null);

  const showSuccess = (message: string) => {
    Toast.show({ type: 'success', text1: 'Sent!', text2: message });
    closePopup();
  };

  const requireStorefront = () => {
    if (!storefrontId) {
      Alert.alert('Storefront unavailable', 'Please open a live storefront before submitting requests.');
      return false;
    }
    return true;
  };

  const submitAssistance = async () => {
    if (!requireStorefront()) return;
    if (!tableNumber.trim()) {
      Alert.alert('Table number required', 'Please enter your table or room number.');
      return;
    }
    if (!selectedPreset) {
      Alert.alert('Option required', 'Please choose what you need.');
      return;
    }
    if (selectedPreset === 'Custom message' && !customMessage.trim()) {
      Alert.alert('Message required', 'Please write your custom message.');
      return;
    }

    const message = selectedPreset === 'Custom message' ? customMessage.trim() : selectedPreset;

    try {
      setIsSubmitting(true);
      await createWaiterCall(storefrontId!, {
        tableNumber: tableNumber.trim(),
        callTarget,
        message,
      });
      setSelectedPreset('');
      setCustomMessage('');
      showSuccess(`Your call to ${callTarget} has been sent.`);
    } catch {
      Alert.alert('Request failed', 'Unable to notify staff right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitRequest = async () => {
    if (!requireStorefront()) return;
    if (!requestDetails.trim()) {
      Alert.alert('Details required', 'Please describe your request.');
      return;
    }
    if (requestType !== 'KARAOKE' && requestAmount < 5000) {
      Alert.alert('Minimum amount', 'Paid requests (Shoutout & Song) must be at least ₦5,000.');
      setRequestAmount(5000);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createStoreRequest(storefrontId!, {
        requestType,
        details: requestDetails.trim(),
        amount: requestType === 'KARAOKE' ? 0 : requestAmount,
      });

      const details = requestDetails.trim();
      const currentType = requestType;
      const amount = requestAmount;

      setRequestDetails('');
      setRequestAmount(5000);
      setActivePopup(null);

      if (currentType === 'KARAOKE') {
        showSuccess('Your karaoke request has been submitted.');
      } else {
        const title = currentType === 'SHOUTOUT' ? 'Special Shoutout Request' : `Song: ${details}`;
        setPendingPayment({
          id: res.id ?? Date.now(),
          type: 'REQUEST',
          title,
          details,
          amount,
        });
      }
    } catch {
      Alert.alert('Request failed', 'Unable to submit this request right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitTip = async () => {
    if (!requireStorefront()) return;
    const recipient = tipRecipient === 'Other' ? customTipRecipient.trim() : tipRecipient;
    if (!recipient) {
      Alert.alert('Recipient required', 'Please choose or enter who you are tipping.');
      return;
    }
    if (tipAmount < 100) {
      Alert.alert('Minimum tip', 'Tips must be at least ₦100.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await createStoreTip(storefrontId!, {
        recipient: tipRecipient.toUpperCase(),
        customRecipient: tipRecipient === 'Other' ? recipient : null,
        amount: tipAmount,
      });

      const submittedRecipient = recipient;
      const submittedAmount = tipAmount;

      setTipRecipient('Waiter');
      setCustomTipRecipient('');
      setTipAmount(100);
      setActivePopup(null);

      setPendingPayment({
        id: res.id ?? Date.now(),
        type: 'TIP',
        title: `Tip to ${submittedRecipient}`,
        details: `Tip amount: ₦${submittedAmount.toLocaleString()}`,
        amount: submittedAmount,
      });
    } catch {
      Alert.alert('Tip failed', 'Unable to submit this tip right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFeedback = async () => {
    if (!requireStorefront()) return;

    try {
      setIsSubmitting(true);
      await createStoreFeedback(storefrontId!, {
        rating,
        description: feedbackText.trim(),
      });
      setRating(5);
      setFeedbackText('');
      showSuccess('Thank you for rating your experience.');
    } catch {
      Alert.alert('Feedback failed', 'Unable to submit feedback right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toolbarItems: { key: ToolPopup; label: string; Icon: React.ElementType }[] = [
    { key: 'assistance', label: 'Assist', Icon: Bell },
    { key: 'request', label: 'Request', Icon: Music2 },
    { key: 'tip', label: 'Tip', Icon: HandCoins },
    { key: 'feedback', label: 'Feedback', Icon: Star },
    { key: 'events', label: 'Events', Icon: CalendarDays },
  ];

  return (
    <>
      <View className="absolute left-4 right-4 bottom-4 z-20 flex-row justify-between items-center bg-white dark:bg-[#18181B] border border-gray-200 dark:border-zinc-800 rounded-[18px] px-2 py-2 shadow-lg">
        {toolbarItems.map((item) => (
          <TouchableOpacity
            key={item.key}
            className="flex-1 items-center justify-center"
            activeOpacity={0.75}
            onPress={() => setActivePopup(item.key)}
            accessibilityLabel={item.label}
          >
            <View className="w-[34px] h-[34px] rounded-full border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 justify-center items-center mb-[3px]">
              <item.Icon size={18} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
            </View>
            <Text className="text-gray-600 dark:text-zinc-300 text-[10px] font-semibold" numberOfLines={1}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Modal
        visible={activePopup !== null}
        animationType="slide"
        transparent
        onRequestClose={closePopup}
      >
        <Pressable className="flex-1 bg-black/55 justify-end" onPress={closePopup}>
          <Pressable className="bg-white dark:bg-[#18181B] rounded-t-3xl px-5 pt-2.5 pb-[34px] max-h-[84%] border-t border-transparent dark:border-zinc-800" onPress={(event) => event.stopPropagation()}>
            <View className="w-10 h-[5px] rounded-full bg-gray-200 dark:bg-zinc-700 self-center mb-4" />
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-gray-900 dark:text-white text-lg font-extrabold">
                {activePopup === 'assistance' && 'Call for Assistance'}
                {activePopup === 'request' && 'Make a Request'}
                {activePopup === 'tip' && 'Send a Tip'}
                {activePopup === 'feedback' && 'Rate Your Experience'}
                {activePopup === 'events' && 'This Week Events'}
              </Text>
              <TouchableOpacity className="w-7 h-7 rounded-full bg-gray-100 dark:bg-zinc-800 justify-center items-center" onPress={closePopup}>
                <X size={18} color={isDark ? '#D1D5DB' : '#6B7280'} strokeWidth={2.5} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-3">
              {activePopup === 'assistance' && (
                <>
                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Table or room number</Text>
                  <TextInput
                    className="min-h-[46px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900"
                    value={tableNumber}
                    onChangeText={setTableNumber}
                    placeholder="Enter table or room number"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                  />

                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Who should we call?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {callEntities.map((entity) => (
                      <TouchableOpacity
                        key={entity}
                        className={cn(
                          'rounded-xl border px-3 py-2.5',
                          callTarget === entity
                            ? 'bg-emerald-800 dark:bg-emerald-700 border-emerald-800 dark:border-emerald-700'
                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                        )}
                        onPress={() => {
                          setCallTarget(entity);
                          setSelectedPreset('');
                        }}
                      >
                        <Text className={cn('text-[13px] font-bold', callTarget === entity ? 'text-white' : 'text-gray-700 dark:text-zinc-200')}>{entity}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">What do you need?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {currentPresetMessages.map((preset) => (
                      <TouchableOpacity
                        key={preset}
                        className={cn(
                          'rounded-xl border px-3 py-2.5',
                          selectedPreset === preset
                            ? 'bg-emerald-800 dark:bg-emerald-700 border-emerald-800 dark:border-emerald-700'
                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                        )}
                        onPress={() => setSelectedPreset(preset)}
                      >
                        <Text className={cn('text-[13px] font-bold', selectedPreset === preset ? 'text-white' : 'text-gray-700 dark:text-zinc-200')}>{preset}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {selectedPreset === 'Custom message' && (
                    <TextInput
                      className="min-h-[96px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 pt-3 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900 mt-2"
                      value={customMessage}
                      onChangeText={setCustomMessage}
                      placeholder="Type your message"
                      placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                      multiline
                      textAlignVertical="top"
                    />
                  )}

                  <SubmitButton label="Send Assistance Request" loading={isSubmitting} onPress={submitAssistance} />
                </>
              )}

              {activePopup === 'request' && (
                <>
                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Request type</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {REQUEST_TYPES.map((type) => (
                      <TouchableOpacity
                        key={type}
                        className={cn(
                          'rounded-xl border px-3 py-2.5',
                          requestType === type
                            ? 'bg-emerald-800 dark:bg-emerald-700 border-emerald-800 dark:border-emerald-700'
                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                        )}
                        onPress={() => setRequestType(type)}
                      >
                        <Text className={cn('text-[13px] font-bold', requestType === type ? 'text-white' : 'text-gray-700 dark:text-zinc-200')}>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Details</Text>
                  <TextInput
                    className="min-h-[96px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 pt-3 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900"
                    value={requestDetails}
                    onChangeText={setRequestDetails}
                    placeholder="Song, shoutout, karaoke details..."
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    multiline
                    textAlignVertical="top"
                  />

                  {requestType !== 'KARAOKE' && (
                    <>
                      <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Amount</Text>
                      <TextInput
                        className="min-h-[46px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900"
                        value={String(requestAmount)}
                        onChangeText={(value) => {
                          const num = Number(value.replace(/\D/g, '')) || 0;
                          setRequestAmount(Math.max(num, 0));
                        }}
                        keyboardType="numeric"
                      />
                      <Text className="text-gray-500 dark:text-zinc-400 text-[11px] mt-1 mb-0.5">Minimum ₦5,000</Text>

                      <PaymentAccountBlock vendor={vendor} copied={copiedAccount} onCopy={handleCopyAccount} />
                    </>
                  )}

                  <SubmitButton label="Submit Request" loading={isSubmitting} onPress={submitRequest} />
                </>
              )}

              {activePopup === 'tip' && (
                <>
                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Who are you tipping?</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {['Waiter', 'Bouncer', 'Services', 'Other'].map((recipient) => (
                      <TouchableOpacity
                        key={recipient}
                        className={cn(
                          'rounded-xl border px-3 py-2.5',
                          tipRecipient === recipient
                            ? 'bg-emerald-800 dark:bg-emerald-700 border-emerald-800 dark:border-emerald-700'
                            : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                        )}
                        onPress={() => setTipRecipient(recipient)}
                      >
                        <Text className={cn('text-[13px] font-bold', tipRecipient === recipient ? 'text-white' : 'text-gray-700 dark:text-zinc-200')}>{recipient}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {tipRecipient === 'Other' && (
                    <TextInput
                      className="min-h-[46px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900 mt-2"
                      value={customTipRecipient}
                      onChangeText={setCustomTipRecipient}
                      placeholder="Recipient name or role"
                      placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    />
                  )}

                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Amount</Text>
                  <TextInput
                    className="min-h-[46px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900"
                    value={String(tipAmount)}
                    onChangeText={(value) => setTipAmount(Number(value.replace(/\D/g, '')) || 0)}
                    keyboardType="numeric"
                  />
                  <View className="flex-row flex-wrap gap-2 mt-2">
                    {[100, 200, 500, 1000].map((amount) => (
                      <TouchableOpacity
                        key={amount}
                        className="rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2.5"
                        onPress={() => setTipAmount((current) => current + amount)}
                      >
                        <Text className="text-gray-700 dark:text-zinc-200 text-[13px] font-bold">+{money(amount)}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <PaymentAccountBlock vendor={vendor} copied={copiedAccount} onCopy={handleCopyAccount} />

                  <SubmitButton label="Submit Tip" loading={isSubmitting} onPress={submitTip} />
                </>
              )}

              {activePopup === 'feedback' && (
                <>
                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase text-center">Stars rating</Text>
                  <View className="flex-row justify-center gap-3.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <TouchableOpacity key={star} onPress={() => setRating(star)}>
                        <Star
                          size={32}
                          color={star <= rating ? '#F59E0B' : (isDark ? '#52525B' : '#D1D5DB')}
                          fill={star <= rating ? '#F59E0B' : 'none'}
                          strokeWidth={1.5}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text className="text-gray-600 dark:text-zinc-400 text-xs font-extrabold mt-3 mb-2 uppercase">Describe your experience</Text>
                  <TextInput
                    className="min-h-[96px] rounded-xl border border-gray-200 dark:border-zinc-700 px-3.5 pt-3 text-gray-900 dark:text-zinc-100 text-sm bg-white dark:bg-zinc-900"
                    value={feedbackText}
                    onChangeText={setFeedbackText}
                    placeholder="How was the food, service, and vibe?"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    multiline
                    textAlignVertical="top"
                  />

                  <SubmitButton label="Submit Rating" loading={isSubmitting} onPress={submitFeedback} />
                </>
              )}

              {activePopup === 'events' && (
                <>
                  {totalEvents === 0 ? (
                    <View className="items-center py-8 px-4">
                      <Text className="text-gray-900 dark:text-white text-base font-extrabold mb-1.5">No events yet</Text>
                      <Text className="text-gray-500 dark:text-zinc-400 text-[13px] text-center leading-[19px]">Events will appear here when the venue publishes a weekly schedule.</Text>
                    </View>
                  ) : (
                    DAYS_OF_WEEK.map((day) => {
                      const events = weeklyEvents?.[day] ?? [];
                      if (events.length === 0) return null;
                      return (
                        <View key={day} className="border border-gray-200 dark:border-zinc-700 rounded-2xl overflow-hidden mb-3">
                          <Text className="bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white text-sm font-extrabold px-3 py-2.5">{day}</Text>
                          {events.map((event) => (
                            <View key={event.id} className="flex-row gap-2.5 px-3 py-2.5 border-t border-gray-100 dark:border-zinc-700">
                              <Text className="text-emerald-700 dark:text-emerald-300 text-xs font-black min-w-[54px]">{event.time}</Text>
                              <View className="flex-1">
                                <Text className="text-gray-900 dark:text-white text-[13px] font-extrabold">{event.name}</Text>
                                {!!event.description && <Text className="text-gray-500 dark:text-zinc-400 text-xs mt-0.5">{event.description}</Text>}
                              </View>
                            </View>
                          ))}
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* PAYMENT PENDING MODAL (Paystack & Bank Transfer) */}
      {pendingPayment && (
        <Modal
          visible={!!pendingPayment}
          transparent
          animationType="fade"
          onRequestClose={() => setPendingPayment(null)}
        >
          <Pressable
            className="flex-1 bg-black/60 justify-center items-center p-4"
            onPress={() => setPendingPayment(null)}
          >
            <Pressable
              className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-gray-200 dark:border-zinc-800 shadow-2xl"
              onPress={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <View className="flex-row items-center justify-between pb-3 border-b border-gray-100 dark:border-zinc-800">
                <View className="flex-row items-center gap-2.5">
                  <View className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center">
                    {pendingPayment.type === 'TIP' ? (
                      <HandCoins size={20} color="#059669" strokeWidth={2.5} />
                    ) : (
                      <Music2 size={20} color="#059669" strokeWidth={2.5} />
                    )}
                  </View>
                  <View>
                    <Text className="text-base font-bold text-gray-900 dark:text-white">Complete Payment</Text>
                    <Text className="text-[11px] text-gray-500 dark:text-zinc-400">Transaction Pending</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setPendingPayment(null)}
                  className="p-1.5 rounded-full bg-gray-100 dark:bg-zinc-800"
                >
                  <X size={16} color={isDark ? '#D4D4D8' : '#6B7280'} />
                </TouchableOpacity>
              </View>

              {/* Service Requested Summary */}
              <View className="bg-gray-50 dark:bg-zinc-800/60 rounded-2xl p-3.5 my-3.5 border border-gray-100 dark:border-zinc-800">
                <View className="flex-row justify-between items-start mb-1.5">
                  <Text className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Item:</Text>
                  <Text className="text-xs font-bold text-gray-900 dark:text-white text-right flex-1 ml-2" numberOfLines={2}>
                    {pendingPayment.title}
                  </Text>
                </View>
                <View className="flex-row justify-between items-center pt-2 border-t border-gray-200/60 dark:border-zinc-700/60">
                  <Text className="text-xs text-gray-500 dark:text-zinc-400 font-medium">Amount Due:</Text>
                  <Text className="text-lg font-extrabold text-primary">
                    ₦{pendingPayment.amount.toLocaleString()}
                  </Text>
                </View>
              </View>

              {/* Pay with Paystack Button */}
              <TouchableOpacity
                className={cn(
                  'bg-emerald-600 rounded-xl py-3.5 px-4 items-center flex-row justify-center gap-2 shadow-sm mb-3',
                  isPayingOnline && 'opacity-70',
                )}
                onPress={handlePayOnline}
                disabled={isPayingOnline}
                activeOpacity={0.85}
              >
                {isPayingOnline ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <CreditCard size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text className="text-white font-bold text-[15px]">
                      Pay ₦{pendingPayment.amount.toLocaleString()} with Paystack
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Or Divider */}
              <View className="flex-row items-center gap-2 mb-1">
                <View className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
                <Text className="text-[10px] font-semibold tracking-wider text-gray-400 dark:text-zinc-500 uppercase">
                  Or Transfer to Store Bank
                </Text>
                <View className="flex-1 h-px bg-gray-200 dark:bg-zinc-800" />
              </View>

              {/* Payment Account Block */}
              <PaymentAccountBlock
                vendor={vendor}
                copied={copiedAccount}
                onCopy={handleCopyAccount}
              />

              <TouchableOpacity
                onPress={() => setPendingPayment(null)}
                className="py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 items-center mt-3"
              >
                <Text className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Close / I'll Pay Later</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

function PaymentAccountBlock({
  vendor,
  copied,
  onCopy,
}: {
  vendor?: {
    name?: string;
    bankName?: string;
    accountNumber?: string;
    bankAccounts?: BankAccount[];
  } | null;
  copied: boolean;
  onCopy: () => void;
}) {
  const accounts = React.useMemo(() => {
    if (vendor?.bankAccounts && vendor.bankAccounts.length > 0) {
      return vendor.bankAccounts;
    }
    if (vendor?.bankName && vendor?.accountNumber) {
      return [{
        bankName: vendor.bankName,
        accountNumber: vendor.accountNumber,
        accountName: vendor.name,
        isPrimary: true,
      }];
    }
    return [];
  }, [vendor]);

  const [selectedIdx, setSelectedIdx] = useState(0);
  const [copiedLocal, setCopiedLocal] = useState(false);

  if (accounts.length === 0) return null;

  const current = accounts[selectedIdx] || accounts[0];

  const handleCopyAccount = async () => {
    await Clipboard.setStringAsync(current.accountNumber);
    setCopiedLocal(true);
    setTimeout(() => setCopiedLocal(false), 2000);
    onCopy();
  };

  return (
    <View className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-3 mt-3.5 gap-1">
      <View className="flex-row justify-between items-center">
        <Text className="text-emerald-800 dark:text-emerald-300 text-[11px] font-extrabold uppercase">Payment account</Text>
        {accounts.length > 1 && (
          <Text className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">{accounts.length} accounts</Text>
        )}
      </View>

      {accounts.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-1.5 py-1">
          {accounts.map((acc, idx) => {
            const isSel = idx === selectedIdx;
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => {
                  setSelectedIdx(idx);
                  setCopiedLocal(false);
                }}
                className={cn(
                  'px-2.5 py-1 rounded-lg border',
                  isSel
                    ? 'bg-emerald-700 border-emerald-700'
                    : 'bg-white dark:bg-zinc-800 border-emerald-200 dark:border-emerald-800'
                )}
              >
                <Text className={cn('text-xs font-bold', isSel ? 'text-white' : 'text-emerald-800 dark:text-emerald-300')}>
                  {acc.bankName}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      <Text className="text-gray-700 dark:text-zinc-200 text-[13px] font-semibold">{current.bankName}</Text>
      <Text className="text-gray-700 dark:text-zinc-200 text-[13px] font-semibold">{current.accountName || vendor?.name}</Text>
      <TouchableOpacity
        onPress={handleCopyAccount}
        activeOpacity={0.65}
        className="flex-row items-center justify-between mt-0.5"
      >
        <Text className="text-emerald-800 dark:text-emerald-300 text-base font-black">{current.accountNumber}</Text>
        {copied || copiedLocal ? (
          <View className="flex-row items-center gap-1">
            <Check size={14} color="#059669" strokeWidth={2.5} />
            <Text className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">Copied!</Text>
          </View>
        ) : (
          <Copy size={16} color="#059669" strokeWidth={2.2} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function SubmitButton({
  label,
  loading,
  onPress,
}: {
  label: string;
  loading: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="min-h-[50px] rounded-xl bg-primary justify-center items-center mt-[18px]" onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text className="text-white text-[15px] font-extrabold">{label}</Text>}
    </TouchableOpacity>
  );
}
