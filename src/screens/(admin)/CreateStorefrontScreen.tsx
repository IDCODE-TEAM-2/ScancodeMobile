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
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Camera, X, Plus, Info, MapPin, Check, Landmark, Trash2 } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { createStorefront, updateStorefront, getMyStorefronts } from '../../api';
import { NIGERIA_STATES, type NavigationProp, type RouteProps, type BankAccount } from '../../types';
import { parseStorefrontData, type StorefrontCategory } from '../../utils/parseStorefrontData';
import { isImageTooLarge } from '../../utils/validateImageSize';
import { uploadImageToBackend } from '../../utils/imageUpload';
import AppImage from '../../components/AppImage';
import GradientButton from '../../components/GradientButton';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'CreateStorefront'>;
  route: RouteProps<'CreateStorefront'>;
}

const MAX_IMAGES = 5;
const BUSINESS_TYPES = ['PRODUCT', 'HOTEL'] as const;
type BusinessType = (typeof BUSINESS_TYPES)[number];

interface BankAccountItem extends BankAccount {
  id: string;
}

export default function CreateStorefrontScreen({ navigation, route }: Props) {
  const editStorefrontId = route.params?.editStorefrontId;
  const isEditMode = editStorefrontId !== undefined;
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);

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
  
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>([
    { id: 'acc-1', bankName: '', accountNumber: '', accountName: '', isPrimary: true },
  ]);

  const [location, setLocation] = useState('');
  const [businessType, setBusinessType] = useState<BusinessType>('PRODUCT');
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [uploadingCatIdx, setUploadingCatIdx] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow photo library access to upload images.');
      }
    })();
  }, []);

  useEffect(() => {
    if (!isEditMode) return;
    (async () => {
      try {
        const mine = await getMyStorefronts();
        const existing = mine.find((s) => s.id === editStorefrontId);
        if (!existing) {
          Alert.alert('Not Found', 'Could not load this storefront for editing.');
          navigation.goBack();
          return;
        }
        const parsed = parseStorefrontData(existing.data);
        setLogoUri(existing.logoUrl ?? null);
        setImageUris(parsed.images ?? []);
        setName(existing.name);
        setDescription(existing.description ?? '');
        setPhone(parsed.phone ?? '');
        setEmail(parsed.email ?? '');

        if (parsed.bankAccounts && parsed.bankAccounts.length > 0) {
          setBankAccounts(parsed.bankAccounts.map((b, idx) => ({
            id: `acc-${idx}-${Date.now()}`,
            bankName: b.bankName,
            accountNumber: b.accountNumber,
            accountName: b.accountName || '',
            isPrimary: b.isPrimary ?? (idx === 0),
          })));
        } else if (parsed.bankName || parsed.accountNumber) {
          setBankAccounts([
            {
              id: 'acc-1',
              bankName: parsed.bankName ?? '',
              accountNumber: parsed.accountNumber ?? '',
              accountName: '',
              isPrimary: true,
            },
          ]);
        }

        setLocation(parsed.location ?? '');
        if (existing.businessType === 'PRODUCT' || existing.businessType === 'HOTEL') {
          setBusinessType(existing.businessType);
        }

        if (parsed.categories && parsed.categories.length > 0) {
          setCategories(parsed.categories);
        }
      } catch (e: unknown) {
        Alert.alert('Error', e instanceof Error ? e.message : 'Failed to load storefront details.');
        navigation.goBack();
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [isEditMode, editStorefrontId, navigation]);

  const handlePickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    if (isImageTooLarge(result.assets[0].fileSize)) {
      setLogoError('This image is larger than 3 MB. Please choose a smaller file.');
      return;
    }

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

    if (picked.some((a) => isImageTooLarge(a.fileSize))) {
      setImageError('One or more images are larger than 3 MB. Please choose smaller files.');
      return;
    }

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
    if (!trimmed || categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) return;
    const newCat: StorefrontCategory = {
      id: trimmed.toLowerCase().replace(/\s+/g, '-'),
      name: trimmed,
      icon: '',
    };
    setCategories((prev) => [...prev, newCat]);
    setCategoryInput('');
  };

  const handleRemoveCategory = (catId: string) => {
    setCategories((prev) => prev.filter((c) => c.id !== catId));
  };

  const handlePickCategoryImage = async (idx: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    if (isImageTooLarge(result.assets[0].fileSize)) {
      Alert.alert('Image Too Large', 'This image is larger than 3 MB. Please choose a smaller file.');
      return;
    }

    setUploadingCatIdx(idx);
    try {
      const url = await uploadImageToBackend(result.assets[0].uri);
      setCategories((prev) =>
        prev.map((cat, i) => (i === idx ? { ...cat, imageUrl: url } : cat))
      );
    } catch (e: unknown) {
      Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Category image upload failed.');
    } finally {
      setUploadingCatIdx(null);
    }
  };

  // ── Multi-Account Banking Helpers ──
  const handleAddBankAccount = () => {
    setBankAccounts((prev) => [
      ...prev,
      {
        id: `acc-${Date.now()}`,
        bankName: '',
        accountNumber: '',
        accountName: '',
        isPrimary: prev.length === 0,
      },
    ]);
  };

  const handleRemoveBankAccount = (id: string) => {
    setBankAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (next.length > 0 && !next.some((a) => a.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryAccount = (id: string) => {
    setBankAccounts((prev) =>
      prev.map((a) => ({ ...a, isPrimary: a.id === id }))
    );
  };

  const handleUpdateAccountField = (id: string, field: 'bankName' | 'accountNumber' | 'accountName', val: string) => {
    setBankAccounts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: val } : a))
    );
  };

  const handleSubmit = async () => {
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
      const validAccounts = bankAccounts.filter((a) => a.bankName.trim() && a.accountNumber.trim());
      const primaryAccount = validAccounts.find((a) => a.isPrimary) || validAccounts[0];

      const body = {
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
          bankName: primaryAccount ? primaryAccount.bankName.trim() : '',
          accountNumber: primaryAccount ? primaryAccount.accountNumber.trim() : '',
          bankAccounts: validAccounts.map((a) => ({
            bankName: a.bankName.trim(),
            accountNumber: a.accountNumber.trim(),
            accountName: a.accountName?.trim() || undefined,
            isPrimary: a.isPrimary ?? false,
          })),
          images: imageUris,
          categories,
          logoUrl: logoUri,
          location,
        },
      };
      if (isEditMode) {
        await updateStorefront(editStorefrontId, body);
      } else {
        await createStorefront(body);
      }
      navigation.goBack();
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : `Failed to ${isEditMode ? 'save changes' : 'create storefront'}. Please try again.`);
    } finally {
      setLoading(false);
    }
  };

  if (loadingExisting) {
    return (
      <View className="flex-1 bg-gray-50 items-center justify-center">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

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
        <Text className="text-[22px] font-bold text-gray-900 text-center mb-1.5">
          {isEditMode ? 'Edit Your Business Page' : 'Create Your Business Page'}
        </Text>
        <Text className="text-sm text-gray-500 text-center mb-6 leading-5">
          {isEditMode ? 'Update your storefront and payment receiving details' : 'Set up your storefront and payment receiving details'}
        </Text>

        {formError && (
          <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
            <Text className="text-red-600 text-sm leading-5">{formError}</Text>
          </View>
        )}

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Logo <Text className="text-red-600">*</Text></Text>
        {logoError && <Text className="text-red-600 text-xs mb-1.5 -mt-1">{logoError}</Text>}
        <View className="flex-row items-center gap-4 mb-5">
          <TouchableOpacity
            className="w-[88px] h-[88px] rounded-full bg-gray-100 border-2 border-gray-300 border-dashed items-center justify-center overflow-hidden"
            onPress={handlePickLogo}
            disabled={uploadingLogo || loading}
          >
            {uploadingLogo ? (
              <ActivityIndicator color="#059669" />
            ) : logoUri ? (
              <AppImage uri={logoUri} className="w-[88px] h-[88px] rounded-full" />
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
            <Text className="text-xs text-gray-400 mb-4 mt-1">Max image size: 3 MB.</Text>
          </View>
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">
          Storefront Images <Text className="text-gray-400 font-normal text-xs">(up to {MAX_IMAGES}, optional)</Text>
        </Text>
        {imageError && <Text className="text-red-600 text-xs mb-1.5 -mt-1">{imageError}</Text>}
        <View className="flex-row flex-wrap gap-2.5 mb-5">
          {imageUris.map((uri, idx) => (
            <View key={idx} className="w-[72px] h-[72px] rounded-[10px] overflow-hidden border border-gray-200">
              <AppImage uri={uri} className="w-full h-full" />
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
                  <Plus size={20} color="#9CA3AF" strokeWidth={2.2} />
                  <Text className="text-xs text-gray-400 mt-0.5">Add Image</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Name <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white mb-4"
          value={name}
          onChangeText={setName}
          placeholder="e.g. Mama Ade's Kitchen"
          placeholderTextColor="#9CA3AF"
          editable={!loading}
          maxLength={100}
        />

        <Text className="text-sm font-semibold text-gray-700 mb-1.5">Business Description <Text className="text-red-600">*</Text></Text>
        <TextInput
          className="border-[1.5px] border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white mb-4 h-[90px]"
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
              className="border-[1.5px] border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white mb-4"
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
              className="border-[1.5px] border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white mb-4"
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
        <View className="flex-row items-center border-[1.5px] border-gray-300 rounded-xl bg-white mb-1 px-2 h-12 overflow-hidden">
          <MapPin size={16} color="#9CA3AF" strokeWidth={2} />
          <Picker
            selectedValue={location}
            onValueChange={(v) => setLocation(String(v))}
            enabled={!loading}
            style={{ flex: 1, height: 48, color: location ? '#111827' : '#9CA3AF' }}
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
                businessType === t ? 'border-primary bg-emerald-50' : 'border-gray-300'
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
          {businessType === 'PRODUCT' ? 'Categories & Menu Sections' : 'Room / Service Categories'}
        </Text>
        {categories.length > 0 && (
          <View className="flex-col gap-2 mb-3">
            {categories.map((cat, idx) => (
              <View key={cat.id} className="flex-row items-center gap-2.5 bg-white border border-gray-200 rounded-xl p-2 pr-3">
                <TouchableOpacity
                  onPress={() => handlePickCategoryImage(idx)}
                  disabled={uploadingCatIdx === idx || loading}
                  className="w-10 h-10 rounded-lg bg-gray-50 border border-gray-300 border-dashed items-center justify-center overflow-hidden"
                  activeOpacity={0.7}
                >
                  {uploadingCatIdx === idx ? (
                    <ActivityIndicator size="small" color="#059669" />
                  ) : cat.imageUrl ? (
                    <AppImage uri={cat.imageUrl} className="w-10 h-10 rounded-lg" />
                  ) : (
                    <Camera size={16} color="#9CA3AF" strokeWidth={1.8} />
                  )}
                </TouchableOpacity>
                <View className="flex-1">
                  <Text className="text-gray-900 text-sm font-semibold">{cat.name}</Text>
                  <Text className="text-gray-400 text-[11px]">
                    {cat.imageUrl ? 'Photo uploaded • tap to change' : 'Tap camera to add image'}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleRemoveCategory(cat.id)} className="p-1">
                  <X size={15} color="#6B7280" strokeWidth={2.2} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
        <View className="flex-row gap-2 mb-1">
          <TextInput
            className="flex-1 border-[1.5px] border-gray-300 rounded-xl px-3 py-2.5 text-sm text-gray-900 bg-white"
            value={categoryInput}
            onChangeText={setCategoryInput}
            placeholder={businessType === 'PRODUCT' ? "e.g. Pastries & Desserts" : "e.g. Executive Suite"}
            placeholderTextColor="#9CA3AF"
            editable={!loading}
            maxLength={35}
            onSubmitEditing={handleAddCategory}
          />
          <TouchableOpacity className="bg-primary rounded-xl px-4 py-2.5 justify-center" onPress={handleAddCategory}>
            <Text className="text-white font-bold text-sm">Add</Text>
          </TouchableOpacity>
        </View>
        <Text className="text-xs text-gray-400 mb-5 mt-1">Tap Add to set up categories with optional photos.</Text>

        <View className="bg-gray-50 border border-gray-200 rounded-2xl p-4 mb-5">
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-base font-bold text-gray-900">Bank Account Details</Text>
            <TouchableOpacity
              onPress={handleAddBankAccount}
              className="flex-row items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1"
              activeOpacity={0.7}
            >
              <Plus size={13} color="#059669" strokeWidth={2.5} />
              <Text className="text-emerald-700 text-xs font-bold">Add Account</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-500 mb-3.5">
            For customer transfers. You can add multiple accounts and choose the primary one.
          </Text>

          {bankAccounts.map((acc, index) => (
            <View key={acc.id} className="bg-white border border-gray-200 rounded-xl p-3.5 mb-3">
              <View className="flex-row justify-between items-center mb-2.5">
                <View className="flex-row items-center gap-2">
                  <Landmark size={15} color="#059669" strokeWidth={2.2} />
                  <Text className="text-xs font-bold text-gray-700">Account #{index + 1}</Text>
                  {acc.isPrimary && (
                    <View className="bg-emerald-100 rounded-full px-2 py-0.5">
                      <Text className="text-[10px] font-bold text-emerald-800">PRIMARY</Text>
                    </View>
                  )}
                </View>
                <View className="flex-row items-center gap-2">
                  {!acc.isPrimary && (
                    <TouchableOpacity
                      onPress={() => handleSetPrimaryAccount(acc.id)}
                      className="border border-gray-200 rounded-lg px-2 py-1"
                    >
                      <Text className="text-[11px] font-semibold text-gray-600">Make Primary</Text>
                    </TouchableOpacity>
                  )}
                  {bankAccounts.length > 1 && (
                    <TouchableOpacity onPress={() => handleRemoveBankAccount(acc.id)} className="p-1">
                      <Trash2 size={15} color="#DC2626" strokeWidth={2} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <TextInput
                className="border-[1.5px] border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50 mb-2.5"
                value={acc.bankName}
                onChangeText={(v) => handleUpdateAccountField(acc.id, 'bankName', v)}
                placeholder="Bank Name (e.g. Access Bank, GTBank)"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />
              <TextInput
                className="border-[1.5px] border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50 mb-2.5"
                value={acc.accountNumber}
                onChangeText={(v) => handleUpdateAccountField(acc.id, 'accountNumber', v.replace(/\D/g, ''))}
                placeholder="Account Number (10 digits)"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
                keyboardType="number-pad"
                maxLength={10}
              />
              <TextInput
                className="border-[1.5px] border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 bg-gray-50"
                value={acc.accountName || ''}
                onChangeText={(v) => handleUpdateAccountField(acc.id, 'accountName', v)}
                placeholder="Account Name (optional)"
                placeholderTextColor="#9CA3AF"
                editable={!loading}
              />
            </View>
          ))}
        </View>

        {!isEditMode && (
          <View className="bg-emerald-50 rounded-xl p-3.5 mb-6 border border-emerald-200 flex-row items-start gap-2">
            <Info size={16} color="#374151" strokeWidth={2.2} />
            <Text className="text-emerald-800 text-[13px] leading-[19px] flex-1">
              After creating your storefront you'll need to activate your QR code.
            </Text>
          </View>
        )}

        <GradientButton
          className="rounded-xl"
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-bold tracking-wide">
              {isEditMode ? 'Save Changes' : 'Launch Storefront'}
            </Text>
          )}
        </GradientButton>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
