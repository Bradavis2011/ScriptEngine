import { ClerkProvider, useAuth } from '@clerk/clerk-expo';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { Slot, useRouter, useSegments } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { initializePurchases } from '@/lib/purchases';

// React Native doesn't have window focus events — wire AppState so React Query
// refetches stale data when the app returns to the foreground.
focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) => {
    handleFocus(state === 'active');
  });
  return () => subscription.remove();
});

SplashScreen.preventAutoHideAsync();

const PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

const tokenCache = {
  async getToken(key: string) {
    return SecureStore.getItemAsync(key);
  },
  async saveToken(key: string, value: string) {
    return SecureStore.setItemAsync(key, value);
  },
  async clearToken(key: string) {
    return SecureStore.deleteItemAsync(key);
  },
};

const queryClient = new QueryClient();

function AuthGate() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const purchasesInitialized = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    SplashScreen.hideAsync();
    const inAuth = segments[0] === '(auth)';
    if (!isSignedIn && !inAuth) {
      router.replace('/(auth)/sign-in');
    } else if (isSignedIn && inAuth) {
      router.replace('/(app)');
    }
  }, [isSignedIn, isLoaded, segments]);

  // Initialize RevenueCat once when user logs in
  useEffect(() => {
    if (isSignedIn && userId && !purchasesInitialized.current) {
      purchasesInitialized.current = true;
      initializePurchases(userId);
    }
    if (!isSignedIn) {
      purchasesInitialized.current = false;
    }
  }, [isSignedIn, userId]);

  return <Slot />;
}

function MissingKeyError() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorText}>
        Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env
      </Text>
    </View>
  );
}

export default function RootLayout() {
  if (!PUBLISHABLE_KEY) {
    return <MissingKeyError />;
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={styles.root}>
          <StatusBar style="light" />
          <AuthGate />
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  errorContainer: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ff4444',
    fontSize: 16,
    textAlign: 'center',
  },
});
