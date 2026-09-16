import React, { useState } from 'react';
import {
  Image,
  View,
  StyleSheet,
  type ImageProps,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { Package } from 'lucide-react-native';
import { normalizeImageUrl } from '../utils/imageUpload';

export interface AppImageProps extends Omit<ImageProps, 'source'> {
  uri?: string | null;
  fallbackIcon?: React.ReactNode;
  containerStyle?: StyleProp<ImageStyle>;
}

/**
 * Standardized image component for ScanCode.
 * - Guarantees URL normalization and ATS https compatibility.
 * - Prevents dimension collapse in NativeWind flex layouts.
 * - Renders a sleek placeholder icon if the image URL is missing, invalid, or fails to load.
 */
export default function AppImage({
  uri,
  fallbackIcon,
  style,
  resizeMode = 'cover',
  className,
  ...rest
}: AppImageProps) {
  const [hasError, setHasError] = useState(false);
  const normalized = normalizeImageUrl(uri);

  if (!normalized || hasError) {
    return (
      <View
        style={[styles.fallbackContainer, style]}
        className={className}
      >
        {fallbackIcon || <Package size={22} color="#9CA3AF" strokeWidth={1.8} />}
      </View>
    );
  }

  return (
    <Image
      source={{ uri: normalized }}
      resizeMode={resizeMode}
      onError={() => setHasError(true)}
      style={[styles.fullSize, style]}
      className={className}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  fullSize: {
    width: '100%',
    height: '100%',
  },
  fallbackContainer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
  },
});
