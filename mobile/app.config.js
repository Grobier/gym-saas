export default {
  expo: {
    name: 'Gym SaaS',
    slug: 'gym-saas-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTabletMode: true,
      bundleIdentifier: 'com.gymsaas.mobile',
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      package: 'com.gymsaas.mobile',
      permissions: ['CAMERA', 'INTERNET'],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      apiUrl: process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
    },
    plugins: [
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Gym SaaS to access your camera for QR code scanning.',
        },
      ],
      [
        'expo-secure-store',
        {
          faceIDPermission:
            'Allow Gym SaaS to use Face ID to keep you logged in.',
        },
      ],
    ],
  },
};
