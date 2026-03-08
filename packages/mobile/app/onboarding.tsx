import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
  Alert, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { createTenant } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';

const NICHES = ['Fashion', 'Fitness', 'Food', 'Tech', 'Finance', 'Business'];
const FREQUENCIES = ['1', '3', '5', '10'];

export default function Onboarding() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [step, setStep] = useState(0);
  const [niche, setNiche] = useState('');
  const [loading, setLoading] = useState(false);

  const next = async () => {
    if (step < 1) { setStep(step + 1); return; }
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

  return (
    <SafeAreaView style={styles.root}>
      {/* Progress dots */}
      <View style={styles.progress}>
        {[0, 1].map((i) => (
          <View key={i} style={[styles.dot, i <= step && styles.dotActive]} />
        ))}
      </View>

      {step === 0 && (
        <View style={styles.step}>
          <Text style={styles.title}>What do you create?</Text>
          <Text style={styles.sub}>Pick your niche to personalize your scripts</Text>
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
        </View>
      )}

      {step === 1 && (
        <View style={styles.step}>
          <Text style={styles.title}>You're all set.</Text>
          <Text style={styles.sub}>
            Your first scripts will generate shortly. Film them anytime from the Scripts tab.
          </Text>
          <View style={[styles.confirmBox]}>
            <Text style={styles.confirmLabel}>Niche</Text>
            <Text style={styles.confirmValue}>{niche}</Text>
          </View>
        </View>
      )}

      <TouchableOpacity
        style={[styles.btn, (loading || (step === 0 && !niche)) && styles.btnDisabled]}
        onPress={next}
        disabled={loading || (step === 0 && !niche)}
      >
        {loading ? (
          <ActivityIndicator color={colors.background} />
        ) : (
          <Text style={styles.btnText}>{step === 1 ? 'Go to Library' : 'Continue'}</Text>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  progress: { flexDirection: 'row', gap: 8, marginBottom: spacing.xl },
  dot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent },
  step: { flex: 1, justifyContent: 'center' },
  title: { fontSize: 30, fontWeight: '800', color: colors.white, marginBottom: spacing.sm },
  sub: { fontSize: 15, color: colors.neutral, marginBottom: spacing.xl, lineHeight: 22 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { fontSize: 15, fontWeight: '600', color: colors.neutral },
  chipTextActive: { color: colors.background },
  confirmBox: {
    backgroundColor: colors.card, borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  confirmLabel: { fontSize: 11, fontWeight: '600', color: colors.neutral, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  confirmValue: { fontSize: 18, fontWeight: '700', color: colors.white },
  btn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', marginTop: spacing.md,
  },
  btnDisabled: { opacity: 0.4 },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.background },
});
