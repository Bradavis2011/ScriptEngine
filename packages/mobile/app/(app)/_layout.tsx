import { Tabs, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/lib/theme';

function TabIcon({ name, color, focused }: { name: any; color: string; focused: boolean }) {
  return <Ionicons name={name} size={focused ? 24 : 22} color={color} />;
}

function CameraTabIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={[styles.cameraBtn, focused && styles.cameraBtnFocused]}>
      <Ionicons name="camera" size={24} color={focused ? colors.background : colors.white} />
    </View>
  );
}

export default function AppLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace('/(auth)/sign-in');
    }
  }, [isSignedIn, isLoaded]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
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
    height: Platform.OS === 'ios' ? 88 : 64,
    paddingBottom: Platform.OS === 'ios' ? 28 : 8,
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
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
});
