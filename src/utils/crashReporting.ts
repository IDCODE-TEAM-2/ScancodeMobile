import * as Sentry from '@sentry/react-native';

// No DSN configured (EXPO_PUBLIC_SENTRY_DSN unset) means Sentry stays disabled — this is the
// expected state for local development and for this repo until a real Sentry project exists.
const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

Sentry.init({
  dsn,
  enabled: !!dsn,
  debug: __DEV__ && !!dsn,
  tracesSampleRate: __DEV__ ? 1.0 : 0.2,
  // AppRegistryIntegration hooks into AppRegistry.onRunApplication, which was removed in
  // React Native 0.73+. Disabling it prevents a noisy warning on every app start.
  // See: https://github.com/getsentry/sentry-react-native/issues/3975
  integrations: (integrations) =>
    integrations.filter((i) => i.name !== 'AppRegistryIntegration'),
});

export { Sentry };
