import React, { useEffect, useRef } from 'react';
import { Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withSequence, withSpring } from 'react-native-reanimated';

interface BounceBadgeProps {
  count: number;
}

// Small numeric pill (cart item count, favorites count) that pops with a spring whenever
// the count changes, so adding an item reads as an event rather than a silent number swap.
export default function BounceBadge({ count }: BounceBadgeProps) {
  const scale = useSharedValue(1);
  const prevCount = useRef(count);

  useEffect(() => {
    if (prevCount.current !== count) {
      prevCount.current = count;
      scale.value = withSequence(withSpring(1.35, { damping: 6, stiffness: 350 }), withSpring(1, { damping: 9 }));
    }
  }, [count, scale]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  if (count <= 0) return null;

  return (
    <Animated.View
      className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-lg bg-primary justify-center items-center px-1"
      style={animatedStyle}
    >
      <Text className="text-white text-[10px] font-extrabold">{count}</Text>
    </Animated.View>
  );
}
