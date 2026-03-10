import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { generateScript, getSeries, ApiSeries } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const TEAL = '#03EDD6';

const SCRIPT_TYPES = [
  { value: 'niche_tip', label: 'Niche Tip', desc: '3 actionable tips' },
  { value: 'data_drop', label: 'Data Drop', desc: 'Surprising stat or fact' },
  { value: 'trend_take', label: 'Trend Take', desc: 'Hot take on a trend' },
  { value: 'series_episode', label: 'Series Episode', desc: 'Part of an ongoing series' },
] as const;

type ScriptTypeValue = (typeof SCRIPT_TYPES)[number]['value'];

export default function GenerateScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const [scriptType, setScriptType] = useState<ScriptTypeValue>('niche_tip');
  const [seriesId, setSeriesId] = useState('');
  const [context, setContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loading]);

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: async () => {
      const token = await getToken();
      return getSeries(token!);
    },
  });

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const script = await generateScript(
        {
          scriptType,
          seriesId: scriptType === 'series_episode' && seriesId ? seriesId : undefined,
          additionalContext: context.trim() || undefined,
        },
        token!
      );
      qc.invalidateQueries({ queryKey: ['scripts'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      router.replace(`/(app)/script/${script.id}`);
    } catch (e: any) {
      Alert.alert('Generation failed', e.message ?? 'Try again in a moment.');
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <GlowOrbs />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={22} color={colors.white} />
          </TouchableOpacity>
          <Text style={styles.title}>
            <Text style={{ color: colors.white }}>Generate </Text>
            <Text style={{ color: TEAL }}>Script</Text>
          </Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.sectionLabel}>Script type</Text>
          <View style={styles.typeGrid}>
            {SCRIPT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeCard, scriptType === t.value && styles.typeCardActive]}
                onPress={() => setScriptType(t.value)}
              >
                <Text style={[styles.typeCardLabel, scriptType === t.value && styles.typeCardLabelActive]}>
                  {t.label}
                </Text>
                <Text style={styles.typeCardDesc}>{t.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {scriptType === 'series_episode' && series.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Series</Text>
              <View style={styles.seriesList}>
                {series.map((s: ApiSeries) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[styles.seriesOption, seriesId === s.id && styles.seriesOptionActive]}
                    onPress={() => setSeriesId(s.id)}
                  >
                    <Text style={[styles.seriesOptionText, seriesId === s.id && styles.seriesOptionTextActive]}>
                      {s.name}
                    </Text>
                    <Text style={styles.seriesEpCount}>{s.episodeCount} eps</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {scriptType === 'series_episode' && series.length === 0 && (
            <View style={styles.noSeriesBox}>
              <Text style={styles.noSeriesText}>No series yet — create one in the Series tab first.</Text>
            </View>
          )}

          <Text style={styles.sectionLabel}>Additional context <Text style={styles.optional}>(optional)</Text></Text>
          <TextInput
            style={styles.contextInput}
            placeholder={'e.g. "focus on beginner mistakes" or "use a personal story hook"'}
            placeholderTextColor={colors.muted}
            value={context}
            onChangeText={setContext}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.genBtn, loading && styles.genBtnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#0B0B0D" size="small" />
                <Text style={styles.genBtnText}>Generating… {elapsed}s</Text>
              </>
            ) : (
              <Text style={styles.genBtnText}>Generate Script</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 17, fontWeight: '700' },
  scroll: { padding: spacing.md, paddingBottom: 40, gap: spacing.sm },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.sm },
  optional: { fontWeight: '400', textTransform: 'none' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width: '48%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  typeCardActive: {
    borderColor: TEAL, backgroundColor: TEAL + '15',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  typeCardLabel: { fontSize: 14, fontWeight: '700', color: colors.white, marginBottom: 2 },
  typeCardLabelActive: { color: TEAL },
  typeCardDesc: { fontSize: 12, color: colors.muted },
  seriesList: { gap: spacing.sm },
  seriesOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md,
  },
  seriesOptionActive: { borderColor: TEAL },
  seriesOptionText: { fontSize: 14, fontWeight: '600', color: colors.white },
  seriesOptionTextActive: { color: TEAL },
  seriesEpCount: { fontSize: 12, color: colors.muted },
  noSeriesBox: { backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border },
  noSeriesText: { fontSize: 13, color: colors.muted },
  contextInput: {
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, fontSize: 14,
    color: colors.white, minHeight: 80,
  },
  genBtn: {
    backgroundColor: TEAL, borderRadius: radius.lg,
    paddingVertical: 18, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, marginTop: spacing.md,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 14, elevation: 8,
  },
  genBtnDisabled: { opacity: 0.6 },
  genBtnText: { fontSize: 16, fontWeight: '700', color: '#0B0B0D' },
});
