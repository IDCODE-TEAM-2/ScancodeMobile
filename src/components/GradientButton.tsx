import React from 'react';
import { TouchableOpacity, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils/cn';

interface GradientButtonProps {
  onPress: () => void;
  disabled?: boolean;
  activeOpacity?: number;
  /** Applied to the touchable+gradient wrapper — put rounded-*, flex-1/flex-basis etc. here. */
  className?: string;
  /** Applied to the inner content row — controls padding/gap. Defaults to a standard-size CTA. */
  contentClassName?: string;
  style?: ViewStyle;
  children: React.ReactNode;
}

// The one shared "glow" — a subtle emerald-500 -> emerald-700 diagonal shift, never any
// other hue. Wrap any flat `bg-primary` CTA in this instead of duplicating the gradient
// per screen. See tailwind.config.js's primary.gradientStart/gradientEnd for the source
// values, and CustomButton.tsx for the original pattern this was extracted from.
export default function GradientButton({
  onPress,
  disabled = false,
  activeOpacity = 0.85,
  className,
  contentClassName,
  style,
  children,
}: GradientButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={activeOpacity}
      className={cn('overflow-hidden', disabled && 'opacity-55', className)}
      style={style}
    >
      <LinearGradient
        colors={['#10B981', '#047857']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1 }}
      >
        <View className={cn('items-center justify-center flex-1 flex-row gap-2', contentClassName ?? 'px-5 py-3')}>
          {children}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}
