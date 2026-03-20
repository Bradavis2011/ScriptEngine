import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, Share, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { getScript, updateScriptStatus } from '@/lib/api';
import { colors, spacing, radius, scriptTypeColors, scriptTypeLabels } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  ready:  { label: 'Ready to Film', color: colors.accent },
  filmed: { label: 'Filmed',        color: colors.success },
  posted: { label: 'Posted',        color: colors.primary },
};

export default function ScriptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const tabBarHeight = (Platform.OS === 'ios' ? 60 : 56) + insets.bottom;
  const [markingPosted, setMarkingPosted] = useState(false);

  const { data: script, isLoading } = useQuery({
    queryKey: ['script', id],
    queryFn: async () => {
      const token = await getToken();
      return getScript(id!, token!);
    },
    enabled: !!id,
  });

  const markPosted = async () => {
    setMarkingPosted(true);
    try {
      const token = await getToken();
      await updateScriptStatus(id!, 'posted', token!);
      qc.invalidateQueries({ queryKey: ['scripts'] });
      qc.invalidateQueries({ queryKey: ['script', id] });
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setMarkingPosted(false);
    }
  };

  if (isLoading || !script) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  const d = script.scriptData;
  const typeColor = scriptTypeColors[script.scriptType] ?? colors.neutral;
  const typeLabel = scriptTypeLabels[script.scriptType] ?? script.scriptType;
  const statusBadge = STATUS_BADGE[script.filmingStatus] ?? STATUS_BADGE.ready;

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <GlowOrbs />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.white} />
        </TouchableOpacity>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
          <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusBadge.color + '22' }]}>
          <Text style={[styles.statusText, { color: statusBadge.color }]}>{statusBadge.label}</Text>
        </View>
        <Text style={styles.duration}>{d.totalDurationSeconds}s</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Cold Open */}
        <Section label="Cold Open" camera={d.coldOpenCamera}>
          <Text style={styles.scriptText}>"{d.coldOpen}"</Text>
        </Section>

        {/* Sections */}
        {d.sections.map((s, i) => (
          <Section key={i} label={s.heading} camera={s.cameraDirection} broll={s.bRollSuggestion} overlay={s.textOverlay}>
            <Text style={styles.scriptText}>"{s.script}"</Text>
          </Section>
        ))}

        {/* CTA */}
        <Section label="Call to Action" camera={d.callToActionCamera}>
          <Text style={styles.scriptText}>"{d.callToAction}"</Text>
        </Section>

        {/* Caption + hashtags */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { Clipboard.setStringAsync(d.caption); Alert.alert('Copied', 'Caption copied'); }}
          >
            <Ionicons name="copy-outline" size={16} color={colors.accent} />
            <Text style={styles.actionBtnText}>Copy Caption</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => { Clipboard.setStringAsync(d.hashtags.map(h => `#${h}`).join(' ')); Alert.alert('Copied', 'Hashtags copied'); }}
          >
            <Ionicons name="pricetag-outline" size={16} color={colors.accent} />
            <Text style={styles.actionBtnText}>Copy Hashtags</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.shareBtn}
          onPress={() => Share.share({ message: `"${d.coldOpen}"\n\nMade with ClipScript — clipscriptai.com` })}
        >
          <Ionicons name="share-outline" size={16} color={colors.muted} />
          <Text style={styles.shareBtnText}>Share Script</Text>
        </TouchableOpacity>

        <View style={{ height: tabBarHeight + 80 }} />
      </ScrollView>

      {/* Sticky CTAs — paddingBottom clears the floating tab bar */}
      {script.filmingStatus === 'ready' && (
        <View style={[styles.sticky, { paddingBottom: tabBarHeight + 8 }]}>
          <TouchableOpacity style={styles.filmBtn} onPress={() => router.push(`/(app)/teleprompter/${id}`)}>
            <Ionicons name="videocam" size={20} color={colors.background} />
            <Text style={styles.filmBtnText}>Film With Teleprompter</Text>
          </TouchableOpacity>
        </View>
      )}

      {script.filmingStatus === 'filmed' && (
        <View style={[styles.sticky, { paddingBottom: tabBarHeight + 8 }]}>
          <View style={styles.stickyRow}>
            <TouchableOpacity
              style={styles.refilmBtn}
              onPress={() => router.push(`/(app)/teleprompter/${id}`)}
            >
              <Ionicons name="reload" size={18} color={colors.white} />
              <Text style={styles.refilmBtnText}>Re-film</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filmBtn, styles.postedBtn, { flex: 1 }]}
              onPress={markPosted}
              disabled={markingPosted}
            >
              {markingPosted ? <ActivityIndicator color={colors.background} size="small" /> : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color={colors.background} />
                  <Text style={styles.filmBtnText}>Mark as Posted</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      {script.filmingStatus === 'posted' && (
        <View style={[styles.sticky, { paddingBottom: tabBarHeight + 8 }]}>
          <TouchableOpacity
            style={[styles.filmBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
            onPress={() => router.push(`/(app)/teleprompter/${id}`)}
          >
            <Ionicons name="reload" size={20} color={colors.white} />
            <Text style={[styles.filmBtnText, { color: colors.white }]}>Re-film This Script</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

function Section({ label, camera, broll, overlay, children }: {
  label: string; camera?: string; broll?: string; overlay?: string; children: React.ReactNode;
}) {
  return (
    <View style={secStyles.container}>
      <Text style={secStyles.label}>{label}</Text>
      {children}
      {camera ? (
        <View style={secStyles.meta}>
          <Ionicons name="camera-outline" size={12} color={colors.muted} />
          <Text style={secStyles.metaText}>{camera}</Text>
        </View>
      ) : null}
      {broll ? (
        <View style={secStyles.meta}>
          <Ionicons name="film-outline" size={12} color={colors.muted} />
          <Text style={secStyles.metaText}>{broll}</Text>
        </View>
      ) : null}
      {overlay ? (
        <View style={secStyles.meta}>
          <Ionicons name="text-outline" size={12} color={colors.muted} />
          <Text style={secStyles.metaText}>{overlay}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderBottomWidth: 1, borderBottomColor: colors.border, flexWrap: 'wrap',
  },
  backBtn: { padding: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm, borderWidth: 1 },
  typeText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.sm },
  statusText: { fontSize: 11, fontWeight: '700' },
  duration: { marginLeft: 'auto', fontSize: 12, color: colors.muted },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, gap: spacing.sm },
  scriptText: { fontSize: 16, color: colors.white, fontWeight: '600', lineHeight: 24, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 12,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: colors.accent },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingVertical: 12,
    marginTop: spacing.sm,
  },
  shareBtnText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  sticky: { padding: spacing.md },
  stickyRow: { flexDirection: 'row', gap: spacing.sm },
  filmBtn: {
    alignSelf: 'stretch', backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: 18, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8,
  },
  filmBtnText: { fontSize: 16, fontWeight: '700', color: colors.background },
  refilmBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    paddingVertical: 18, paddingHorizontal: spacing.lg,
  },
  refilmBtnText: { fontSize: 16, fontWeight: '600', color: colors.white },
  postedBtn: { backgroundColor: colors.success },
});

const secStyles = StyleSheet.create({
  container: {
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  meta: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 6 },
  metaText: { fontSize: 12, color: colors.muted, flex: 1, lineHeight: 17 },
});
