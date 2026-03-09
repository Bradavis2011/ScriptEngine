import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { getTodayScripts, ApiScript } from '@/lib/api';
import { colors, spacing, radius, scriptTypeColors, scriptTypeLabels } from '@/lib/theme';

export default function TodayScreen() {
  const { getToken } = useAuth();
  const router = useRouter();
  const qc = useQueryClient();

  const { data: scripts = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ['today'],
    queryFn: async () => {
      const token = await getToken();
      return getTodayScripts(token!);
    },
  });

  const isOnboardingNeeded = isError && (error as Error).message?.includes('Tenant not found');

  useEffect(() => {
    if (isOnboardingNeeded) {
      router.replace('/onboarding');
    }
  }, [isOnboardingNeeded]);

  if (isOnboardingNeeded) return null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Today's Scripts</Text>
          <Text style={styles.sub}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
        </View>
        <TouchableOpacity style={styles.genBtn} onPress={() => router.push('/(app)/generate')}>
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.genBtnText}>Generate</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={scripts}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={colors.accent} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="sparkles-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No scripts yet today</Text>
              <Text style={styles.emptySub}>Scripts generate at 6AM — or tap Generate to make one now.</Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(app)/generate')}>
                <Text style={styles.emptyBtnText}>Generate Now</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => <ScriptCard script={item} onPress={() => router.push(`/(app)/script/${item.id}`)} />}
        />
      )}
    </SafeAreaView>
  );
}

function ScriptCard({ script, onPress }: { script: ApiScript; onPress: () => void }) {
  const router = useRouter();
  const typeColor = scriptTypeColors[script.scriptType] ?? colors.neutral;
  const typeLabel = scriptTypeLabels[script.scriptType] ?? script.scriptType;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.cardTop}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        <Text style={styles.duration}>{script.scriptData.totalDurationSeconds}s</Text>
      </View>
      <Text style={styles.coldOpen} numberOfLines={3}>
        "{script.scriptData.coldOpen}"
      </Text>
      {script.filmingStatus === 'ready' && (
        <TouchableOpacity
          style={styles.filmBtn}
          onPress={(e) => { e.stopPropagation(); router.push(`/(app)/teleprompter/${script.id}`); }}
        >
          <Ionicons name="videocam" size={16} color={colors.background} />
          <Text style={styles.filmBtnText}>Film This</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.white },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  genBtnText: { fontSize: 14, fontWeight: '700', color: colors.background },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.sm },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  typeBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm, borderWidth: 1,
  },
  typeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  duration: { fontSize: 12, color: colors.muted },
  coldOpen: { fontSize: 15, color: colors.white, lineHeight: 22, fontWeight: '500', marginBottom: spacing.md },
  filmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingVertical: 10, justifyContent: 'center',
  },
  filmBtnText: { fontSize: 14, fontWeight: '700', color: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.lg },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.white, marginTop: spacing.md },
  emptySub: { fontSize: 14, color: colors.neutral, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  emptyBtn: {
    marginTop: spacing.lg, backgroundColor: colors.accent,
    borderRadius: radius.md, paddingHorizontal: spacing.lg, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
