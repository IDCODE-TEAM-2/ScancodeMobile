// Learn more https://docs.expo.dev/guides/monorepos/#metro-configuration
const { getSentryExpoConfig } = require('@sentry/react-native/metro');
const { withNativeWind } = require('nativewind/metro');

// getSentryExpoConfig wraps expo/metro-config's getDefaultConfig with the source-map
// upload hooks Sentry needs — a drop-in replacement, not an additional wrapper.
const config = getSentryExpoConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });
