import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
}

// A pulsing placeholder block — swap in for ActivityIndicator wherever the loading state's
// final shape is known ahead of time (a list of cards, a row of text), so the layout feels
// instant instead of a spinner-then-pop-in.
//
// The Animated.View carries ONLY the animated opacity — NativeWind does not process
// `className` on react-native-reanimated's Animated.View (confirmed live: every Tailwind
// class, including sizing, was silently dropped). Size/color/rounding live on the plain
// inner View instead, which the outer Animated.View shrink-wraps around.
export default function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View style={style}>
      <View className={cn('bg-gray-200 rounded-lg', className)} />
    </Animated.View>
  );
}
