import React, { useEffect, useRef } from 'react';
import { Text } from 'react-native';
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

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const bgTextClasses = SUCCESS.includes(normalized)
    ? 'bg-emerald-100 text-emerald-800'
    : WARNING.includes(normalized)
      ? 'bg-amber-100 text-amber-800'
      : DANGER.includes(normalized)
        ? 'bg-red-100 text-red-800'
        : 'bg-indigo-100 text-indigo-800';

  const [bgClass, textClass] = bgTextClasses.split(' ');
  const displayLabel = label || status;

  return (
    <Animated.View className={cn('rounded-full px-2.5 py-[3px] self-start', bgClass)} style={animatedStyle}>
      <Text className={cn('text-xs font-semibold', textClass)}>{displayLabel}</Text>
    </Animated.View>
  );
}
