import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/lib/theme';
import { getOfferings, purchasePackage, restorePurchases, hasProEntitlement, getCustomerInfo } from '@/lib/purchases';

const TEAL = '#03EDD6';

const FEATURES = [
  '5 scripts per day (vs 1 free)',
  'All script types: Data Drop, Trend Take, Series',
  'In-app teleprompter camera',
  'Series management',
  'Priority generation',
];

interface Props {
  visible: boolean;
  onClose: () => void;
  onUpgraded: () => void;
}

interface PackageOption {
  pkg: any;
  id: string;
  title: string;
  price: string;
  period: string;
  badge?: string;
}

export function PaywallSheet({ visible, onClose, onUpgraded }: Props) {
  const [offerings, setOfferings] = useState<PackageOption[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingOfferings, setLoadingOfferings] = useState(true);

  useEffect(() => {
    if (!visible) return;
    loadOfferings();
  }, [visible]);

  const loadOfferings = async () => {
    setLoadingOfferings(true);
    try {
      const result = await getOfferings();
      const current = result?.current;
      if (current?.availablePackages?.length) {
        const mapped: PackageOption[] = current.availablePackages.map((pkg: any) => {
          const id: string = pkg.identifier ?? pkg.product?.identifier ?? '';
          const isAnnual = id.includes('annual') || id.includes('founders');
          return {
            pkg,
            id,
            title: isAnnual ? 'Founders Annual' : 'Pro Monthly',
            price: pkg.product?.priceString ?? (isAnnual ? '$60/yr' : '$7/mo'),
            period: isAnnual ? 'per year' : 'per month',
            badge: isAnnual ? 'Best Value' : undefined,
          };
        });
        setOfferings(mapped);
        // Pre-select the annual plan
        const annual = mapped.find(p => p.id.includes('annual') || p.id.includes('founders'));
        setSelected(annual?.id ?? mapped[0]?.id ?? null);
      } else {
        // Fallback display when running in Expo Go or offerings not configured yet
        setOfferings([
          { pkg: null, id: 'pro_monthly',      title: 'Pro Monthly',     price: '$7/mo',  period: 'per month' },
          { pkg: null, id: 'founders_annual',   title: 'Founders Annual', price: '$60/yr', period: 'per year', badge: 'Best Value' },
        ]);
        setSelected('founders_annual');
      }
    } catch {
      setOfferings([
        { pkg: null, id: 'pro_monthly',    title: 'Pro Monthly',     price: '$7/mo',  period: 'per month' },
        { pkg: null, id: 'founders_annual', title: 'Founders Annual', price: '$60/yr', period: 'per year', badge: 'Best Value' },
      ]);
      setSelected('founders_annual');
    } finally {
      setLoadingOfferings(false);
    }
  };

  const handlePurchase = async () => {
    const option = offerings.find(o => o.id === selected);
    if (!option?.pkg) {
      Alert.alert('Not available', 'Purchase is not available in this build. Use a TestFlight or Play Store build.');
      return;
    }
    setLoading(true);
    try {
      const { customerInfo } = await purchasePackage(option.pkg);
      if (hasProEntitlement(customerInfo)) {
        onUpgraded();
      } else {
        Alert.alert('Purchase issue', 'Payment went through but entitlement not found. Please restore purchases or contact support.');
      }
    } catch (e: any) {
      if (e?.userCancelled) return; // user dismissed the payment sheet
      Alert.alert('Purchase failed', e?.message ?? 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    setLoading(true);
    try {
      const customerInfo = await restorePurchases();
      if (hasProEntitlement(customerInfo)) {
        onUpgraded();
      } else {
        Alert.alert('No active subscription found', 'If you believe this is an error, contact hello@clipscriptai.com');
      }
    } catch (e: any) {
      Alert.alert('Restore failed', e?.message ?? 'Could not restore purchases.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overSheet">
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Close */}
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Ionicons name="close" size={20} color={colors.muted} />
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            {/* Header */}
            <View style={styles.iconWrap}>
              <Ionicons name="sparkles" size={32} color={TEAL} />
            </View>
            <Text style={styles.title}>Upgrade to Pro</Text>
            <Text style={styles.sub}>You've hit your daily free limit. Unlock 5 scripts per day.</Text>

            {/* Features */}
            <View style={styles.features}>
              {FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={16} color={TEAL} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>

            {/* Plan options */}
            {loadingOfferings ? (
              <ActivityIndicator color={TEAL} style={{ marginVertical: 24 }} />
            ) : (
              <View style={styles.plans}>
                {offerings.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[styles.plan, selected === option.id && styles.planSelected]}
                    onPress={() => setSelected(option.id)}
                    activeOpacity={0.8}
                  >
                    <View style={styles.planLeft}>
                      <View style={[styles.radio, selected === option.id && styles.radioSelected]}>
                        {selected === option.id && <View style={styles.radioDot} />}
                      </View>
                      <View>
                        <Text style={styles.planTitle}>{option.title}</Text>
                        <Text style={styles.planPeriod}>{option.period}</Text>
                      </View>
                    </View>
                    <View style={styles.planRight}>
                      {option.badge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{option.badge}</Text>
                        </View>
                      )}
                      <Text style={styles.planPrice}>{option.price}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* CTA */}
            <TouchableOpacity
              style={[styles.ctaBtn, loading && { opacity: 0.6 }]}
              onPress={handlePurchase}
              disabled={loading || !selected}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#0B0B0D" />
              ) : (
                <Text style={styles.ctaBtnText}>Subscribe Now</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.restoreBtn} onPress={handleRestore} disabled={loading}>
              <Text style={styles.restoreText}>Restore Purchases</Text>
            </TouchableOpacity>

            <Text style={styles.legal}>
              Subscriptions auto-renew. Cancel anytime in App Store / Play Store settings.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderWidth: 1, borderColor: colors.border,
    maxHeight: '92%',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginTop: 12,
  },
  closeBtn: {
    position: 'absolute', top: 16, right: 16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center',
  },
  content: { padding: spacing.lg, paddingTop: spacing.md },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: TEAL + '20', borderWidth: 1, borderColor: TEAL + '44',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: spacing.md,
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.white, textAlign: 'center', marginBottom: 8 },
  sub: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: spacing.lg },
  features: { gap: 10, marginBottom: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureText: { fontSize: 14, color: colors.white, flex: 1 },
  plans: { gap: spacing.sm, marginBottom: spacing.lg },
  plan: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.background, borderRadius: radius.lg,
    borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md,
  },
  planSelected: {
    borderColor: TEAL,
    backgroundColor: TEAL + '12',
  },
  planLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: TEAL },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: TEAL },
  planTitle: { fontSize: 15, fontWeight: '700', color: colors.white },
  planPeriod: { fontSize: 12, color: colors.muted, marginTop: 1 },
  planRight: { alignItems: 'flex-end', gap: 4 },
  badge: {
    backgroundColor: TEAL + '22', borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 2, borderWidth: 1, borderColor: TEAL + '44',
  },
  badgeText: { fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.4 },
  planPrice: { fontSize: 16, fontWeight: '800', color: colors.white },
  ctaBtn: {
    backgroundColor: TEAL, borderRadius: radius.lg,
    paddingVertical: 18, alignItems: 'center', justifyContent: 'center',
    shadowColor: TEAL, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5, shadowRadius: 14, elevation: 8,
    marginBottom: spacing.sm,
  },
  ctaBtnText: { fontSize: 16, fontWeight: '800', color: '#0B0B0D' },
  restoreBtn: { alignItems: 'center', paddingVertical: 12 },
  restoreText: { fontSize: 13, color: colors.muted, textDecorationLine: 'underline' },
  legal: { fontSize: 11, color: colors.muted, textAlign: 'center', lineHeight: 16, marginTop: 4, marginBottom: spacing.md },
});
