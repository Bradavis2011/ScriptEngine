import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Image, Linking,
  ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { getAllScripts, getMe, updateProfile } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';
import { PaywallSheet } from '@/components/PaywallSheet';

const TIER_LABELS: Record<string, string> = {
  free: 'Free Plan',
  pro: 'Pro',
  founders: 'Founders',
  team: 'Team',
};

export default function ProfileScreen() {
  const { getToken, signOut } = useAuth();
  const { user } = useUser();
  const qc = useQueryClient();

  const [paywallVisible, setPaywallVisible] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editNiche, setEditNiche] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editCTA, setEditCTA] = useState('');

  const { data: me, isLoading: meLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => { const t = await getToken(); return getMe(t!); },
  });

  const { data: scripts = [], isLoading: statsLoading } = useQuery({
    queryKey: ['scripts', 'all'],
    queryFn: async () => { const t = await getToken(); return getAllScripts(t!); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { niche?: string; city?: string; callToAction?: string }) => {
      const t = await getToken();
      return updateProfile(data, t!);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me'] });
      setEditMode(false);
    },
    onError: (e: any) => {
      Alert.alert('Error', e?.message ?? 'Could not save profile.');
    },
  });

  const handleEditOpen = () => {
    setEditNiche(me?.niche ?? '');
    setEditCity(me?.city ?? '');
    setEditCTA(me?.callToAction ?? '');
    setEditMode(true);
  };

  const handleSave = () => {
    if (!editNiche.trim()) {
      Alert.alert('Required', 'Niche cannot be empty.');
      return;
    }
    updateMutation.mutate({
      niche: editNiche.trim(),
      city: editCity.trim() || undefined,
      callToAction: editCTA.trim() || undefined,
    });
  };

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
  const tier = me?.tier ?? 'free';
  const isPaid = tier === 'pro' || tier === 'founders' || tier === 'team';

  const stats = [
    { label: 'Ready',  value: ready,                   icon: 'document-text-outline' as const },
    { label: 'Filmed', value: filmed,                  icon: 'videocam-outline' as const },
    { label: 'Posted', value: posted,                  icon: 'send-outline' as const },
    { label: 'Total',  value: ready + filmed + posted, icon: 'bar-chart-outline' as const },
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
          {meLoading ? (
            <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 8 }} />
          ) : (
            <View style={styles.tierBadge}>
              <Text style={styles.tierText}>{TIER_LABELS[tier] ?? tier}</Text>
            </View>
          )}
          {!isPaid && !meLoading && (
            <TouchableOpacity
              style={styles.upgradeBtn}
              onPress={() => setPaywallVisible(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="sparkles" size={14} color="#0B0B0D" />
              <Text style={styles.upgradeBtnText}>Upgrade to Pro</Text>
            </TouchableOpacity>
          )}
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

        {/* Edit Profile */}
        <View style={[styles.section, { marginBottom: spacing.md }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Profile</Text>
            {!editMode && (
              <TouchableOpacity onPress={handleEditOpen}>
                <Text style={styles.editLink}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>
          {editMode ? (
            <>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Niche</Text>
                <TextInput
                  style={styles.textInput}
                  value={editNiche}
                  onChangeText={setEditNiche}
                  placeholder="e.g. Real Estate"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="words"
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>City / Market</Text>
                <TextInput
                  style={styles.textInput}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder="e.g. Austin, TX"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.fieldRow}>
                <Text style={styles.fieldLabel}>Call to Action</Text>
                <TextInput
                  style={styles.textInput}
                  value={editCTA}
                  onChangeText={setEditCTA}
                  placeholder="e.g. DM me for a free home valuation"
                  placeholderTextColor={colors.muted}
                />
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditMode(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, updateMutation.isPending && { opacity: 0.6 }]}
                  onPress={handleSave}
                  disabled={updateMutation.isPending}
                  activeOpacity={0.8}
                >
                  {updateMutation.isPending
                    ? <ActivityIndicator size="small" color="#0B0B0D" />
                    : <Text style={styles.saveBtnText}>Save</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <ProfileField label="Niche" value={me?.niche} loading={meLoading} />
              <ProfileField label="City / Market" value={me?.city ?? undefined} loading={meLoading} empty="Not set" />
              <ProfileField label="Call to Action" value={me?.callToAction ?? undefined} loading={meLoading} empty="Not set" />
            </>
          )}
        </View>

        {/* Account */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          {isPaid && (
            <MenuItem
              icon="card-outline"
              label="Manage Subscription"
              onPress={() => Linking.openURL('itms-apps://apps.apple.com/account/subscriptions')}
            />
          )}
          <MenuItem icon="mail-outline" label="Contact Support" onPress={() => Alert.alert('Support', 'Email hello@clipscriptai.com')} />
          <MenuItem icon="document-text-outline" label="Terms of Service" onPress={() => Linking.openURL('https://clipscriptai.com/terms')} />
          <MenuItem icon="lock-closed-outline" label="Privacy Policy" onPress={() => Linking.openURL('https://clipscriptai.com/privacy')} />
          <MenuItem icon="log-out-outline" label="Sign Out" onPress={handleSignOut} destructive />
        </View>

      </ScrollView>

      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUpgraded={() => {
          setPaywallVisible(false);
          qc.invalidateQueries({ queryKey: ['me'] });
        }}
      />
    </SafeAreaView>
  );
}

function ProfileField({ label, value, loading, empty = '—' }: {
  label: string; value?: string; loading?: boolean; empty?: string;
}) {
  return (
    <View style={styles.profileField}>
      <Text style={styles.fieldLabelStatic}>{label}</Text>
      {loading
        ? <ActivityIndicator size="small" color={colors.accent} />
        : <Text style={styles.fieldValue}>{value || empty}</Text>
      }
    </View>
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
  upgradeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.xl,
    paddingHorizontal: 16, paddingVertical: 8, marginTop: spacing.sm,
  },
  upgradeBtnText: { fontSize: 13, fontWeight: '700', color: '#0B0B0D' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xl },
  statCard: {
    flex: 1, minWidth: '45%', backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.border,
  },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.white },
  statLabel: { fontSize: 12, color: colors.muted },
  section: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, paddingBottom: 8,
  },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  editLink: { fontSize: 13, color: colors.accent },
  profileField: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  fieldLabelStatic: { fontSize: 14, color: colors.neutral },
  fieldValue: { fontSize: 14, color: colors.white, maxWidth: '60%', textAlign: 'right' },
  fieldRow: { padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  textInput: {
    backgroundColor: colors.background, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border,
    color: colors.white, fontSize: 15, padding: spacing.sm,
  },
  editActions: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  cancelBtn: {
    flex: 1, paddingVertical: 12, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, color: colors.muted },
  saveBtn: {
    flex: 2, paddingVertical: 12, borderRadius: radius.md,
    backgroundColor: colors.accent, alignItems: 'center',
  },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#0B0B0D' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border,
  },
  menuLabel: { fontSize: 15, color: colors.white },
});
