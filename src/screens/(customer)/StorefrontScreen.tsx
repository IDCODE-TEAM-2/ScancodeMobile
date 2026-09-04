import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
    Text,
    View,
    Image,
    ScrollView,
    FlatList,
    TouchableOpacity,
    TextInput,
    Alert,
    type NativeSyntheticEvent,
    type NativeScrollEvent,
} from 'react-native';
import { Heart, Search, ShoppingCart, MapPin, Package, Store, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StorefrontToolbar, { type WeeklyEvents } from '../../components/StorefrontToolbar';
import {
    getProducts,
    getStoreConfig,
    getStorefrontBySlug,
    type ProductResponse,
    type StorefrontResponse,
} from '../../api';
import { useCart, EMPTY_CART, EMPTY_FAVORITES } from '../../context/CartContext';
import { useAppContext } from '../../context/AppContext';
import { parseStorefrontData } from '../../utils/parseStorefrontData';
import type { NavigationProp, RouteProps, Vendor, Product } from '../../types';
import { cn } from '../../utils/cn';
import Skeleton from '../../components/Skeleton';
import BounceBadge from '../../components/BounceBadge';
import * as Haptics from '../../utils/haptics';
import ItemDetailsModalScreen, { type ItemDetailsModalHandle } from './ItemDetailsModalScreen';

export type { Vendor, Product } from '../../types';

export interface Category {
    id: string;
    name: string;
    icon: string;
    imageUrl?: string;
}

interface Props {
    navigation: NavigationProp<'Storefront'>;
    route: RouteProps<'Storefront'>;
}

function mapProduct(product: ProductResponse): Product {
    return {
        id: String(product.id),
        name: product.name,
        description: product.description,
        price: product.price,
        stock: product.stock,
        isDelisted: product.isDelisted,
        media: product.mediaUrls ?? [],
        category: product.category || 'General',
        isPopular: product.isPopular,
    };
}

function getCategoryIcon(category: string) {
    return category.trim().slice(0, 1).toUpperCase() || '#';
}

const HEADER_COLLAPSE_THRESHOLD = 150;

export default function StorefrontScreen({ navigation, route }: Props) {
    const { carts, favorites, addToCart: addToCartCtx, toggleFavorite: toggleFavoriteCtx } = useCart();
    const { isDark } = useAppContext();
    const itemDetailsRef = useRef<ItemDetailsModalHandle>(null);

    const slug = route.params?.slug?.trim() || '';
    const scannedTableCode = route.params?.tableCode;

    const [storefront, setStorefront] = useState<StorefrontResponse | null>(null);
    const [vendor, setVendor] = useState<Vendor | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [weeklyEvents, setWeeklyEvents] = useState<WeeklyEvents>({});
    const [vatRate, setVatRate] = useState<number>(0.075);
    const [deliveryFee, setDeliveryFee] = useState<number>(2000);
    const [isDeliveryEnabled, setIsDeliveryEnabled] = useState<boolean>(true);
    const [headerCollapsed, setHeaderCollapsed] = useState(false);
    const headerCollapsedRef = useRef(false);

    useEffect(() => {
        const fetchVendor = async () => {
            if (!slug) {
                setError('Storefront not found.');
                setIsLoading(false);
                return;
            }
            try {
                setIsLoading(true);
                setError(null);

                const storefrontData = await getStorefrontBySlug(slug);
                const customData = parseStorefrontData(storefrontData.data);

                setStorefront(storefrontData);
                setVendor({
                    name: storefrontData.name,
                    description: storefrontData.description,
                    phone: customData.phone ?? '',
                    email: customData.email ?? '',
                    bankName: customData.bankName ?? '',
                    accountNumber: customData.accountNumber ?? '',
                    images: customData.images ?? [],
                    logoUrl: storefrontData.logoUrl ?? undefined,
                    bannerUrl: storefrontData.bannerUrl ?? undefined,
                    estimatedDeliveryTime: customData.estimatedDeliveryTime ?? '20-30 minutes',
                });
                setWeeklyEvents(customData.weeklyEvents ?? {});

                const [productData, configData] = await Promise.all([
                    getProducts(storefrontData.id).catch(() => []),
                    getStoreConfig(storefrontData.id).catch(() => null),
                ]);

                const mapped = productData.filter((product) => !product.isDelisted).map(mapProduct);
                setProducts(mapped);

                if (configData) {
                    const rawVat = configData.vatRate ?? 7.5;
                    setVatRate(rawVat > 1 ? rawVat / 100 : rawVat);
                    setDeliveryFee(configData.deliveryFee ?? 2000);
                    setIsDeliveryEnabled(true);
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load storefront details.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchVendor();
    }, [slug]);

    const storefrontId = storefront?.id ?? 0;
    const cart = carts[storefrontId] ?? EMPTY_CART;
    const favoriteProductsList = favorites[storefrontId] ?? EMPTY_FAVORITES;
    const favoriteIds = useMemo(() => favoriteProductsList.map((p) => p.id), [favoriteProductsList]);

    const addToCart = (product: Product, qty: number = 1) => {
        const added = addToCartCtx(storefrontId, product, qty);
        if (added) {
            Haptics.tapLight();
        } else {
            Haptics.notifyWarning();
            Alert.alert("Limit Reached", `Only ${product.stock} items available in stock.`);
        }
    };

    const toggleFavorite = (product: Product) => {
        Haptics.tapLight();
        toggleFavoriteCtx(storefrontId, product);
    };

    const filteredProducts = useMemo(() => {
        const normalizedSearch = searchQuery.trim().toLowerCase();

        return products.filter((product) => {
            const matchesCategory =
                !activeCategory ||
                product.category.toLowerCase() === activeCategory.toLowerCase();
            const matchesSearch =
                !normalizedSearch ||
                product.name.toLowerCase().includes(normalizedSearch) ||
                product.description.toLowerCase().includes(normalizedSearch) ||
                product.category.toLowerCase().includes(normalizedSearch);

            return matchesCategory && matchesSearch;
        });
    }, [products, activeCategory, searchQuery]);

    const categories = useMemo<Category[]>(() => {
        const categoryNames = Array.from(new Set(products.map((product) => product.category).filter(Boolean)));
        return categoryNames.map((category) => ({
            id: category.toLowerCase().replace(/\s+/g, '-'),
            name: category,
            icon: getCategoryIcon(category),
        }));
    }, [products]);

    const handleCategoryPress = (category: string) => {
        Haptics.tapLight();
        setActiveCategory((current) => current === category ? null : category);
    };

    const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const y = e.nativeEvent.contentOffset.y;
        const shouldCollapse = y > HEADER_COLLAPSE_THRESHOLD;
        if (shouldCollapse !== headerCollapsedRef.current) {
            headerCollapsedRef.current = shouldCollapse;
            setHeaderCollapsed(shouldCollapse);
        }
    };

    const financialSummary = useMemo(() => {
        const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const appliedDelivery = isDeliveryEnabled && subtotal > 0 ? deliveryFee : 0;
        const appliedVat = subtotal * vatRate;
        const grandTotal = subtotal + appliedDelivery + appliedVat;

        return {
            subtotal,
            appliedDelivery,
            appliedVat,
            grandTotal,
            totalQty: cart.reduce((total, item) => total + item.qty, 0)
        };
    }, [cart, vatRate, deliveryFee, isDeliveryEnabled]);

    if (isLoading) {
        return (
            <View className="flex-1 bg-white dark:bg-[#09090B] pt-4 px-4">
                <View className="items-center mb-5">
                    <Skeleton className="w-[60px] h-[60px] rounded-full mb-2" />
                    <Skeleton className="h-5 w-40 mb-1.5" />
                    <Skeleton className="h-3 w-24" />
                </View>
                <Skeleton className="h-11 w-full rounded-full mb-5" />
                <View className="flex-row gap-2.5 mb-5">
                    {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="w-[76px] h-[76px] rounded-xl" />)}
                </View>
                {[0, 1, 2].map((i) => (
                    <View key={i} className="flex-row bg-white dark:bg-[#18181B] rounded-xl p-3 mb-4 border border-gray-100 dark:border-zinc-800">
                        <Skeleton className="w-20 h-20 rounded-lg" />
                        <View className="flex-1 ml-4 justify-center gap-1.5">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-full" />
                            <Skeleton className="h-4 w-1/3" />
                        </View>
                    </View>
                ))}
            </View>
        );
    }
    if (error) {
        return (
            <View className="flex-1 justify-center items-center bg-white dark:bg-[#09090B]">
                <Text className="text-red-500 text-base font-medium">{error || "Store Details Missing"}</Text>
            </View>
        );
    }

    const iconColor = isDark ? '#D1D5DB' : '#374151';

    return (
        <SafeAreaView className="flex-1 bg-white dark:bg-[#09090B]">
            {headerCollapsed && (
                <View className="absolute top-0 left-0 right-0 z-30 flex-row items-center px-4 py-2.5 bg-white dark:bg-[#18181B] border-b border-gray-100 dark:border-zinc-800 shadow-sm">
                    <TouchableOpacity
                        className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 justify-center items-center mr-2"
                        activeOpacity={0.7}
                        onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StorefrontDirectory')}
                        accessibilityLabel="Back to Discover"
                    >
                        <ArrowLeft size={16} color={iconColor} strokeWidth={2.2} />
                    </TouchableOpacity>
                    <View className="w-9 h-9 rounded-full bg-gray-900 dark:bg-zinc-800 justify-center items-center overflow-hidden mr-2.5">
                        {vendor?.logoUrl ? (
                            <Image source={{ uri: vendor.logoUrl }} className="w-full h-full" resizeMode="cover" />
                        ) : (
                            <Store size={16} color="#FFFFFF" strokeWidth={1.8} />
                        )}
                    </View>
                    <Text className="text-base font-bold text-gray-900 dark:text-white flex-1" numberOfLines={1}>{vendor?.name || "The Test"}</Text>
                    <TouchableOpacity
                        className="w-8 h-8 rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 justify-center items-center relative"
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('CartDrawer', { slug, storefrontId, name: vendor?.name, table: scannedTableCode })}
                        accessibilityLabel="Open cart"
                    >
                        <ShoppingCart size={16} color={iconColor} strokeWidth={2} />
                        <BounceBadge count={financialSummary.totalQty} />
                    </TouchableOpacity>
                </View>
            )}

            <FlatList
                className="flex-1"
                contentContainerClassName="pb-[110px]"
                data={filteredProducts}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                ListHeaderComponent={
                    <View>
                        {/* Top Bar with Back to Discover Navigation */}
                        <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
                            <TouchableOpacity
                                className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 shadow-sm"
                                activeOpacity={0.75}
                                onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('StorefrontDirectory')}
                                accessibilityLabel="Back to Discover"
                            >
                                <ArrowLeft size={15} color={iconColor} strokeWidth={2.2} />
                                <Text className="text-xs font-bold text-gray-700 dark:text-zinc-200">Discover</Text>
                            </TouchableOpacity>
                        </View>

                        <View className="items-center pt-2 pb-3 bg-white dark:bg-[#09090B]">
                            <View className="w-[60px] h-[60px] rounded-full bg-gray-900 dark:bg-zinc-800 justify-center items-center overflow-hidden mb-2 shadow-sm">
                                {vendor?.logoUrl ? (
                                    <Image source={{ uri: vendor.logoUrl }} className="w-full h-full" resizeMode="cover" />
                                ) : (
                                    <View className="justify-center items-center">
                                        <Store size={26} color="#FFFFFF" strokeWidth={1.8} />
                                    </View>
                                )}
                            </View>
                            <Text className="text-xl font-bold text-gray-900 dark:text-white">{vendor?.name || "The Test"}</Text>
                            <Text className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">...by ScanCode.ng</Text>
                            {scannedTableCode && (
                                <View className="bg-amber-100 dark:bg-amber-950/60 self-start py-1 px-2.5 rounded-full mt-2.5 flex-row items-center gap-1">
                                    <MapPin size={11} color="#D97706" strokeWidth={2.2} />
                                    <Text className="text-amber-700 dark:text-amber-400 text-xs font-semibold">Table: {scannedTableCode}</Text>
                                </View>
                            )}
                        </View>

                        <View className="flex-row items-center px-4 my-3">
                            <View className="flex-1 flex-row items-center bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-[25px] pl-4 pr-1.5 h-[46px]">
                                <Search size={16} color={isDark ? '#9CA3AF' : '#9CA3AF'} className="mr-1.5" />
                                <TextInput
                                    className="flex-1 text-sm text-gray-800 dark:text-zinc-100 py-0"
                                    placeholder="Search for dishes..."
                                    placeholderTextColor={isDark ? '#71717A' : '#9CA3AF'}
                                    value={searchQuery}
                                    onChangeText={setSearchQuery}
                                />

                                <TouchableOpacity
                                    className="w-[34px] h-[34px] rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 justify-center items-center ml-1.5 relative"
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('CartDrawer', { slug, storefrontId, name: vendor?.name, table: scannedTableCode })}
                                    accessibilityLabel="Open cart"
                                >
                                    <ShoppingCart size={18} color={iconColor} strokeWidth={2} />
                                    <BounceBadge count={financialSummary.totalQty} />
                                </TouchableOpacity>

                                <TouchableOpacity
                                    className="w-[34px] h-[34px] rounded-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 justify-center items-center ml-1.5 relative"
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('Wishlist', { slug, storefrontId, name: vendor?.name })}
                                    accessibilityLabel="Open favorites"
                                >
                                    <Heart
                                        size={18}
                                        color={favoriteIds.length > 0 ? '#EF4444' : iconColor}
                                        fill={favoriteIds.length > 0 ? '#EF4444' : 'none'}
                                        strokeWidth={2}
                                    />
                                    <BounceBadge count={favoriteIds.length} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Text className="text-base font-bold text-gray-900 dark:text-white px-4 mt-4 mb-3">Categories</Text>

                        <View className="bg-white dark:bg-[#09090B]">
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="px-4 pb-1">
                                {categories.length > 0 ? categories.map((cat) => {
                                    const isSelected = activeCategory === cat.name;
                                    return (
                                        <TouchableOpacity
                                            key={cat.id}
                                            className={cn(
                                                'w-[76px] rounded-xl p-2 items-center mr-2.5 border',
                                                isSelected
                                                    ? 'border-primary bg-emerald-50 dark:bg-emerald-950/50'
                                                    : 'bg-white dark:bg-[#18181B] border-gray-200 dark:border-zinc-800'
                                            )}
                                            activeOpacity={0.8}
                                            onPress={() => handleCategoryPress(cat.name)}
                                        >
                                            <View className="w-11 h-11 rounded-lg bg-gray-100 dark:bg-zinc-800 justify-center items-center mb-1.5">
                                                <Text className="text-[22px]">{cat.icon}</Text>
                                            </View>
                                            <Text className={cn('text-[11px] text-center', isSelected ? 'text-primary font-semibold' : 'text-gray-600 dark:text-zinc-400 font-medium')}>
                                                {cat.name}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                }) : (
                                    <View className="py-3 px-2">
                                        <Text className="text-[13px] text-gray-500 dark:text-zinc-400 text-center">Categories will appear when products are added.</Text>
                                    </View>
                                )}
                            </ScrollView>
                        </View>

                        <Text className="text-base font-bold text-gray-900 dark:text-white px-4 mt-4 mb-3">
                            {activeCategory ? `${activeCategory} Products` : 'All Products'}
                        </Text>
                    </View>
                }
                ListEmptyComponent={
                    <View className="items-center justify-center py-8 px-5">
                        <Text className="text-base font-bold text-gray-800 dark:text-zinc-200 mb-1.5">No products found</Text>
                        <Text className="text-[13px] text-gray-500 dark:text-zinc-400 text-center">Try another search or category.</Text>
                    </View>
                }
                renderItem={({ item }) => (
                    <TouchableOpacity
                        className="bg-white dark:bg-[#18181B] rounded-2xl flex-row p-3.5 mb-3 mx-4 border border-gray-100 dark:border-zinc-800 shadow-sm"
                        activeOpacity={0.8}
                        onPress={() => itemDetailsRef.current?.present(item)}
                    >
                        <View className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-zinc-800 justify-center items-center overflow-hidden">
                            {item.media[0] ? (
                                <Image source={{ uri: item.media[0] }} className="w-full h-full rounded-xl" resizeMode="cover" />
                            ) : (
                                <Package size={26} color={isDark ? '#6B7280' : '#9CA3AF'} strokeWidth={1.6} />
                            )}
                        </View>
                        <View className="flex-1 ml-4 justify-between">
                            <View className="flex-row justify-between items-center">
                                <Text className="text-base font-semibold text-gray-800 dark:text-zinc-100 flex-1">{item.name}</Text>
                            </View>
                            <Text className="text-xs text-gray-400 dark:text-zinc-400 my-1" numberOfLines={2}>{item.description}</Text>
                            <View className="flex-row justify-between items-center">
                                <Text className="text-[15px] font-bold text-primary">₦{item.price.toLocaleString()}</Text>
                                <View className="flex-row items-center gap-2 ml-3">
                                    <TouchableOpacity className="bg-primary py-1.5 px-3.5 rounded-full" onPress={() => addToCart(item)}>
                                        <Text className="text-white text-[13px] font-semibold"> + </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        className={cn(
                                            'w-8 h-8 rounded-2xl border justify-center items-center',
                                            favoriteIds.includes(item.id)
                                                ? 'bg-red-50 dark:bg-red-950/50 border-red-300 dark:border-red-800'
                                                : 'bg-white dark:bg-zinc-800 border-gray-200 dark:border-zinc-700'
                                        )}
                                        onPress={() => toggleFavorite(item)}
                                        activeOpacity={0.75}
                                        accessibilityLabel={`${favoriteIds.includes(item.id) ? 'Remove from' : 'Add to'} favorites`}
                                    >
                                        <Heart
                                            size={16}
                                            color={favoriteIds.includes(item.id) ? '#EF4444' : (isDark ? '#9CA3AF' : '#9CA3AF')}
                                            fill={favoriteIds.includes(item.id) ? '#EF4444' : 'none'}
                                            strokeWidth={2}
                                        />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>
                )}
            />

            <ItemDetailsModalScreen ref={itemDetailsRef} onAddToCart={addToCart} />

            {financialSummary.totalQty > 0 && (
                <TouchableOpacity
                    className="absolute bottom-6 left-5 right-5 bg-gray-900 dark:bg-emerald-950 rounded-2xl flex-row justify-between items-center p-4 shadow-lg border border-transparent dark:border-emerald-800"
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('CartDrawer', { slug, storefrontId, name: vendor?.name, table: scannedTableCode })}>
                    <View className="flex-row items-center">
                        <View className="bg-primary rounded-md px-2 py-0.5 mr-2">
                            <Text className="text-white font-bold text-xs">{financialSummary.totalQty}</Text>
                        </View>
                        <Text className="text-white font-bold text-[15px]">Cart</Text>
                    </View>
                    <Text className="text-white font-bold text-[15px]">Proceed • ₦{financialSummary.grandTotal.toLocaleString()}</Text>
                </TouchableOpacity>
            )}

            <StorefrontToolbar
                storefrontId={storefront?.id}
                tableCode={scannedTableCode}
                vendor={vendor}
                weeklyEvents={weeklyEvents}
            />
        </SafeAreaView>
    );
}
