import React, { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';

interface BounceBadgeProps {
  count: number;
}

// Small numeric pill (cart item count, favorites count) that pops with a spring whenever
// the count changes, so adding an item reads as an event rather than a silent number swap.
//
// The Animated.View here carries ONLY position + the animated transform via a plain style
// object — NativeWind does not process `className` on react-native-reanimated's
// Animated.View (confirmed live: every Tailwind utility class was silently dropped, only
// the animated `style` came through). All visual styling (background, size, rounding) lives
// on a plain inner View instead, which NativeWind handles normally.
export default function BounceBadge({ count }: BounceBadgeProps) {
  const scale = useSharedValue(1);
  const prevCount = useRef(count);

  useEffect(() => {
    if (prevCount.current !== count) {
      prevCount.current = count;
      scale.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 350 }), withSpring(1, { damping: 9 }));
    }
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    top: -6,
    right: -6,
    transform: [{ scale: scale.value }],
  }));

  if (count <= 0) return null;

  return (
    <Animated.View style={animatedStyle}>
      <View className="min-w-[16px] h-4 rounded-lg bg-primary justify-center items-center px-1">
        <Text className="text-white text-[10px] font-extrabold">{count}</Text>
      </View>
    </Animated.View>
  );
}
