import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { X } from 'lucide-react-native';
import { cn } from '../utils/cn';

export interface ErrorBannerProps {
  message: string | null;
  type?: 'error' | 'success' | 'warning' | 'info';
  onDismiss?: () => void;
}

const BOX_CLASSES: Record<NonNullable<ErrorBannerProps['type']>, string> = {
  error: 'bg-red-100 border-red-300',
  success: 'bg-emerald-100 border-emerald-300',
  warning: 'bg-amber-100 border-amber-300',
  // Neutral slate, not emerald — the primary-color sweep replaced this type's original
  // indigo with emerald too, which collided visually with `success`. Blue is off the
  // table project-wide, so "info" gets gray instead of reusing success's color.
  info: 'bg-slate-100 border-slate-300',
};

const TEXT_CLASSES: Record<NonNullable<ErrorBannerProps['type']>, string> = {
  error: 'text-red-600',
  success: 'text-emerald-800',
  warning: 'text-amber-800',
  info: 'text-slate-700',
};

// The dismiss icon is monochrome regardless of banner type — only the box/text stay
// semantically colored (that's feedback coloring, not decorative icon coloring).
const ICON_COLOR = '#374151';

export default function ErrorBanner({
  message,
  type = 'error',
  onDismiss,
}: ErrorBannerProps) {
  if (!message) return null;

  return (
    <View className={cn('border rounded-lg p-3 mb-4 flex-row items-center justify-between', BOX_CLASSES[type])}>
      <Text className={cn('text-sm font-medium flex-1', TEXT_CLASSES[type])}>{message}</Text>
      {onDismiss ? (
        <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <X size={16} color={ICON_COLOR} strokeWidth={2.5} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
