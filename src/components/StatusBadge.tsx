import React from 'react';
import { View, Text } from 'react-native';
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
    <View className={cn('rounded-full px-2.5 py-[3px] self-start', bgClass)}>
      <Text className={cn('text-xs font-semibold', textClass)}>{displayLabel}</Text>
    </View>
  );
}
