import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';
import { cn } from '../utils/cn';

export type StatusType =
  | 'PUBLISHED'
  | 'LOCKED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'DELIVERED'
  | string;

export interface StatusBadgeProps {
  status: StatusType;
  label?: string;
}

const SUCCESS = ['PUBLISHED', 'CONFIRMED', 'COMPLETED', 'DELIVERED'];
const WARNING = ['LOCKED', 'PENDING', 'PENDING_ACK', 'CUSTOMER_NOTIFIED'];
const DANGER = ['REJECTED', 'CANCELLED'];

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const scale = useSharedValue(1);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      // Small pop on every status transition so the change registers as an event.
      scale.value = withSequence(withSpring(1.18, { damping: 8, stiffness: 300 }), withSpring(1, { damping: 10 }));
    }
  }, [status, scale]);

  // Position/transform only — NativeWind does not process `className` on Reanimated's
  // Animated.View (confirmed live: it silently drops every Tailwind class). All visual
  // styling lives on the plain inner View below instead.
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const isPublished = normalized === 'PUBLISHED';

  // For PUBLISHED: no background — just the text colour, no pill BG.
  const bgClass = isPublished
    ? ''
    : WARNING.includes(normalized)
      ? 'bg-amber-100'
      : DANGER.includes(normalized)
        ? 'bg-red-100'
        : SUCCESS.includes(normalized)
          ? 'bg-emerald-100'
          : 'bg-gray-100';

  const textClass = isPublished
    ? 'text-emerald-700'
    : WARNING.includes(normalized)
      ? 'text-amber-800'
      : DANGER.includes(normalized)
        ? 'text-red-800'
        : SUCCESS.includes(normalized)
          ? 'text-emerald-800'
          : 'text-gray-700';

  const displayLabel = label || status;

  return (
    <Animated.View style={animatedStyle}>
      <View className={cn('rounded-full px-2.5 py-[3px] self-start', bgClass)}>
        <Text className={cn('text-xs font-semibold', textClass)}>{displayLabel}</Text>
      </View>
    </Animated.View>
  );
}
