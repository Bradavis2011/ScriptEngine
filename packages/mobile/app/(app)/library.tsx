import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getAllScripts, ApiScript } from '@/lib/api';
import { colors, spacing, radius, scriptTypeColors, scriptTypeLabels } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const TEAL = '#03EDD6';

const TABS = [
  { label: 'Ready', status: 'ready' },
  { label: 'Filmed', status: 'filmed' },
  { label: 'Posted', status: 'posted' },
] as const;

type Status = (typeof TABS)[number]['status'];

export default function LibraryScreen() {
  const [activeTab, setActiveTab] = useState<Status>('ready');
  const { getToken } = useAuth();
  const router = useRouter();

  // Single fetch for all scripts — tabs filter client-side, no re-fetch on tab switch
  const { data: scripts = [], isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['scripts', 'all'],
    queryFn: async () => {
      const token = await getToken();
      return getAllScripts(token!);
    },
  });

  const filtered = scripts.filter(s => s.filmingStatus === activeTab);
  const counts: Record<Status, number> = {
    ready:  scripts.filter(s => s.filmingStatus === 'ready').length,
    filmed: scripts.filter(s => s.filmingStatus === 'filmed').length,
    posted: scripts.filter(s => s.filmingStatus === 'posted').length,
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <GlowOrbs />

      <View style={styles.header}>
        <Text style={styles.title}>
          <Text style={{ color: colors.white }}>Script </Text>
          <Text style={{ color: TEAL }}>Library</Text>
        </Text>
        <TouchableOpacity style={styles.genBtn} onPress={() => router.push('/(app)/generate')}>
          <Ionicons name="add" size={20} color="#0B0B0D" />
          <Text style={styles.genBtnText}>Generate</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.status}
            style={[styles.tab, activeTab === t.status && styles.tabActive]}
            onPress={() => setActiveTab(t.status)}
          >
            <Text style={[styles.tabText, activeTab === t.status && styles.tabTextActive]}>
              {t.label}
              {counts[t.status] > 0 ? ` (${counts[t.status]})` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={TEAL} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color={colors.muted} />
          <Text style={styles.errorText}>Couldn't load scripts</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={TEAL} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No {activeTab} scripts yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <ScriptRow script={item} onPress={() => router.push(`/(app)/script/${item.id}`)} />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ScriptRow({ script, onPress }: { script: ApiScript; onPress: () => void }) {
  const router = useRouter();
  const typeColor = scriptTypeColors[script.scriptType] ?? colors.neutral;
  const typeLabel = scriptTypeLabels[script.scriptType] ?? script.scriptType;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardRow}>
        <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
        <View style={{ flex: 1 }}>
          <Text style={styles.typeLabel}>{typeLabel}</Text>
          <Text style={styles.coldOpen} numberOfLines={2}>
            "{script.scriptData.coldOpen}"
          </Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.duration}>{script.scriptData.totalDurationSeconds}s</Text>
          <TouchableOpacity
            style={styles.filmIconBtn}
            onPress={(e) => { e.stopPropagation(); router.push(`/(app)/teleprompter/${script.id}`); }}
          >
            <Ionicons
              name={script.filmingStatus === 'ready' ? 'videocam' : 'reload'}
              size={15}
              color={TEAL}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800' },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: TEAL, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  genBtnText: { fontSize: 14, fontWeight: '700', color: '#0B0B0D' },
  tabs: {
    flexDirection: 'row', marginHorizontal: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.md, padding: 4, marginBottom: spacing.md,
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: radius.sm },
  tabActive: {
    backgroundColor: TEAL,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4, shadowRadius: 6, elevation: 4,
  },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  tabTextActive: { color: '#0B0B0D', fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.sm },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  typeDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  typeLabel: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 4 },
  coldOpen: { fontSize: 14, color: colors.white, lineHeight: 20 },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  duration: { fontSize: 12, color: colors.muted },
  filmIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: TEAL + '22', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: TEAL + '44',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  errorText: { fontSize: 15, color: colors.muted },
  retryBtn: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 10 },
  retryBtnText: { fontSize: 14, fontWeight: '600', color: colors.white },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, color: colors.muted },
});
