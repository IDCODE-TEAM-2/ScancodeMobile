import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Share,
  StatusBar,
} from 'react-native';
import {
  Calendar,
  MapPin,
  Ticket,
  Sparkles,
  CheckCircle2,
  ChevronLeft,
  Share2,
  Clock,
  Info,
  User,
  Check,
  AlertCircle,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  getStorefrontBySlug,
  getEventDetails,
  getRegistrationForm,
  rsvpGuest,
  getPublicAccessContent,
  type StorefrontResponse,
  type EventDetailsResponse,
  type RegistrationFormResponse,
  type PublicAccessContentResponse,
} from '../../api';
import { parseStorefrontData } from '../../utils/parseStorefrontData';
import { useAppContext } from '../../context/AppContext';
import AppImage from '../../components/AppImage';
import type { NavigationProp, RouteProps } from '../../types';

interface Props {
  navigation: NavigationProp<'EventDetails'>;
  route: RouteProps<'EventDetails'>;
}

export default function EventDetailsScreen({ navigation, route }: Props) {
  const { slug } = route.params;
  const { isDark } = useAppContext();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [storefront, setStorefront] = useState<StorefrontResponse | null>(null);
  const [details, setDetails] = useState<EventDetailsResponse | null>(null);
  const [form, setForm] = useState<RegistrationFormResponse | null>(null);
  const [accessContent, setAccessContent] = useState<PublicAccessContentResponse[]>([]);

  // Registration form inputs
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTier, setSelectedTier] = useState<string>('General Admission');
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [rsvpSuccess, setRsvpSuccess] = useState<{
    name: string;
    ticketTier: string;
    guestCode?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchEvent = async () => {
      setLoading(true);
      setError(null);
      try {
        const sf = await getStorefrontBySlug(slug);
        if (cancelled) return;
        setStorefront(sf);

        const [eventDet, regForm, content] = await Promise.all([
          getEventDetails(sf.id).catch(() => null),
          getRegistrationForm(sf.id).catch(() => null),
          getPublicAccessContent(sf.id).catch(() => []),
        ]);

        if (cancelled) return;
        setDetails(eventDet);
        setForm(regForm);
        setAccessContent(content || []);

        // Pick initial tier
        if (regForm && regForm.ticketTiers && regForm.ticketTiers.length > 0) {
          setSelectedTier(regForm.ticketTiers[0]);
        } else {
          const parsed = parseStorefrontData(sf.data);
          if (Array.isArray(parsed.ticketTiers) && parsed.ticketTiers.length > 0) {
            setSelectedTier(parsed.ticketTiers[0]);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load event details.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchEvent();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  const parsedData = useMemo(() => {
    return storefront ? parseStorefrontData(storefront.data) : {};
  }, [storefront]);

  const banner = useMemo(() => {
    if (!storefront) return undefined;
    return (
      storefront.bannerUrl ||
      (parsedData.images && parsedData.images[0]) ||
      storefront.logoUrl ||
      undefined
    );
  }, [storefront, parsedData]);

  const venueText = useMemo(() => {
    if (details?.venue) return details.venue;
    if (typeof parsedData.venue === 'string' && parsedData.venue) return parsedData.venue;
    if (parsedData.location) return parsedData.location;
    return 'Venue to be announced';
  }, [details, parsedData]);

  const dateText = useMemo(() => {
    const raw = details?.eventDate || (typeof parsedData.eventDate === 'string' ? parsedData.eventDate : '');
    if (!raw) return 'Date to be announced';
    try {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
    } catch {
      // fallback
    }
    return raw;
  }, [details, parsedData]);

  const availableTiers = useMemo(() => {
    if (form?.ticketTiers && form.ticketTiers.length > 0) {
      return form.ticketTiers;
    }
    if (Array.isArray(parsedData.ticketTiers) && parsedData.ticketTiers.length > 0) {
      return parsedData.ticketTiers as string[];
    }
    return ['General Admission', 'VIP'];
  }, [form, parsedData]);

  const handleShare = async () => {
    if (!storefront) return;
    try {
      await Share.share({
        title: storefront.name,
        message: `Join me at ${storefront.name} on ScanCode!\nDate: ${dateText}\nVenue: ${venueText}`,
      });
    } catch {
      // dismissed
    }
  };

  const handleRsvpSubmit = async () => {
    if (!storefront) return;

    if (!fullName.trim()) {
      Toast.show({ type: 'error', text1: 'Name Required', text2: 'Please enter your full name.' });
      return;
    }
    if (!email.trim() && !phone.trim()) {
      Toast.show({ type: 'error', text1: 'Contact Required', text2: 'Please provide either an email or phone number.' });
      return;
    }

    // Validate required custom fields
    if (form?.fields) {
      for (const field of form.fields) {
        if (field.required && !customResponses[field.key]?.trim()) {
          Toast.show({
            type: 'error',
            text1: 'Field Required',
            text2: `Please fill in "${field.label}".`,
          });
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const resp = await rsvpGuest(storefront.id, {
        name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ticketTier: selectedTier,
        responses: customResponses,
      });

      setRsvpSuccess({
        name: resp.name || fullName.trim(),
        ticketTier: resp.ticketTier || selectedTier,
        guestCode: (resp as any).guestCode || `EV-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
      });

      Toast.show({
        type: 'success',
        text1: 'RSVP Confirmed!',
        text2: 'Your access pass has been reserved.',
      });
    } catch (err: unknown) {
      Toast.show({
        type: 'error',
        text1: 'Registration Failed',
        text2: err instanceof Error ? err.message : 'Could not submit RSVP. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white dark:bg-[#09090B] items-center justify-center">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator size="large" color="#059669" />
        <Text className="text-sm font-medium text-gray-500 dark:text-zinc-400 mt-3">Loading event details...</Text>
      </View>
    );
  }

  if (error || !storefront) {
    return (
      <View className="flex-1 bg-white dark:bg-[#09090B] p-6 justify-center items-center">
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <AlertCircle size={44} color="#EF4444" strokeWidth={1.8} />
        <Text className="text-lg font-bold text-gray-900 dark:text-white mt-3">Event Not Found</Text>
        <Text className="text-sm text-gray-500 dark:text-zinc-400 text-center mt-1.5 mb-6">
          {error || 'The requested event could not be found or has ended.'}
        </Text>
        <TouchableOpacity
          className="bg-emerald-600 px-6 py-3 rounded-xl"
          onPress={() => navigation.goBack()}
        >
          <Text className="text-white font-bold text-sm">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-[#09090B]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView contentContainerClassName="pb-16" showsVerticalScrollIndicator={false}>
        {/* Hero Visual Header */}
        <View className="w-full h-72 bg-indigo-950 relative justify-center items-center overflow-hidden">
          {banner ? (
            <AppImage
              uri={banner}
              className="w-full h-full"
              fallbackIcon={<Ticket size={48} color="#9CA3AF" strokeWidth={1.5} />}
            />
          ) : (
            <View className="items-center justify-center">
              <Sparkles size={48} color="#9CA3AF" strokeWidth={1.5} />
            </View>
          )}

          {/* Dark Overlay */}
          <View className="absolute inset-0 bg-black/40" />

          {/* Top Floating Controls */}
          <View className="absolute top-12 left-4 right-4 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md items-center justify-center border border-white/20 shadow"
            >
              <ChevronLeft size={22} color="#FFFFFF" strokeWidth={2.5} />
            </TouchableOpacity>

            <View className="flex-row items-center gap-2">
              <TouchableOpacity
                onPress={handleShare}
                activeOpacity={0.8}
                className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md items-center justify-center border border-white/20 shadow"
              >
                <Share2 size={18} color="#FFFFFF" strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Badge Over Banner */}
          <View className="absolute bottom-4 left-4 right-4 flex-row items-end justify-between">
            <View className="flex-row items-center gap-2">
              {storefront.logoUrl && (
                <View className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white shadow bg-white">
                  <AppImage uri={storefront.logoUrl} className="w-full h-full" />
                </View>
              )}
              <View className="bg-emerald-600/90 backdrop-blur-md px-3 py-1 rounded-full flex-row items-center gap-1.5 shadow">
                <Ticket size={12} color="#FFFFFF" strokeWidth={2.5} />
                <Text className="text-[11px] font-extrabold text-white uppercase tracking-wider">
                  {details?.eventType || (parsedData.eventType as string) || 'Event'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Container */}
        <View className="px-4 pt-5">
          {/* Title & Host */}
          <View className="mb-4">
            <Text className="text-2xl font-black text-gray-900 dark:text-white tracking-tight leading-8">
              {storefront.name}
            </Text>
            <View className="flex-row items-center gap-1.5 mt-1.5">
              <User size={13} color={isDark ? '#A1A1AA' : '#6B7280'} />
              <Text className="text-xs font-semibold text-gray-500 dark:text-zinc-400">
                Organized by {storefront.name}
              </Text>
            </View>
          </View>

          {/* Logistics Quick Cards */}
          <View className="flex-row gap-2.5 mb-5">
            {/* Date Card */}
            <View className="flex-1 bg-white dark:bg-[#18181B] rounded-2xl p-3.5 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <View className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 items-center justify-center mb-2">
                <Calendar size={16} color={isDark ? '#C084FC' : '#7C3AED'} strokeWidth={2.2} />
              </View>
              <Text className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Date</Text>
              <Text className="text-xs font-bold text-gray-900 dark:text-white mt-0.5" numberOfLines={2}>
                {dateText}
              </Text>
            </View>

            {/* Venue Card */}
            <View className="flex-1 bg-white dark:bg-[#18181B] rounded-2xl p-3.5 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <View className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 items-center justify-center mb-2">
                <MapPin size={16} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
              </View>
              <Text className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Venue</Text>
              <Text className="text-xs font-bold text-gray-900 dark:text-white mt-0.5" numberOfLines={2}>
                {venueText}
              </Text>
            </View>
          </View>

          {/* Event Description Card */}
          <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-5 border border-gray-200 dark:border-zinc-800 shadow-sm">
            <View className="flex-row items-center gap-2 mb-2.5">
              <Info size={16} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
              <Text className="text-sm font-bold text-gray-900 dark:text-white">About This Event</Text>
            </View>
            <Text className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed font-normal">
              {storefront.description ||
                'Join us for this special event. Reserve your spot below to receive your digital guest pass and stay updated on announcements.'}
            </Text>
          </View>

          {/* Weekly / Day Agenda Schedule if configured */}
          {parsedData.weeklyEvents && Object.keys(parsedData.weeklyEvents).length > 0 && (
            <View className="bg-white dark:bg-[#18181B] rounded-2xl p-4 mb-5 border border-gray-200 dark:border-zinc-800 shadow-sm">
              <View className="flex-row items-center gap-2 mb-3">
                <Clock size={16} color={isDark ? '#FBBF24' : '#D97706'} strokeWidth={2.2} />
                <Text className="text-sm font-bold text-gray-900 dark:text-white">Schedule & Highlights</Text>
              </View>
              {Object.entries(parsedData.weeklyEvents).map(([day, dayEvents]) => {
                const list = dayEvents as any[];
                if (!list || list.length === 0) return null;
                return (
                  <View key={day} className="mb-3 last:mb-0">
                    <Text className="text-xs font-black uppercase text-emerald-600 dark:text-emerald-400 mb-1 tracking-wide">
                      {day}
                    </Text>
                    {list.map((ev, idx) => (
                      <View
                        key={idx}
                        className="flex-row items-start gap-2.5 bg-gray-50 dark:bg-zinc-900/70 p-2.5 rounded-xl mb-1.5"
                      >
                        <View className="bg-gray-200 dark:bg-zinc-800 px-2 py-0.5 rounded text-center">
                          <Text className="text-[11px] font-bold text-gray-700 dark:text-zinc-300">
                            {ev.time || 'All Day'}
                          </Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-xs font-bold text-gray-900 dark:text-white">{ev.name}</Text>
                          {ev.description ? (
                            <Text className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                              {ev.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          )}

          {/* RSVP / Registration Pass Section */}
          <View className="bg-white dark:bg-[#18181B] rounded-2xl p-5 border border-gray-200 dark:border-zinc-800 shadow-sm">
            {rsvpSuccess ? (
              <View className="items-center py-4">
                <View className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center mb-3">
                  <CheckCircle2 size={32} color="#059669" strokeWidth={2.5} />
                </View>
                <Text className="text-lg font-bold text-gray-900 dark:text-white text-center">
                  You're on the Guest List!
                </Text>
                <Text className="text-xs text-gray-500 dark:text-zinc-400 text-center mt-1 mb-4 max-w-xs">
                  Your access pass has been confirmed. Show this screen or check your contact details upon entry.
                </Text>

                <View className="w-full bg-gray-50 dark:bg-zinc-900/80 rounded-xl p-4 border border-dashed border-emerald-500/50 mb-4">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs text-gray-400 dark:text-zinc-500">Attendee</Text>
                    <Text className="text-xs font-bold text-gray-900 dark:text-white">{rsvpSuccess.name}</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-xs text-gray-400 dark:text-zinc-500">Tier</Text>
                    <View className="bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded">
                      <Text className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        {rsvpSuccess.ticketTier}
                      </Text>
                    </View>
                  </View>
                  {rsvpSuccess.guestCode && (
                    <View className="flex-row justify-between items-center pt-2 border-t border-gray-200 dark:border-zinc-800">
                      <Text className="text-xs text-gray-400 dark:text-zinc-500">Pass Code</Text>
                      <Text className="text-sm font-black text-gray-900 dark:text-white tracking-widest">
                        {rsvpSuccess.guestCode}
                      </Text>
                    </View>
                  )}
                </View>

                {accessContent.length > 0 && (
                  <View className="w-full bg-purple-50 dark:bg-purple-950/40 rounded-xl p-3.5 border border-purple-200 dark:border-purple-900/50">
                    <View className="flex-row items-center gap-1.5 mb-1">
                      <Sparkles size={14} color="#7C3AED" strokeWidth={2.2} />
                      <Text className="text-xs font-bold text-purple-900 dark:text-purple-200">Exclusive Access Info</Text>
                    </View>
                    {accessContent.map((c) => (
                      <Text key={c.id} className="text-xs text-purple-800 dark:text-purple-300 mt-1">
                        • {c.title}: {c.body}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <View>
                <View className="flex-row items-center gap-2 mb-1">
                  <Ticket size={18} color={isDark ? '#34D399' : '#059669'} strokeWidth={2.2} />
                  <Text className="text-base font-bold text-gray-900 dark:text-white">
                    {form?.title || 'RSVP & Guest Pass'}
                  </Text>
                </View>
                <Text className="text-xs text-gray-500 dark:text-zinc-400 mb-4">
                  {form?.description || 'Reserve your entry pass. No app download or payment required.'}
                </Text>

                {/* Ticket Tier Chips */}
                {availableTiers.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-2">
                      Select Ticket Tier <Text className="text-red-500">*</Text>
                    </Text>
                    <View className="flex-row flex-wrap gap-2">
                      {availableTiers.map((tier) => {
                        const isSelected = selectedTier === tier;
                        return (
                          <TouchableOpacity
                            key={tier}
                            onPress={() => setSelectedTier(tier)}
                            className={`px-3 py-2 rounded-xl border flex-row items-center gap-1.5 ${
                              isSelected
                                ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-600'
                                : 'bg-gray-50 dark:bg-zinc-900 border-gray-200 dark:border-zinc-800'
                            }`}
                          >
                            {isSelected && <Check size={13} color="#059669" strokeWidth={3} />}
                            <Text
                              className={`text-xs font-bold ${
                                isSelected
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-gray-700 dark:text-zinc-300'
                              }`}
                            >
                              {tier}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Standard Registration Fields */}
                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Full Name <Text className="text-red-500">*</Text>
                  </Text>
                  <TextInput
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder="Enter your name"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    className="h-11 px-3.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white"
                  />
                </View>

                <View className="mb-3">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Email Address
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="name@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    className="h-11 px-3.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white"
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                    Phone Number
                  </Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="e.g. 08012345678"
                    keyboardType="phone-pad"
                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                    className="h-11 px-3.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white"
                  />
                </View>

                {/* Custom Form Fields if present */}
                {form?.fields &&
                  form.fields.map((field) => (
                    <View key={field.key} className="mb-3">
                      <Text className="text-xs font-semibold text-gray-700 dark:text-zinc-300 mb-1.5">
                        {field.label} {field.required && <Text className="text-red-500">*</Text>}
                      </Text>
                      <TextInput
                        value={customResponses[field.key] || ''}
                        onChangeText={(val) =>
                          setCustomResponses((prev) => ({ ...prev, [field.key]: val }))
                        }
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                        placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                        className="h-11 px-3.5 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm text-gray-900 dark:text-white"
                      />
                    </View>
                  ))}

                {/* Submit Action */}
                <TouchableOpacity
                  onPress={handleRsvpSubmit}
                  disabled={submitting}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl items-center justify-center flex-row gap-2 mt-2 shadow"
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ticket size={16} color="#FFFFFF" strokeWidth={2.5} />
                      <Text className="text-white font-bold text-sm">Confirm RSVP & Pass</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
