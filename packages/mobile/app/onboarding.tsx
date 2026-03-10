import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { createTenant } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const TEAL = '#03EDD6';
const RED  = '#FD1741';

const NICHES = [
  'Fashion', 'Fitness', 'Food', 'Finance', 'Business', 'Tech',
  'Health', 'Travel', 'Beauty', 'Education', 'Gaming', 'DIY',
  'Parenting', 'Real Estate', 'Music', 'Motivation',
];

export default function Onboarding() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (step < 2) { setStep(step + 1); return; }
    setLoading(true);
    try {
      const token = await getToken();
      const email = user?.primaryEmailAddress?.emailAddress ?? '';
      await createTenant({ email, niche }, token!);
      router.replace('/(app)');
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const progressWidth = step === 0 ? '33%' : step === 1 ? '66%' : '100%';

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <GlowOrbs />

      <View style={styles.progressTrack}>
        <LinearGradient
          colors={[TEAL, RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: progressWidth }]}
        />
      </View>

      {step === 0 && (
        <View style={styles.step}>
          <View style={styles.logoMark}>
            <Text style={styles.logoPlay}>▶</Text>
            <View style={styles.logoLines}>
              {[1, 0.7, 0.5].map((o, i) => (
                <View key={i} style={[styles.logoLine, { opacity: o }]} />
              ))}
            </View>
          </View>
          <Text style={styles.title}>
            <Text style={{ color: TEAL }}>Script. </Text>
            <Text style={{ color: colors.white }}>Film. Post.</Text>
          </Text>
          <Text style={styles.sub}>
            ClipScript writes your short-form videos in seconds. Read them on the built-in teleprompter, film, and post.
          </Text>
          <View style={styles.featureList}>
            {[
              'AI scripts in under 30 seconds',
              'Built-in teleprompter camera',
              'Track every video from idea to posted',
            ].map((f) => (
              <View key={f} style={styles.featureRow}>
                <View style={styles.featureDot} />
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.title}>
            <Text style={{ color: colors.white }}>What do you </Text>
            <Text style={{ color: TEAL }}>create?</Text>
          </Text>
          <Text style={styles.sub}>Pick your niche — your scripts will be written for this audience</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            <View style={styles.grid}>
              {NICHES.map((n) => (
                <TouchableOpacity
                  key={n}
                  style={[styles.chip, niche === n && styles.chipActive]}
                  onPress={() => setNiche(n)}
                >
                  <Text style={[styles.chipText, niche === n && styles.chipTextActive]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {step === 2 && (
        <View style={styles.step}>
          <Text style={styles.title}>
            <Text style={{ color: colors.white }}>You're all </Text>
            <Text style={{ color: TEAL }}>set.</Text>
          </Text>
          <Text style={styles.sub}>
            Hit Generate any time to create a script. Film it on the built-in teleprompter, then mark it posted when it's live.
          </Text>
          <View style={styles.confirmBox}>
            <Text style={styles.confirmLabel}>Your niche</Text>
            <Text style={styles.confirmValue}>{niche}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, (loading || (step === 1 && !niche)) && styles.btnDisabled]}
        onPress={next}
        disabled={loading || (step === 1 && !niche)}
      >
        {loading ? (
          <ActivityIndicator color="#0B0B0D" />
        ) : (
          <Text style={styles.btnText}>{step === 2 ? 'Start Creating' : 'Continue'}</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  progressTrack: {
    height: 4, borderRadius: 2, backgroundColor: colors.border,
    marginBottom: spacing.xl, overflow: 'hidden',
  },
  progressFill: { height: 4, borderRadius: 2 },
  step: { flex: 1, justifyContent: 'center' },

  // Welcome step logo mark
  logoMark: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: TEAL + '18', borderRadius: 20, padding: 16,
    alignSelf: 'flex-start', marginBottom: spacing.xl,
    borderWidth: 1, borderColor: TEAL + '44',
  },
  logoPlay: { fontSize: 22, color: TEAL },
  logoLines: { gap: 5 },
  logoLine: { height: 3, width: 24, backgroundColor: TEAL, borderRadius: 2 },

  title: { fontSize: 34, fontWeight: '800', marginBottom: spacing.sm, lineHeight: 42 },
  sub: { fontSize: 15, color: colors.neutral, marginBottom: spacing.xl, lineHeight: 23 },

  featureList: { gap: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: TEAL },
  featureText: { fontSize: 15, color: colors.white, fontWeight: '500' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.md },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: {
    backgroundColor: TEAL + '18', borderColor: TEAL,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 3,
  },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.neutral },
  chipTextActive: { color: TEAL, fontWeight: '700' },

  confirmBox: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: TEAL + '44',
  },
  confirmLabel: { fontSize: 11, fontWeight: '600', color: colors.neutral, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  confirmValue: { fontSize: 20, fontWeight: '700', color: colors.white },

  btn: {
    backgroundColor: TEAL, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', marginTop: spacing.md,
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 14, elevation: 8,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: '#0B0B0D' },
});
