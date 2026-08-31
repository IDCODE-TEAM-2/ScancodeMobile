import React, { useEffect } from 'react';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSequence } from 'react-native-reanimated';
import { cn } from '../utils/cn';

interface SkeletonProps {
  className?: string;
}

// A pulsing placeholder block — swap in for ActivityIndicator wherever the loading state's
// final shape is known ahead of time (a list of cards, a row of text), so the layout feels
// instant instead of a spinner-then-pop-in.
export default function Skeleton({ className }: SkeletonProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.4, { duration: 700 })), -1, true);
  }, [opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View className={cn('bg-gray-200 rounded-lg', className)} style={style} />;
}
