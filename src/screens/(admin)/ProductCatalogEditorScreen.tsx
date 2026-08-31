import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { Plus, Trash2, Pencil, X, Camera, EyeOff, Eye } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  API_BASE,
  getToken,
  type ProductResponse,
} from '../../api';
import type { NavigationProp, RouteProps } from '../../types';
import { useFocusRefresh } from '../../hooks/useFocusRefresh';
import { cn } from '../../utils/cn';

interface Props {
  navigation: NavigationProp<'ProductCatalogEditor'>;
  route: RouteProps<'ProductCatalogEditor'>;
}

interface ProductForm {
  name: string;
  description: string;
  price: string;
  stock: string;
  category: string;
  isPopular: boolean;
  imageUri: string | null;
}

const BLANK_FORM: ProductForm = {
  name: '',
  description: '',
  price: '',
  stock: '',
  category: '',
  isPopular: false,
  imageUri: null,
};

export default function ProductCatalogEditorScreen({ route }: Props) {
  const { storefrontId } = route.params;

  const [products, setProducts] = useState<ProductResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProductForm>(BLANK_FORM);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getProducts(storefrontId);
      setProducts(data);
    } catch {
      // Keep whatever's already in state if the load fails.
    } finally {
      setLoading(false);
    }
  }, [storefrontId]);

  useFocusRefresh(load);

  const openCreateForm = () => {
    setEditingId(null);
    setForm(BLANK_FORM);
    setError(null);
    setFormOpen(true);
  };

  const openEditForm = (p: ProductResponse) => {
    setEditingId(p.id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock: String(p.stock),
      category: p.category,
      isPopular: p.isPopular,
      imageUri: p.mediaUrls[0] ?? null,
    });
    setError(null);
    setFormOpen(true);
  };

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow photo library access to upload a product image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (result.canceled || !result.assets?.length) return;

    setUploadingImage(true);
    try {
      const token = await getToken();
      const response = await FileSystem.uploadAsync(`${API_BASE}/api/media/upload`, result.assets[0].uri, {
        fieldName: 'file',
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        parameters: { public: 'true' },
      });
      if (response.status !== 200 && response.status !== 201) {
        throw new Error('Upload failed. Please try again.');
      }
      const json = JSON.parse(response.body);
      setForm((prev) => ({ ...prev, imageUri: json.url as string }));
    } catch (e: unknown) {
      Alert.alert('Upload Failed', e instanceof Error ? e.message : 'Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError('Product name is required.');
      return;
    }
    const price = Number(form.price);
    const stock = Number(form.stock);
    if (!form.price.trim() || Number.isNaN(price) || price < 0) {
      setError('Enter a valid price.');
      return;
    }
    if (!form.stock.trim() || Number.isNaN(stock) || stock < 0) {
      setError('Enter a valid stock quantity.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const body = {
        name: form.name.trim(),
        description: form.description.trim(),
        price,
        stock,
        category: form.category.trim() || 'General',
        mediaUrls: form.imageUri ? [form.imageUri] : [],
        isPopular: form.isPopular,
      };
      if (editingId) {
        await updateProduct(storefrontId, editingId, body);
      } else {
        await createProduct(storefrontId, body);
      }
      setFormOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (p: ProductResponse) => {
    Alert.alert('Delete Product', `Remove "${p.name}" from your catalog?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(storefrontId, p.id);
          await load();
        },
      },
    ]);
  };

  const handleToggleDelist = async (p: ProductResponse) => {
    await updateProduct(storefrontId, p.id, { isDelisted: !p.isDelisted });
    await load();
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#059669" />
      </View>
    );
  }

  if (formOpen) {
    return (
      <KeyboardAvoidingView className="flex-1 bg-gray-50" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="p-5 pb-12" keyboardShouldPersistTaps="handled">
          <View className="flex-row justify-between items-center mb-5">
            <Text className="text-lg font-bold text-gray-900">{editingId ? 'Edit Product' : 'New Product'}</Text>
            <TouchableOpacity onPress={() => setFormOpen(false)} className="p-1">
              <X size={20} color="#4B5563" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          {error && (
            <View className="bg-red-50 border border-red-200 rounded-xl p-3 mb-4">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          )}

          <TouchableOpacity
            className="w-24 h-24 rounded-xl bg-gray-100 border-2 border-gray-300 border-dashed items-center justify-center overflow-hidden mb-4 self-start"
            onPress={handlePickImage}
            disabled={uploadingImage}
          >
            {uploadingImage ? (
              <ActivityIndicator color="#059669" />
            ) : form.imageUri ? (
              <Image source={{ uri: form.imageUri }} className="w-24 h-24" />
            ) : (
              <Camera size={24} color="#9CA3AF" strokeWidth={1.8} />
            )}
          </TouchableOpacity>

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Name <Text className="text-red-600">*</Text></Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
            value={form.name}
            onChangeText={(v) => setForm((p) => ({ ...p, name: v }))}
            placeholder="e.g. Jollof Rice & Chicken"
            placeholderTextColor="#9CA3AF"
          />

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Description</Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4 h-[80px]"
            value={form.description}
            onChangeText={(v) => setForm((p) => ({ ...p, description: v }))}
            placeholder="Describe this item…"
            placeholderTextColor="#9CA3AF"
            multiline
            textAlignVertical="top"
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">Price (₦) <Text className="text-red-600">*</Text></Text>
              <TextInput
                className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
                value={form.price}
                onChangeText={(v) => setForm((p) => ({ ...p, price: v.replace(/[^0-9.]/g, '') }))}
                placeholder="2500"
                placeholderTextColor="#9CA3AF"
                keyboardType="decimal-pad"
              />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-700 mb-1.5">Stock <Text className="text-red-600">*</Text></Text>
              <TextInput
                className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
                value={form.stock}
                onChangeText={(v) => setForm((p) => ({ ...p, stock: v.replace(/\D/g, '') }))}
                placeholder="50"
                placeholderTextColor="#9CA3AF"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text className="text-sm font-semibold text-gray-700 mb-1.5">Category</Text>
          <TextInput
            className="border-[1.5px] border-gray-300 rounded-xl px-3.5 py-3 text-[15px] text-gray-900 bg-white mb-4"
            value={form.category}
            onChangeText={(v) => setForm((p) => ({ ...p, category: v }))}
            placeholder="e.g. Main Course"
            placeholderTextColor="#9CA3AF"
          />

          <View className="flex-row justify-between items-center bg-white border-[1.5px] border-gray-200 rounded-xl px-3.5 py-3 mb-6">
            <Text className="text-sm font-semibold text-gray-700">Mark as Popular</Text>
            <Switch
              value={form.isPopular}
              onValueChange={(v) => setForm((p) => ({ ...p, isPopular: v }))}
              trackColor={{ false: '#D1D5DB', true: '#059669' }}
            />
          </View>

          <TouchableOpacity
            className={cn('rounded-2xl py-4 items-center', saving ? 'bg-primary/55' : 'bg-primary')}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? <ActivityIndicator color="#fff" /> : <Text className="text-white text-base font-bold">Save Product</Text>}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView contentContainerClassName="p-5 pb-28">
        {products.length === 0 ? (
          <View className="bg-white rounded-2xl p-6 items-center border border-gray-200 mt-4">
            <Text className="text-sm text-gray-500 text-center">No products yet. Add your first item below.</Text>
          </View>
        ) : (
          products.map((p) => (
            <View key={p.id} className="flex-row bg-white rounded-2xl p-3.5 mb-3 border border-gray-200">
              <View className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden items-center justify-center mr-3">
                {p.mediaUrls[0] ? (
                  <Image source={{ uri: p.mediaUrls[0] }} className="w-16 h-16" />
                ) : (
                  <Camera size={18} color="#D1D5DB" strokeWidth={1.8} />
                )}
              </View>
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-[15px] font-bold text-gray-900 flex-1" numberOfLines={1}>{p.name}</Text>
                  {p.isDelisted && (
                    <View className="bg-gray-100 rounded-full px-2 py-[2px]">
                      <Text className="text-[10px] font-bold text-gray-500">DELISTED</Text>
                    </View>
                  )}
                </View>
                <Text className="text-primary font-bold text-sm mt-0.5">₦{p.price.toLocaleString()}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">Stock: {p.stock} · {p.category}</Text>
              </View>
              <View className="justify-between items-end ml-2">
                <View className="flex-row gap-1.5">
                  <TouchableOpacity onPress={() => openEditForm(p)} className="w-8 h-8 rounded-full bg-emerald-50 items-center justify-center">
                    <Pencil size={14} color="#374151" strokeWidth={2} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(p)} className="w-8 h-8 rounded-full bg-red-50 items-center justify-center">
                    <Trash2 size={14} color="#DC2626" strokeWidth={2} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={() => handleToggleDelist(p)} className="flex-row items-center gap-1 mt-1.5">
                  {p.isDelisted ? (
                    <Eye size={13} color="#4B5563" strokeWidth={2} />
                  ) : (
                    <EyeOff size={13} color="#4B5563" strokeWidth={2} />
                  )}
                  <Text className="text-[11px] text-gray-500 font-medium">{p.isDelisted ? 'Relist' : 'Delist'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        className="absolute bottom-6 left-5 right-5 bg-primary rounded-xl py-4 items-center flex-row justify-center gap-2 shadow-lg"
        onPress={openCreateForm}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text className="text-white text-base font-bold">Add Product</Text>
      </TouchableOpacity>
    </View>
  );
}
