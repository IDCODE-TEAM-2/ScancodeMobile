import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import { Calendar, MapPin, Sparkles, ImagePlus, Plus, X, ArrowLeft, Ticket, Check } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  createStorefront,
  saveEventDetails,
  saveRegistrationForm,
  createAccessPage,
  API_BASE,
  getToken,
  type EventType,
  type FormField,
} from '../../api';
import type { NavigationProp } from '../../types';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'CreateEvent'>;
}

const EVENT_TYPES: { type: EventType; label: string }[] = [
  { type: 'WEDDING', label: 'Wedding' },
  { type: 'CONCERT', label: 'Concert / Show' },
  { type: 'CONFERENCE', label: 'Conference / Summit' },
  { type: 'BIRTHDAY', label: 'Birthday / Party' },
  { type: 'CORPORATE', label: 'Corporate Event' },
  { type: 'SPORT', label: 'Sports Event' },
  { type: 'OTHER', label: 'Custom Event' },
];

export default function CreateEventScreen({ navigation }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<EventType>('CONFERENCE');
  const [eventDate, setEventDate] = useState('');
  const [venue, setVenue] = useState('');
  const [bannerUri, setBannerUri] = useState<string | null>(null);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Ticket Tiers management
  const [ticketTiers, setTicketTiers] = useState<string[]>(['General Admission', 'VIP']);
  const [newTierInput, setNewTierInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to upload event banners.');
      }
    })();
  }, []);

  const uploadBannerToBackend = async (uri: string): Promise<string> => {
    const token = await getToken();
    const response = await FileSystem.uploadAsync(`${API_BASE}/api/media/upload`, uri, {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      parameters: {
        public: 'true',
      },
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Banner upload failed. Please try again.');
    }

    const json = JSON.parse(response.body);
    return json.url as string;
  };

  const handlePickBanner = async () => {
    setFormError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setUploadingBanner(true);
        const uploadedUrl = await uploadBannerToBackend(result.assets[0].uri);
        setBannerUri(uploadedUrl);
      }
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to upload banner.');
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleAddTier = () => {
    const trimmed = newTierInput.trim();
    if (!trimmed) return;
    if (ticketTiers.includes(trimmed)) {
      Alert.alert('Tier Exists', 'This ticket tier has already been added.');
      return;
    }
    setTicketTiers([...ticketTiers, trimmed]);
    setNewTierInput('');
  };

  const handleRemoveTier = (tierToRemove: string) => {
    if (ticketTiers.length <= 1) {
      Alert.alert('Minimum Required', 'At least one ticket tier is required for registration.');
      return;
    }
    setTicketTiers(ticketTiers.filter((t) => t !== tierToRemove));
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      setFormError('Please enter an event title.');
      return;
    }
    if (!venue.trim()) {
      setFormError('Please enter the event venue or location.');
      return;
    }
    if (!eventDate.trim()) {
      setFormError('Please specify the event date (e.g. 2026-10-15 or Oct 15, 2026).');
      return;
    }

    setFormError(null);
    setLoading(true);

    try {
      // 1. Create top-level standalone EVENT storefront
      const eventStorefront = await createStorefront({
        businessType: 'EVENT',
        name: title.trim(),
        description: description.trim() || `${eventType} Event at ${venue.trim()}`,
        bannerUrl: bannerUri ?? undefined,
        logoUrl: bannerUri ?? undefined,
        data: {
          eventType,
          eventDate: eventDate.trim(),
          venue: venue.trim(),
          ticketTiers,
        },
      });

      // 2. Save structured event details
      try {
        await saveEventDetails(eventStorefront.id, {
          eventType,
          eventDate: eventDate.trim(),
          venue: venue.trim(),
          checkInEnabled: true,
          contentUnlockEnabled: true,
        });
      } catch {
        // Backend event-details optional fallback
      }

      // 3. Initialize default registration form fields
      const defaultFields: FormField[] = [
        { key: 'name', label: 'Full Name', type: 'TEXT', required: true, placeholder: 'Enter your full name' },
        { key: 'email', label: 'Email Address', type: 'EMAIL', required: true, placeholder: 'you@example.com' },
        { key: 'phone', label: 'Phone Number', type: 'PHONE', required: true, placeholder: '08012345678' },
      ];

      try {
        await saveRegistrationForm(eventStorefront.id, {
          eventTypeOverride: eventType,
          title: `${title.trim()} Registration`,
          description: `RSVP and access pass for ${title.trim()}`,
          fields: defaultFields,
          ticketTiers,
          isOpen: true,
        });
      } catch {
        // Fallback to legacy access page creation if demo or offline
        try {
          await createAccessPage(eventStorefront.id, {
            type: eventType === 'WEDDING' ? 'WEDDING' : eventType === 'CONCERT' ? 'CONCERT' : eventType === 'CONFERENCE' ? 'CONFERENCE' : 'CUSTOM',
            title: `${title.trim()} Access Pass`,
            description: `Event at ${venue.trim()}`,
            fields: [
              { id: 'f-1', label: 'Full Name', type: 'text', required: true },
              { id: 'f-2', label: 'Phone Number', type: 'text', required: true },
            ],
          });
        } catch {
          // ignore fallback error
        }
      }

      Alert.alert('Event Created! 🎉', `"${title.trim()}" is ready. You can now manage registrations, invite guests, and scan tickets at the door.`, [
        {
          text: 'Manage Event',
          onPress: () => {
            navigation.navigate('AccessPageManager', {
              storefrontId: eventStorefront.id,
              slug: eventStorefront.slug,
              name: eventStorefront.name,
            });
          },
        },
      ]);
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-[#09090B]"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="p-5 pb-16"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-extrabold text-gray-900 dark:text-white">Create New Event</Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Independent access pass &amp; guest registration — no store or products needed.
          </Text>
        </View>

        {formError && (
          <View className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-3.5 mb-5 flex-row items-center gap-2.5">
            <X size={18} color="#EF4444" />
            <Text className="text-red-700 dark:text-red-300 text-sm font-medium flex-1">{formError}</Text>
          </View>
        )}

        {/* Banner Upload */}
        <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
          Event Banner / Poster
        </Text>
        <TouchableOpacity
          className="w-full h-44 bg-white dark:bg-gray-900 rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-800 items-center justify-center overflow-hidden mb-6"
          onPress={handlePickBanner}
          activeOpacity={0.8}
        >
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} className="w-full h-full" resizeMode="cover" />
          ) : (
            <View className="items-center justify-center p-4">
              {uploadingBanner ? (
                <ActivityIndicator size="small" color="#059669" />
              ) : (
                <>
                  <ImagePlus size={32} color="#9CA3AF" />
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-300 mt-2">
                    Upload Event Cover Image
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">Recommended 16:9 ratio</Text>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        {/* Event Title */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Event Name *
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5 text-base text-gray-900 dark:text-white font-medium"
            placeholder="e.g. Lagos Tech Summit 2026 or Sarah's Wedding"
            placeholderTextColor="#9CA3AF"
            value={title}
            onChangeText={setTitle}
          />
        </View>

        {/* Event Type Chips */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Event Category
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-2 py-1">
            {EVENT_TYPES.map((t) => {
              const selected = eventType === t.type;
              return (
                <TouchableOpacity
                  key={t.type}
                  className={cn(
                    'flex-row items-center px-3.5 py-2.5 rounded-xl border mr-2',
                    selected
                      ? 'bg-emerald-600 border-emerald-600'
                      : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800'
                  )}
                  onPress={() => setEventType(t.type)}
                >
                  {/*<Text className="mr-1.5 text-base">{t.icon}</Text>*/}
                  <Text
                    className={cn(
                      'text-sm font-bold',
                      selected ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                    )}
                  >
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Date & Time */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Date &amp; Time *
          </Text>
          <View className="flex-row items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5">
            <Calendar size={18} color="#9CA3AF" className="mr-3" />
            <TextInput
              className="flex-1 text-base text-gray-900 dark:text-white font-medium ml-2"
              placeholder="e.g. October 24, 2026 @ 6:00 PM"
              placeholderTextColor="#9CA3AF"
              value={eventDate}
              onChangeText={setEventDate}
            />
          </View>
        </View>

        {/* Venue / Location */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Venue / Address *
          </Text>
          <View className="flex-row items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3.5">
            <MapPin size={18} color="#9CA3AF" className="mr-3" />
            <TextInput
              className="flex-1 text-base text-gray-900 dark:text-white font-medium ml-2"
              placeholder="e.g. Eko Hotel Grand Ballroom, Victoria Island"
              placeholderTextColor="#9CA3AF"
              value={venue}
              onChangeText={setVenue}
            />
          </View>
        </View>

        {/* Description */}
        <View className="mb-5">
          <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
            Description / Overview
          </Text>
          <TextInput
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-3 text-base text-gray-900 dark:text-white"
            placeholder="Give guests information about the schedule, dress code, or entrance directions..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Ticket Tiers */}
        <View className="mb-6">
          <View className="flex-row justify-between items-center mb-2">
            <Text className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
              Ticket / Access Tiers
            </Text>
            <Text className="text-xs text-gray-400">Attendees select a tier during RSVP</Text>
          </View>

          {/* List of current tiers */}
          <View className="flex-row flex-wrap gap-2 mb-3">
            {ticketTiers.map((tier) => (
              <View
                key={tier}
                className="flex-row items-center bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-3 py-1.5 gap-2"
              >
                <Ticket size={13} color="#059669" />
                <Text className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{tier}</Text>
                <TouchableOpacity onPress={() => handleRemoveTier(tier)} hitSlop={8}>
                  <X size={14} color="#059669" />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Add Tier Input */}
          <View className="flex-row gap-2">
            <TextInput
              className="flex-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white"
              placeholder="Add custom tier (e.g. VVIP, Table of 10)"
              placeholderTextColor="#9CA3AF"
              value={newTierInput}
              onChangeText={setNewTierInput}
              onSubmitEditing={handleAddTier}
            />
            <TouchableOpacity
              className="bg-gray-800 dark:bg-gray-700 rounded-xl px-4 py-2.5 items-center justify-center flex-row gap-1"
              onPress={handleAddTier}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text className="text-white text-xs font-bold">Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          className={cn(
            'bg-emerald-600 rounded-2xl py-4 items-center justify-center flex-row gap-2 shadow-sm',
            loading && 'opacity-75'
          )}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Sparkles size={18} color="#FFFFFF" />
              <Text className="text-white text-base font-extrabold">Create Event &amp; Access Page</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
