import type { ExpoConfig } from 'expo/config';

// FLEX_VARIANT: 'store' (default) | 'sideload'. Only the sideload build may include the
// Block Grabber AccessibilityService (ADR 0002). Plugins for it are added in P5 (T-610).
const variant = process.env.FLEX_VARIANT === 'sideload' ? 'sideload' : 'store';

const config: ExpoConfig = {
  name: variant === 'sideload' ? 'FlexCompanion (Sideload)' : 'FlexCompanion',
  slug: 'flex-companion',
  version: '0.1.0',
  scheme: 'flexcompanion',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.flexcompanion.app',
  },
  android: {
    package: variant === 'sideload' ? 'com.flexcompanion.app.sideload' : 'com.flexcompanion.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    'expo-status-bar',
    [
      'expo-image-picker',
      { photosPermission: 'FlexCompanion reads the itinerary screenshot you choose.' },
    ],
  ],
  experiments: { typedRoutes: true },
  extra: { variant },
};

export default config;
