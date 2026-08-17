# Mobile App

iOS/Android app for gym students and coaches.

**Stack:** React Native + Expo + TypeScript + React Query

---

## Setup

```bash
cd apps/mobile
pnpm install
```

## Development

```bash
# Start Expo
pnpm start

# iOS
pnpm ios

# Android
pnpm android

# Web (testing)
pnpm web
```

## Commands

```bash
# TypeCheck
pnpm typecheck

# Lint
pnpm lint

# Test
pnpm test
pnpm test:watch

# Build (iOS)
eas build --platform ios

# Build (Android)
eas build --platform android
```

## Structure

```
src/
├── app/          # Expo Router navigation
├── screens/      # Screen components
├── components/   # Reusable components
├── lib/          # Utilities
├── hooks/        # Custom hooks
├── services/     # API services
├── types/        # Type definitions
└── assets/       # Images, fonts, etc
```

## Requirements

- Node.js ≥ 20
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode (Mac only)
- Android: Android Studio + SDK

## First Run

```bash
# Install dependencies
pnpm install

# Get Expo started
pnpm start

# Scan QR code with Expo Go app
# Or press 'i' for iOS / 'a' for Android
```

---

See root [README.md](../../README.md) for full setup.
