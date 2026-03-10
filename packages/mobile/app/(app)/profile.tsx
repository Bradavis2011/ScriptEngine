import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getAllScripts } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

export default function ProfileScreen() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();

  // Single fetch — derive all counts client-side
  const { data: scripts = [], isLoading: statsLoading } = useQuery({
    queryKey: ['scripts', 'all'],
    queryFn: async () => { const t = await getToken(); return getAllScripts(t!); },
  });

  const ready  = scripts.filter(s => s.filmingStatus === 'ready').length;
  const filmed = scripts.filter(s => s.filmingStatus === 'filmed').length;
  const posted = scripts.filter(s => s.filmingStatus === 'posted').length;

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  const displayName = user?.fullName ?? user?.username ?? 'Creator';

  const stats = [
    { label: 'Ready',  value: ready,                    icon: 'document-text-outline' as const },
    { label: 'Filmed', value: filmed,                   icon: 'videocam-outline' as const },
    { label: 'Posted', value: posted,                   icon: 'send-outline' as const },
    { label: 'Total',  value: ready + filmed + posted,  icon: 'bar-chart-outline' as const },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <GlowOrbs />
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar + name */}
        <View style={styles.profile}>
          {user?.imageUrl ? (
            <Image source={{ uri: user.imageUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={32} color={colors.muted} />
            </View>
          )}
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text>
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>Free Plan</Text>
          </View>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          {stats.map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Ionicons name={s.icon} size={20} color={colors.accent} />
              {statsLoading
                ? <ActivityIndicator size="small" color={colors.accent} style={{ marginVertical: 4 }} />
                : <Text style={styles.statValue}>{s.value}</Text>
              }
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Settings list */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <MenuItem icon="mail-outline" label="Contact Support" onPress={() => Alert.alert('Support', 'Email hello@clipscriptai.com')} />
          <MenuItem icon="lock-closed-outline" label="Privacy Policy" onPress={() => Linking.openURL('https://clipscriptai.com/privacy')} />
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleSignOut} destructive />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, onPress, destructive }: {
  icon: any; label: string; onPress: () => void; destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={icon} size={18} color={destructive ? colors.error : colors.neutral} />
      <Text style={[styles.menuLabel, destructive && { color: colors.error }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={14} color={colors.muted} style={{ marginLeft: 'auto' }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: spacing.md, paddingBottom: 100 },
  profile: { alignItems: 'center', marginBottom: spacing.xl },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: spacing.md },
  avatarFallback: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  name: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: 4 },
  email: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  tierBadge: { backgroundColor: colors.accent + '22', borderRadius: radius.xl, paddingHorizontal: 12, paddingVertical: 5 },
  tierText: { fontSize: 12, fontWeight: '700', color: colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.white },
  statLabel: { fontSize: 12, color: colors.muted },
  section: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, padding: spacing.md, paddingBottom: 8 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  menuLabel: { fontSize: 15, color: colors.white },
});
