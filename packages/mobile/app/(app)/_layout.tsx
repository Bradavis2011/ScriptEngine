import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

const TEAL = '#03EDD6';
const RED  = '#FD1741';

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return <Ionicons name={name} size={focused ? 24 : 22} color={color} />;
}

function CameraTabIcon({ focused }: { color: string; focused: boolean }) {
  return (
    <View style={[styles.cameraBtn, focused && styles.cameraBtnFocused]}>
      <Ionicons name="camera" size={24} color={focused ? '#0B0B0D' : colors.white} />
    </View>
  );
}

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const tabBarHeight = (Platform.OS === 'ios' ? 60 : 56) + insets.bottom;

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [isSignedIn, isLoaded]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [styles.tabBar, { height: tabBarHeight, paddingBottom: insets.bottom }],
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarBackground: () => <View style={styles.tabBarBg} />,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Scripts',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'document-text' : 'document-text-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          title: '',
          tabBarIcon: ({ color, focused }) => <CameraTabIcon color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="series"
        options={{
          title: 'Series',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'layers' : 'layers-outline'} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name={focused ? 'person' : 'person-outline'} color={color} focused={focused} />
          ),
        }}
      />
      {/* Hidden screens — no tab */}
      <Tabs.Screen name="script/[id]" options={{ href: null }} />
      <Tabs.Screen name="teleprompter/[id]" options={{ href: null, tabBarStyle: { display: 'none' } }} />
      <Tabs.Screen name="generate" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: 'transparent',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    elevation: 0,
    position: 'absolute',
  },
  tabBarBg: { flex: 1, backgroundColor: colors.background + 'F0' },
  tabLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },
  cameraBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.card,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
    marginTop: -8,
  },
  cameraBtnFocused: {
    backgroundColor: TEAL,
    borderColor: TEAL,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6, shadowRadius: 12, elevation: 8,
  },
});
