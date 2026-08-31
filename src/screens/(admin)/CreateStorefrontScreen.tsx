import React, { useEffect, useState } from 'react';
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
import { Picker } from '@react-native-picker/picker';
import { Camera, X, Plus, Info, Rocket, MapPin } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { createStorefront, API_BASE, getToken } from '../../api';
import { NIGERIA_STATES, type NavigationProp } from '../../types';
import * as FileSystem from 'expo-file-system/legacy';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'CreateStorefront'>;
}

const MAX_IMAGES = 5;
const BUSINESS_TYPES = ['PRODUCT', 'HOTEL'] as const;
type BusinessType = (typeof BUSINESS_TYPES)[number];

export default function CreateStorefrontScreen({ navigation }: Props) {
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const [imageUris, setImageUris] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('PRODUCT');
  const [categories, setCategories] = useState<string[]>([]);
  const [categoryInput, setCategoryInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const uploadImageToBackend = async (uri: string): Promise<string> => {
    const token = await getToken();

    const response = await FileSystem.uploadAsync(`${API_BASE}/api/media/upload`, uri, {
      fieldName: 'file',
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      parameters: {
        "public": "true",
      },
    });

    if (response.status !== 200 && response.status !== 201) {
      throw new Error('Upload failed. Please try again.');
    }

    const json = JSON.parse(response.body);
    return json.url as string;
  };

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to upload images.');
      }
    })();
  }, []);

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingLogo(true);
    setLogoError(null);
    try {
      const url = await uploadImageToBackend(result.assets[0].uri);
      setLogoUri(url);
    } catch (e: unknown) {
      setLogoError(e instanceof Error ? e.message : 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handlePickImages = async () => {
    if (imageUris.length >= MAX_IMAGES) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    const remaining = MAX_IMAGES - imageUris.length;
    const picked = result.assets.slice(0, remaining);

    setUploadingImages(true);
    setImageError(null);
    try {
      const uploaded = await Promise.all(picked.map((a) => uploadImageToBackend(a.uri)));
      setImageUris((prev) => [...prev, ...uploaded]);
    } catch (e: unknown) {
      setImageError(e instanceof Error ? e.message : 'Image upload failed. Please try again.');
    } finally {
      setUploadingImages(false);
    }
  };

  const handleRemoveImage = (idx: number) => {
    setImageUris((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed || categories.includes(trimmed)) return;
    setCategories((prev) => [...prev, trimmed]);
    setCategoryInput('');
  };

  const handleRemoveCategory = (cat: string) => {
    setCategories((prev) => prev.filter((c) => c !== cat));
  };

  const handleCreate = async () => {
    if (!logoUri) {
      setLogoError('Please upload a business logo before continuing.');
      return;
    }
    if (!name.trim()) {
      setFormError('Business name is required.');
      return;
    }
    if (!description.trim()) {
      setFormError('Please add a short business description.');
      return;
    }
    if (!location) {
      setFormError('Please select your business location.');
      return;
    }
    setFormError(null);
    setLoading(true);
    try {
      const categoryObjects = categories.map((cat) => ({
        id: cat.toLowerCase().replace(/\s+/g, '-'),
        name: cat,
        icon: '',
      }));
      await createStorefront({
        businessType,
        name: name.trim(),
        description: description.trim(),
        logoUrl: logoUri,
        bannerUrl: imageUris[0] ?? logoUri,
        data: {
          name: name.trim(),
          description: description.trim(),
          phone: phone.trim(),
          email: email.trim(),
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          images: imageUris,
          categories: categoryObjects,
          logoUrl: logoUri,
          location,
        },
      });
      navigation.goBack();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Failed to create storefront. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="p-5 pb-12"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text className="text-[22px] font-bold text-gray-900 text-center mb-1.5">Create Your Business Page</Text>
        <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
          Set up your storefront and payment receiving details
        </Text>

        {formError && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-sm leading-5">{formError}</Text>
          </View>
        )}

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Logo <Text className="text-red-600">*</Text></Text>
        {logoError && <Text className="text-red-600 text-[13px] mb-1.5 -mt-1">{logoError}</Text>}
        <View className="flex-row items-center gap-4 mb-5">
          <TouchableOpacity
            className="w-[88px] h-[88px] rounded-full bg-gray-100 border-2 border-gray-300 border-dashed items-center justify-center overflow-hidden"
            onPress={handlePickLogo}
            disabled={uploadingLogo || loading}
          >
            {uploadingLogo ? (
              <ActivityIndicator color="#6C63FF" />
            ) : logoUri ? (
              <Image source={{ uri: logoUri }} className="w-[88px] h-[88px] rounded-full" />
            ) : (
              <Camera size={28} color="#9CA3AF" strokeWidth={1.8} />
            )}
          </TouchableOpacity>
          <View className="flex-1">
            <TouchableOpacity
              className={cn('border-[1.5px] border-gray-300 rounded-[10px] py-2.5 px-4 self-start', (uploadingLogo || loading) && 'opacity-50')}
              onPress={handlePickLogo}
              disabled={uploadingLogo || loading}
            >
              <Text className="text-sm font-semibold text-gray-700">
                {uploadingLogo ? 'Uploading…' : logoUri ? 'Change Logo' : 'Upload Logo'}
              </Text>
            </TouchableOpacity>
            <Text className="text-xs text-gray-400 mb-4 mt-1">Max image size recommended: 10 MB.</Text>
          </View>
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">
          Storefront Images <Text className="text-gray-400 font-normal text-[13px]">(up to {MAX_IMAGES}, optional)</Text>
        </Text>
        {imageError && <Text className="text-red-600 text-[13px] mb-1.5 -mt-1">{imageError}</Text>}
        <View className="flex-row flex-wrap gap-2.5 mb-5">
          {imageUris.map((uri, idx) => (
            <View key={idx} className="w-[72px] h-[72px] rounded-[10px] overflow-hidden border border-gray-200">
              <Image source={{ uri }} className="w-full h-full" />
              <TouchableOpacity
                className="absolute top-[3px] right-[3px] bg-black/55 rounded-full w-[18px] h-[18px] items-center justify-center"
                onPress={() => handleRemoveImage(idx)}
              >
                <X size={10} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>
          ))}
          {imageUris.length < MAX_IMAGES && (
            <TouchableOpacity
              className={cn(
                'w-[72px] h-[72px] rounded-[10px] border-2 border-gray-300 border-dashed items-center justify-center bg-gray-50',
                (uploadingImages || loading) && 'opacity-50'
              )}
              onPress={handlePickImages}
              disabled={uploadingImages || loading}
            >
              {uploadingImages ? (
                <ActivityIndicator color="#9CA3AF" />
              ) : (
                <>
                  <Plus size={22} color="#9CA3AF" strokeWidth={2.2} />
                  <Text className="text-[10px] text-gray-400 mt-0.5">Add Image</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Name <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mama Ade's Kitchen"
          placeholderTextColor="#9CA3AF"
          editable={!loading}
          maxLength={100}
        />

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Description <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4 h-[90px]"
          value={description}
          onChangeText={setDescription}
          placeholder="Describe what your business sells or offers…"
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={3}
          editable={!loading}
          maxLength={500}
          textAlignVertical="top"
        />

        <View className="flex-row gap-3">
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">Phone Number</Text>
            <TextInput
              className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
              value={phone}
              onChangeText={setPhone}
              placeholder="e.g. 08000000000"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              keyboardType="phone-pad"
            />
          </View>
          <View className="flex-1">
            <Text className="text-sm font-semibold text-gray-700 mb-1.5">Email Address</Text>
            <TextInput
              className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
              value={email}
              onChangeText={setEmail}
              placeholder="info@company.com"
              placeholderTextColor="#9CA3AF"
              editable={!loading}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">
          Business Location <Text className="text-red-600">*</Text>
        </Text>
        <View className="flex-row items-center border-[1.5px] border-gray-300 rounded-xl bg-white mb-1 px-2">
          <MapPin size={16} color="#9CA3AF" strokeWidth={2} />
          <Picker
            selectedValue={location}
            onValueChange={(v) => setLocation(String(v))}
            enabled={!loading}
            style={{ flex: 1, color: location ? '#111827' : '#9CA3AF' }}
          >
            <Picker.Item label="Select a state…" value="" color="#9CA3AF" />
            {NIGERIA_STATES.map((state) => (
              <Picker.Item key={state} label={state} value={state} />
            ))}
          </Picker>
        </View>
        <Text className="text-xs text-gray-400 mb-4 mt-1">Helps customers find your storefront by location.</Text>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Type</Text>
        <View className="flex-row gap-2.5 mb-5">
          {BUSINESS_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              className={cn(
                'flex-1 border-[1.5px] rounded-xl py-3 items-center bg-white',
                businessType === t ? 'border-primary bg-violet-50' : 'border-gray-300'
              )}
              onPress={() => setBusinessType(t)}
              disabled={loading}
              activeOpacity={0.7}
            >
              <Text className={cn('font-semibold text-sm', businessType === t ? 'text-primary' : 'text-gray-500')}>
                {t === 'PRODUCT' ? 'Product' : 'Hotel'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">
          {businessType === 'PRODUCT' ? 'What types of goods will you offer?' : 'Room / Service Categories'}
        </Text>
        {categories.length > 0 && (
          <View className="flex-row flex-wrap gap-2 mb-2.5">
            {categories.map((cat, idx) => (
              <View key={idx} className="flex-row items-center gap-1.5 bg-indigo-100 rounded-full px-3 py-1.5">
                <Text className="text-indigo-800 text-[13px] font-medium">{cat}</Text>
                <TouchableOpacity onPress={() => handleRemoveCategory(cat)}>
                  <X size={12} color="#6C63FF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="flex-row gap-2 mb-1">
          <TextInput
            className="flex-1 border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white"
            value={categoryInput}
            onChangeText={setCategoryInput}
            placeholder={businessType === 'PRODUCT' ? "e.g. Sneakers" : "e.g. Single Room"}
            placeholderTextColor="#9CA3AF"
            editable={!loading}
            onSubmitEditing={handleAddCategory}
          />
          <TouchableOpacity className="bg-primary rounded-xl px-4.5 justify-center" onPress={handleAddCategory}>
            <Text className="text-white font-bold text-sm">Add</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-gray-400 mb-4 mt-1">Tap Add to set up menu categories.</Text>

        <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
          <Text className="text-[15px] font-bold text-gray-900 mb-0.5">Bank Account Details</Text>
          <Text className="text-[13px] text-gray-500 mb-3.5">For customer transfers</Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-3"
            value={bankName}
            onChangeText={setBankName}
            placeholder="Bank Name (e.g. Access Bank)"
            placeholderTextColor="#9CA3AF"
            editable={!loading}
          />
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white"
            value={accountNumber}
            onChangeText={(v) => setAccountNumber(v.replace(/\D/g, ''))}
            placeholder="Account Number (10 digits)"
            placeholderTextColor="#9CA3AF"
            editable={!loading}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        <View className="bg-indigo-50 rounded-xl p-3.5 mb-6 border border-indigo-200 flex-row items-start gap-2">
          <Info size={16} color="#3730A3" strokeWidth={2.2} />
          <Text className="text-indigo-800 text-[13px] leading-[19px] flex-1">
            After creating your storefront you'll need to activate your QR code.
          </Text>
        </View>

        <TouchableOpacity
          className={cn('rounded-2xl py-4.5 items-center flex-row justify-center gap-2', loading ? 'bg-primary/55' : 'bg-primary')}
          onPress={handleCreate}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text className="text-white text-base font-bold tracking-wide">Launch Storefront</Text>
              <Rocket size={17} color="#FFFFFF" strokeWidth={2.2} />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
