import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { getAllScripts, updateScriptStatus, ApiScript } from '@/lib/api';
import { colors, spacing, radius, scriptTypeColors, scriptTypeLabels } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const STATUS_CONFIG: Record<string, { label: string; icon: string }> = {
  ready:  { label: 'Ready',  icon: 'ellipse' },
  filmed: { label: 'Filmed', icon: 'checkmark-circle' },
  posted: { label: 'Posted', icon: 'share-social' },
};

export default function CameraScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const { data: scripts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['scripts', 'all'],
    queryFn: async () => {
      const token = await getToken();
      return getAllScripts(token!);
    },
  });

  const readyCount = scripts.filter(s => s.filmingStatus === 'ready').length;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <GlowOrbs />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Film</Text>
          <Text style={styles.sub}>
            {scripts.length === 0
              ? 'No scripts yet'
              : readyCount > 0
              ? `${readyCount} ready · ${scripts.length} total`
              : `${scripts.length} script${scripts.length !== 1 ? 's' : ''} — all filmed`}
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Ionicons name="refresh-outline" size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : isError ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color={colors.muted} />
          <Text style={{ color: colors.muted, marginTop: 12, fontSize: 15 }}>Couldn't load scripts</Text>
          <TouchableOpacity style={[styles.refreshBtn, { width: 'auto', paddingHorizontal: 20, marginTop: 16 }]} onPress={() => refetch()}>
            <Text style={{ color: colors.white, fontSize: 14, fontWeight: '600' }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={scripts}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<EmptyState />}
          renderItem={({ item }) => <ScriptCard script={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function ScriptCard({ script }: { script: ApiScript }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const [markingPosted, setMarkingPosted] = useState(false);

  const typeColor = scriptTypeColors[script.scriptType] ?? colors.accent;
  const typeLabel = scriptTypeLabels[script.scriptType] ?? script.scriptType;
  const dur = script.scriptData.totalDurationSeconds;
  const status = STATUS_CONFIG[script.filmingStatus] ?? STATUS_CONFIG.ready;
  const filmed = script.filmingStatus !== 'ready';

  const markPosted = async (e: any) => {
    e.stopPropagation();
    setMarkingPosted(true);
    try {
      const token = await getToken();
      await updateScriptStatus(script.id, 'posted', token!);
      qc.invalidateQueries({ queryKey: ['scripts'] });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not mark as posted');
    } finally {
      setMarkingPosted(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, filmed && styles.cardFilmed]}
      onPress={() => router.push(`/(app)/teleprompter/${script.id}`)}
      activeOpacity={0.8}
    >
      <View style={[styles.accentBar, { backgroundColor: typeColor, opacity: filmed ? 0.45 : 1 }]} />

      <View style={styles.cardBody}>
        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55', opacity: filmed ? 0.7 : 1 }]}>
            <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <View style={styles.statusPill}>
            <Ionicons
              name={status.icon as any}
              size={10}
              color={script.filmingStatus === 'posted' ? colors.primary : filmed ? colors.success : colors.muted}
            />
            <Text style={[
              styles.statusText,
              script.filmingStatus === 'filmed' && styles.statusFilmed,
              script.filmingStatus === 'posted' && styles.statusPosted,
            ]}>
              {status.label}
            </Text>
          </View>
          <View style={styles.durBadge}>
            <Ionicons name="time-outline" size={11} color={colors.muted} />
            <Text style={styles.durText}>{dur}s</Text>
          </View>
        </View>

        {/* Hook */}
        <Text style={[styles.hook, filmed && styles.hookFilmed]} numberOfLines={3}>
          "{script.scriptData.coldOpen}"
        </Text>

        {/* Footer actions */}
        <View style={styles.cardFooter}>
          {/* Re-film / Film Now — always present */}
          <View style={[
            styles.filmBtn,
            { backgroundColor: filmed ? colors.muted + '22' : typeColor },
          ]}>
            <Ionicons
              name={filmed ? 'reload' : 'videocam'}
              size={13}
              color={filmed ? colors.muted : '#0B0B0D'}
            />
            <Text style={[styles.filmBtnText, { color: filmed ? colors.muted : '#0B0B0D' }]}>
              {filmed ? 'Re-film' : 'Film Now'}
            </Text>
          </View>

          {/* Mark as Posted — only for filmed (not yet posted) */}
          {script.filmingStatus === 'filmed' && (
            <TouchableOpacity
              style={styles.postedBtn}
              onPress={markPosted}
              disabled={markingPosted}
              activeOpacity={0.75}
            >
              {markingPosted ? (
                <ActivityIndicator size="small" color={colors.success} />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={13} color={colors.success} />
                  <Text style={styles.postedBtnText}>Mark Posted</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  const router = useRouter();
  return (
    <View style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name="videocam-outline" size={36} color={colors.muted} />
      </View>
      <Text style={styles.emptyTitle}>Nothing to film yet</Text>
      <Text style={styles.emptySub}>Generate a script and it'll appear here</Text>
      <TouchableOpacity style={styles.genBtn} onPress={() => router.push('/(app)/generate')}>
        <Ionicons name="sparkles-outline" size={16} color="#0B0B0D" />
        <Text style={styles.genBtnText}>Generate Script</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md,
  },
  title: { fontSize: 26, fontWeight: '800', color: colors.white },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  list: { padding: spacing.md, paddingBottom: 120, gap: spacing.sm },

  card: {
    flexDirection: 'row', backgroundColor: colors.card,
    borderRadius: radius.lg, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  cardFilmed: { opacity: 0.85 },
  accentBar: { width: 4 },
  cardBody: { flex: 1, padding: spacing.md },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.sm, borderWidth: 1 },
  typeBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusText: { fontSize: 11, color: colors.muted, fontWeight: '600' },
  statusFilmed: { color: colors.success },
  statusPosted: { color: colors.primary },
  durBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, marginLeft: 'auto' },
  durText: { fontSize: 11, color: colors.muted, fontWeight: '500' },

  hook: { fontSize: 15, color: colors.white, fontWeight: '500', lineHeight: 22, marginBottom: 12, fontStyle: 'italic' },
  hookFilmed: { color: colors.neutral },

  cardFooter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.md,
  },
  filmBtnText: { fontSize: 13, fontWeight: '700' },
  postedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.md,
    backgroundColor: colors.success + '18', borderWidth: 1, borderColor: colors.success + '44',
  },
  postedBtnText: { fontSize: 13, fontWeight: '700', color: colors.success },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm,
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  emptySub: { fontSize: 14, color: colors.muted, textAlign: 'center', paddingHorizontal: spacing.xl },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 12, marginTop: spacing.sm,
  },
  genBtnText: { fontSize: 14, fontWeight: '700', color: '#0B0B0D' },
});
