import {
  View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getScripts, ApiScript } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';

export default function CameraScreen() {
  const { getToken } = useAuth();
  const router = useRouter();

  const { data: scripts = [], isLoading } = useQuery({
    queryKey: ['scripts', 'ready'],
    queryFn: async () => {
      const token = await getToken();
      return getScripts('ready', token!);
    },
  });

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Ready to Film</Text>
        <Text style={styles.sub}>Pick a script and start rolling</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={scripts}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="sparkles-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>All caught up</Text>
              <Text style={styles.emptySub}>No scripts waiting to be filmed</Text>
              <TouchableOpacity style={styles.genBtn} onPress={() => router.push('/(app)/generate')}>
                <Ionicons name="add" size={18} color={colors.background} />
                <Text style={styles.genBtnText}>Generate One</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => <ReadyCard script={item} />}
        />
      )}
    </SafeAreaView>
  );
}

function ReadyCard({ script }: { script: ApiScript }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/teleprompter/${script.id}`)}
      activeOpacity={0.85}
    >
      <Text style={styles.coldOpen} numberOfLines={3}>
        "{script.scriptData.coldOpen}"
      </Text>
      <View style={styles.cardBottom}>
        <Text style={styles.duration}>{script.scriptData.totalDurationSeconds}s</Text>
        <View style={styles.filmPill}>
          <Ionicons name="videocam" size={14} color={colors.background} />
          <Text style={styles.filmPillText}>Film</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  title: { fontSize: 24, fontWeight: '800', color: colors.white },
  sub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.sm },
  card: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  coldOpen: { fontSize: 15, color: colors.white, fontWeight: '500', lineHeight: 22, marginBottom: spacing.md },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  duration: { fontSize: 13, color: colors.muted },
  filmPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.accent, borderRadius: radius.xl,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  filmPillText: { fontSize: 13, fontWeight: '700', color: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  emptySub: { fontSize: 14, color: colors.muted },
  genBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: spacing.lg, paddingVertical: 12, marginTop: spacing.sm,
  },
  genBtnText: { fontSize: 14, fontWeight: '700', color: colors.background },
});
