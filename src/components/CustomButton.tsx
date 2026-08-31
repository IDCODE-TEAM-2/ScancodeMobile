import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cn } from '../utils/cn';

export interface CustomButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  className?: string;
  textClassName?: string;
  activeOpacity?: number;
}

const VARIANT_BUTTON_CLASSES: Record<NonNullable<CustomButtonProps['variant']>, string> = {
  primary: '', // primary is rendered via LinearGradient instead of a flat bg- class
  secondary: 'bg-emerald-50',
  outline: 'bg-transparent border-[1.5px] border-primary',
  danger: 'bg-red-500',
};

const VARIANT_TEXT_CLASSES: Record<NonNullable<CustomButtonProps['variant']>, string> = {
  primary: 'text-white',
  secondary: 'text-primary',
  outline: 'text-primary',
  danger: 'text-white',
};

export default function CustomButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  className,
  textClassName,
  activeOpacity = 0.8,
}: CustomButtonProps) {
  const isOutlineOrSecondary = variant === 'outline' || variant === 'secondary';
  const spinnerColor = isOutlineOrSecondary ? '#059669' : '#ffffff';

  const content = loading ? (
    <ActivityIndicator color={spinnerColor} />
  ) : (
    <Text className={cn('text-base font-bold', VARIANT_TEXT_CLASSES[variant], textClassName)}>
      {title}
    </Text>
  );

  if (variant === 'primary') {
    // The "mini gradient" primary theme — a subtle emerald-500 -> emerald-700 shift, not a
    // dramatic multi-hue gradient. See tailwind.config.js's primary.gradientStart/gradientEnd.
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled || loading}
        activeOpacity={activeOpacity}
        className={cn('rounded-[10px] overflow-hidden', (disabled || loading) && 'opacity-50', className)}
      >
        <LinearGradient
          colors={['#10B981', '#047857']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="py-3.5 px-4 items-center justify-center"
        >
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className={cn(
        'rounded-[10px] py-3.5 px-4 items-center justify-center',
        VARIANT_BUTTON_CLASSES[variant],
        (disabled || loading) && 'opacity-50',
        className
      )}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={activeOpacity}
    >
      {content}
    </TouchableOpacity>
  );
}
