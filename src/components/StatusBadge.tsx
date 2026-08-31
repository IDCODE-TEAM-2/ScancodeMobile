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
const WARNING = ['LOCKED', 'PENDING', 'PENDING_ACK'];
const DANGER = ['REJECTED', 'CANCELLED'];

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const scale = useSharedValue(1);
  const prevStatus = useRef(status);

  useEffect(() => {
    if (prevStatus.current !== status) {
      prevStatus.current = status;
      // Small pop on every status transition (e.g. PENDING amber -> CONFIRMED green) so the
      // change registers as an event, not just a re-render.
      scale.value = withSequence(withSpring(1.18, { damping: 8, stiffness: 300 }), withSpring(1, { damping: 10 }));
    }
  }, [status, scale]);

  // Position/transform only — NativeWind does not process `className` on Reanimated's
  // Animated.View (confirmed live: it silently drops every Tailwind class). All visual
  // styling lives on the plain inner View below instead.
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bgTextClasses = SUCCESS.includes(normalized)
    ? 'bg-emerald-100 text-emerald-800'
    : WARNING.includes(normalized)
      ? 'bg-amber-100 text-amber-800'
      : DANGER.includes(normalized)
        ? 'bg-red-100 text-red-800'
        // Neutral, not emerald — an unrecognized status shouldn't visually read as "success".
        : 'bg-gray-100 text-gray-700';

  const [bgClass, textClass] = bgTextClasses.split(' ');
  const displayLabel = label || status;

  return (
    <Animated.View style={animatedStyle}>
      <View className={cn('rounded-full px-2.5 py-[3px] self-start', bgClass)}>
        <Text className={cn('text-xs font-semibold', textClass)}>{displayLabel}</Text>
      </View>
    </Animated.View>
  );
}
