import { useState } from 'react';
import {
  View, Text, FlatList, StyleSheet, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, KeyboardAvoidingView,
  Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getSeries, createSeries, ApiSeries } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

export default function SeriesScreen() {
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: series = [], isLoading } = useQuery({
    queryKey: ['series'],
    queryFn: async () => {
      const token = await getToken();
      return getSeries(token!);
    },
  });

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const token = await getToken();
      await createSeries({ name: name.trim() }, token!);
      qc.invalidateQueries({ queryKey: ['series'] });
      setName('');
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Failed to create series');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <GlowOrbs />
      <View style={styles.header}>
        <Text style={styles.title}>Series</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => { setName(''); setModalVisible(true); }}>
          <Ionicons name="add" size={20} color={colors.background} />
          <Text style={styles.addBtnText}>New Series</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : (
        <FlatList
          data={series}
          keyExtractor={(s) => s.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="layers-outline" size={48} color={colors.muted} />
              <Text style={styles.emptyTitle}>No series yet</Text>
              <Text style={styles.emptySub}>Group related scripts into a series</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => { setName(''); setModalVisible(true); }}>
                <Ionicons name="add" size={18} color={colors.background} />
                <Text style={styles.addBtnText}>Create First Series</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => <SeriesCard series={item} onGenerate={() => router.push(`/(app)/generate?seriesId=${item.id}&scriptType=series_episode`)} />}
        />
      )}

      {/* Create modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => !saving && setModalVisible(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>New Series</Text>
            <Text style={styles.sheetLabel}>Series name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Morning Routine Hacks"
              placeholderTextColor={colors.muted}
              value={name}
              onChangeText={setName}
              onSubmitEditing={handleCreate}
              autoFocus
            />
            <TouchableOpacity
              style={[styles.createBtn, (!name.trim() || saving) && styles.createBtnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim() || saving}
            >
              {saving
                ? <ActivityIndicator color={colors.background} />
                : <Text style={styles.createBtnText}>Create Series</Text>
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function SeriesCard({ series, onGenerate }: { series: ApiSeries; onGenerate: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onGenerate} activeOpacity={0.8}>
      <View style={styles.cardIcon}>
        <Ionicons name="layers" size={20} color={colors.primary} />
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{series.name}</Text>
        <Text style={styles.cardMeta}>
          {series.episodeCount} episode{series.episodeCount !== 1 ? 's' : ''} · {series.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
        </Text>
      </View>
      <View style={styles.cardAction}>
        <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
        <Text style={styles.cardActionText}>New Ep</Text>
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
  title: { fontSize: 24, fontWeight: '800', color: colors.white },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent, borderRadius: radius.md,
    paddingHorizontal: 12, paddingVertical: 8,
  },
  addBtnText: { fontSize: 14, fontWeight: '700', color: colors.background },
  list: { padding: spacing.md, paddingBottom: 100, gap: spacing.sm },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border,
  },
  cardIcon: {
    width: 40, height: 40, borderRadius: radius.sm,
    backgroundColor: colors.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '600', color: colors.white },
  cardMeta: { fontSize: 12, color: colors.muted, marginTop: 2, textTransform: 'capitalize' },
  cardAction: { alignItems: 'center', gap: 2 },
  cardActionText: { fontSize: 10, fontWeight: '700', color: colors.primary, letterSpacing: 0.4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.white },
  emptySub: { fontSize: 14, color: colors.muted },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.lg, paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    borderWidth: 1, borderColor: colors.border,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: 'center', marginBottom: spacing.lg,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.white, marginBottom: spacing.md },
  sheetLabel: { fontSize: 12, fontWeight: '600', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  input: {
    backgroundColor: colors.background, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, fontSize: 15, color: colors.white, marginBottom: spacing.md,
  },
  createBtn: {
    backgroundColor: colors.accent, borderRadius: radius.lg,
    paddingVertical: 16, alignItems: 'center',
  },
  createBtnDisabled: { opacity: 0.4 },
  createBtnText: { fontSize: 16, fontWeight: '700', color: colors.background },
});
