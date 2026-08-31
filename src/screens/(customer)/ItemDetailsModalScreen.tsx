import React, { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { BottomSheetModal, BottomSheetView, BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';
import { Minus, Plus, Package } from 'lucide-react-native';
import type { Product } from '../../types';
import { cn } from '../../utils/cn';
import * as Haptics from '../../utils/haptics';

export interface ItemDetailsModalHandle {
  present: (product: Product) => void;
}

interface ItemDetailsModalProps {
  onAddToCart: (product: Product, qty: number) => void;
}

// Dish customization sheet — tap a product card to open this instead of the flat "+" quick
// add, pick a quantity (clamped to remaining stock), and add all at once. Real @gorhom/
// bottom-sheet (not a plain Modal) for the native slide-up gesture feel.
const ItemDetailsModalScreen = forwardRef<ItemDetailsModalHandle, ItemDetailsModalProps>(({ onAddToCart }, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);

  useImperativeHandle(ref, () => ({
    present: (p: Product) => {
      setProduct(p);
      setQty(1);
      sheetRef.current?.present();
    },
  }));

  const snapPoints = useMemo(() => ['58%'], []);

  const renderBackdrop = (props: BottomSheetBackdropProps) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.5} />
  );

  const handleQtyChange = (delta: number) => {
    if (!product) return;
    setQty((prev) => Math.min(product.stock, Math.max(1, prev + delta)));
    Haptics.tapLight();
  };

  const handleAdd = () => {
    if (!product) return;
    onAddToCart(product, qty);
    sheetRef.current?.dismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24 }}
      handleIndicatorStyle={{ backgroundColor: '#D1D5DB', width: 40 }}
    >
      <BottomSheetView style={{ flex: 1 }}>
        {product && (
          <View className="px-5 pb-8">
            <View className="w-full h-40 rounded-2xl bg-gray-100 items-center justify-center overflow-hidden mb-4">
              {product.media[0] ? (
                <Image source={{ uri: product.media[0] }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Package size={36} color="#9CA3AF" strokeWidth={1.6} />
              )}
            </View>

            <Text className="text-xl font-bold text-gray-900 mb-1.5">{product.name}</Text>
            <Text className="text-sm text-gray-500 leading-5 mb-4">{product.description}</Text>

            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-2xl font-extrabold text-primary">₦{product.price.toLocaleString()}</Text>

              <View className="flex-row items-center gap-4 bg-gray-100 rounded-full px-2 py-1.5">
                <TouchableOpacity
                  className={cn('w-8 h-8 rounded-full items-center justify-center', qty <= 1 ? 'bg-gray-200' : 'bg-white')}
                  onPress={() => handleQtyChange(-1)}
                  disabled={qty <= 1}
                >
                  <Minus size={15} color={qty <= 1 ? '#9CA3AF' : '#111827'} strokeWidth={2.4} />
                </TouchableOpacity>
                <Text className="text-base font-bold text-gray-900 w-5 text-center">{qty}</Text>
                <TouchableOpacity
                  className={cn('w-8 h-8 rounded-full items-center justify-center', qty >= product.stock ? 'bg-gray-200' : 'bg-white')}
                  onPress={() => handleQtyChange(1)}
                  disabled={qty >= product.stock}
                >
                  <Plus size={15} color={qty >= product.stock ? '#9CA3AF' : '#111827'} strokeWidth={2.4} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity className="bg-primary rounded-2xl py-4 items-center flex-row justify-center" onPress={handleAdd} activeOpacity={0.85}>
              <Text className="text-white text-base font-bold">Add {qty} to Cart — ₦{(product.price * qty).toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheetView>
    </BottomSheetModal>
  );
});

ItemDetailsModalScreen.displayName = 'ItemDetailsModalScreen';

export default ItemDetailsModalScreen;
