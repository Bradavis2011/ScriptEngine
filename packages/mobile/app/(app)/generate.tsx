import { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { generateScript, generateScriptFromPhotos, getSeries, getMe, ApiSeries } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';
import { PaywallSheet } from '@/components/PaywallSheet';

const TEAL = '#03EDD6';

const BASE_SCRIPT_TYPES = [
  { value: 'niche_tip',      label: 'Niche Tip',      desc: '3 actionable tips' },
  { value: 'data_drop',      label: 'Data Drop',       desc: 'Surprising stat or fact' },
  { value: 'trend_take',     label: 'Trend Take',      desc: 'Hot take on a trend' },
  { value: 'series_episode', label: 'Series Episode',  desc: 'Part of an ongoing series' },
  { value: 'showcase',       label: 'Showcase',        desc: 'Walkthrough or tour' },
] as const;

const RE_SCRIPT_TYPES = [
  { value: 'listing_tour',  label: 'Listing Tour',   desc: 'Room-by-room walkthrough' },
  { value: 'just_listed',   label: 'Just Listed',    desc: 'New listing announcement' },
  { value: 'market_update', label: 'Market Update',  desc: 'Local market data & insights' },
] as const;

type ScriptTypeValue =
  | 'niche_tip' | 'data_drop' | 'trend_take' | 'series_episode' | 'showcase'
  | 'listing_tour' | 'just_listed' | 'market_update';

function getContextLabel(type: ScriptTypeValue): string {
  if (type === 'showcase' || type === 'listing_tour') return 'What are you featuring?';
  if (type === 'just_listed') return 'Listing details';
  if (type === 'market_update') return 'Market angle';
  return 'Angle or topic';
}

function getContextPlaceholder(type: ScriptTypeValue): string {
  if (type === 'showcase' || type === 'listing_tour')
    return 'e.g. 3bd/2ba ranch, granite counters, big backyard, pool, near Lincoln Elementary';
  if (type === 'just_listed')
    return 'e.g. 742 Evergreen Terrace, 4bd/3ba, $425k, corner lot, updated kitchen';
  if (type === 'market_update')
    return 'e.g. inventory down 15%, median price up, first-time buyers priced out';
  return 'e.g. "biggest mistakes beginners make" or "why I quit the gym"';
}

export default function GenerateScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const tabBarHeight = (Platform.OS === 'ios' ? 60 : 56) + insets.bottom;
  const params = useLocalSearchParams<{ seriesId?: string; scriptType?: string }>();

  const [scriptType, setScriptType] = useState<ScriptTypeValue>(
    (params.scriptType as ScriptTypeValue) ?? 'niche_tip'
  );
  const [seriesId, setSeriesId] = useState(params.seriesId ?? '');
  const [context, setContext] = useState('');
  const [photos, setPhotos] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [paywallVisible, setPaywallVisible] = useState(false);
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

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: async () => { const t = await getToken(); return getMe(t!); },
  });

  const { data: series = [] } = useQuery({
    queryKey: ['series'],
    queryFn: async () => { const t = await getToken(); return getSeries(t!); },
  });

  const isRealEstate = me?.niche === 'Real Estate';
  const visibleTypes = isRealEstate
    ? [...BASE_SCRIPT_TYPES, ...RE_SCRIPT_TYPES]
    : BASE_SCRIPT_TYPES;

  const scriptsToday  = me?.scriptsToday  ?? 0;
  const scriptsPerDay = me?.scriptsPerDay ?? 1;
  const isUnlimited   = me?.scriptsPerDay == null;
  const scriptsLeft   = isUnlimited ? Infinity : Math.max(0, scriptsPerDay - scriptsToday);
  const atLimit       = !isUnlimited && scriptsLeft === 0;

  const pickPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      quality: 0.7,
      selectionLimit: 10,
    });
    if (!result.canceled && result.assets.length > 0) {
      setPhotos(prev => [...prev, ...result.assets].slice(0, 10));
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerate = async () => {
    if (atLimit) { setPaywallVisible(true); return; }
    setLoading(true);
    try {
      const token = await getToken();
      let script;
      if (photos.length > 0) {
        script = await generateScriptFromPhotos(
          photos.map(p => ({ uri: p.uri, mimeType: p.mimeType ?? undefined })),
          scriptType,
          context.trim() || undefined,
          token!
        );
      } else {
        script = await generateScript(
          {
            scriptType,
            seriesId: scriptType === 'series_episode' && seriesId ? seriesId : undefined,
            additionalContext: context.trim() || undefined,
          },
          token!
        );
      }
      qc.invalidateQueries({ queryKey: ['scripts'] });
      qc.invalidateQueries({ queryKey: ['today'] });
      qc.invalidateQueries({ queryKey: ['me'] });
      router.replace(`/(app)/script/${script.id}`);
    } catch (e: any) {
      if (e.message?.includes('Daily limit')) {
        setPaywallVisible(true);
      } else {
        Alert.alert('Generation failed', e.message ?? 'Try again in a moment.');
      }
      setLoading(false);
    }
  };

  const handleUpgraded = () => {
    setPaywallVisible(false);
    qc.invalidateQueries({ queryKey: ['me'] });
  };

  const contextLabel = getContextLabel(scriptType);
  const contextIsOptional = scriptType !== 'just_listed' && scriptType !== 'market_update';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <GlowOrbs />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
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

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: tabBarHeight + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
          {/* Daily quota indicator */}
          {me && (
            <View style={[styles.quotaBar, atLimit && styles.quotaBarLimit]}>
              <View style={styles.quotaLeft}>
                <Ionicons
                  name={atLimit ? 'lock-closed' : 'sparkles-outline'}
                  size={14}
                  color={atLimit ? colors.warning : TEAL}
                />
                <Text style={[styles.quotaText, atLimit && styles.quotaTextLimit]}>
                  {isUnlimited
                    ? 'Unlimited generation'
                    : atLimit
                    ? `Daily limit reached — ${scriptsPerDay}/day on ${me.tier} plan`
                    : `${scriptsLeft} script${scriptsLeft !== 1 ? 's' : ''} left today`}
                </Text>
              </View>
              {atLimit && (
                <TouchableOpacity onPress={() => setPaywallVisible(true)}>
                  <Text style={styles.upgradeLink}>Upgrade</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <Text style={styles.sectionLabel}>Script type</Text>
          <View style={styles.typeGrid}>
            {visibleTypes.map((t) => (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeCard, scriptType === t.value && styles.typeCardActive]}
                onPress={() => setScriptType(t.value as ScriptTypeValue)}
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

          {/* Photos section */}
          <View style={styles.photoSection}>
            <View style={styles.photoHeader}>
              <Text style={styles.sectionLabel}>
                Photos <Text style={styles.optional}>(optional)</Text>
              </Text>
              {photos.length < 10 && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={pickPhotos}>
                  <Ionicons name="images-outline" size={14} color={TEAL} />
                  <Text style={styles.addPhotoBtnText}>Add Photos</Text>
                </TouchableOpacity>
              )}
            </View>
            {photos.length > 0 ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoStrip}>
                  {photos.map((photo, idx) => (
                    <View key={idx} style={styles.photoThumb}>
                      <Image source={{ uri: photo.uri }} style={styles.thumbImg} />
                      <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(idx)}>
                        <Ionicons name="close-circle" size={18} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
                <Text style={styles.photoHint}>
                  {photos.length}/10 photo{photos.length !== 1 ? 's' : ''} — Gemini will analyze the images to generate your script
                </Text>
              </>
            ) : (
              <Text style={styles.photoEmptyHint}>
                Upload 1–10 photos and let Gemini generate a script from what it sees
              </Text>
            )}
          </View>

          <Text style={styles.sectionLabel}>
            {contextLabel}{' '}
            {contextIsOptional && <Text style={styles.optional}>(optional)</Text>}
          </Text>
          <TextInput
            style={styles.contextInput}
            placeholder={getContextPlaceholder(scriptType)}
            placeholderTextColor={colors.muted}
            value={context}
            onChangeText={setContext}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={[styles.genBtn, (loading || atLimit) && styles.genBtnDisabled]}
            onPress={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <ActivityIndicator color="#0B0B0D" size="small" />
                <Text style={styles.genBtnText}>Generating… {elapsed}s</Text>
              </>
            ) : atLimit ? (
              <>
                <Ionicons name="lock-closed" size={16} color="#0B0B0D" />
                <Text style={styles.genBtnText}>Upgrade to Generate More</Text>
              </>
            ) : (
              <Text style={styles.genBtnText}>
                {photos.length > 0 ? 'Generate from Photos' : 'Generate Script'}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <PaywallSheet
        visible={paywallVisible}
        onClose={() => setPaywallVisible(false)}
        onUpgraded={handleUpgraded}
      />
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
  scroll: { padding: spacing.md, gap: spacing.sm },

  quotaBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: TEAL + '18', borderRadius: radius.md,
    borderWidth: 1, borderColor: TEAL + '44',
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  quotaBarLimit: {
    backgroundColor: colors.warning + '15',
    borderColor: colors.warning + '44',
  },
  quotaLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  quotaText: { fontSize: 13, fontWeight: '600', color: TEAL, flex: 1 },
  quotaTextLimit: { color: colors.warning },
  upgradeLink: { fontSize: 13, fontWeight: '700', color: colors.warning, textDecorationLine: 'underline' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginTop: spacing.md, marginBottom: spacing.sm },
  optional: { fontWeight: '400', textTransform: 'none' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    width: '48%', backgroundColor: colors.card, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  typeCardActive: {
    borderColor: TEAL, backgroundColor: TEAL + '15',
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

  photoSection: { marginTop: spacing.sm },
  photoHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addPhotoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: TEAL + '18', borderRadius: radius.sm,
    borderWidth: 1, borderColor: TEAL + '44',
    paddingHorizontal: 10, paddingVertical: 6,
    marginBottom: spacing.sm,
  },
  addPhotoBtnText: { fontSize: 12, fontWeight: '700', color: TEAL },
  photoStrip: { marginBottom: 8 },
  photoThumb: { marginRight: 8, position: 'relative' },
  thumbImg: { width: 72, height: 72, borderRadius: radius.sm, backgroundColor: colors.card },
  removePhotoBtn: {
    position: 'absolute', top: -6, right: -6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 9,
  },
  photoHint: { fontSize: 12, color: colors.muted, marginTop: 4 },
  photoEmptyHint: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },

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
