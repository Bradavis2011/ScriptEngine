import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Dimensions, Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import { Ionicons } from '@expo/vector-icons';
import { getScript, updateScriptStatus } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';

const { height: SCREEN_H } = Dimensions.get('window');

export default function TeleprompterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const qc = useQueryClient();

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();

  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingRef = useRef<{ uri: string } | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [elapsed, setElapsed] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: script, isLoading } = useQuery({
    queryKey: ['script', id],
    queryFn: async () => {
      const token = await getToken();
      return getScript(id!, token!);
    },
    enabled: !!id,
  });

  // Scroll loop
  const startScroll = useCallback(() => {
    if (scrollInterval.current) clearInterval(scrollInterval.current);
    scrollInterval.current = setInterval(() => {
      scrollY.current += speed * 0.8;
      scrollRef.current?.scrollTo({ y: scrollY.current, animated: false });
    }, 16);
  }, [speed]);

  const stopScroll = useCallback(() => {
    if (scrollInterval.current) { clearInterval(scrollInterval.current); scrollInterval.current = null; }
  }, []);

  useEffect(() => {
    if (isScrolling) startScroll(); else stopScroll();
    return stopScroll;
  }, [isScrolling, speed]);

  // Timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isRecording]);

  useEffect(() => () => { stopScroll(); }, []);

  const ensurePermissions = async () => {
    if (!camPermission?.granted) {
      const r = await requestCamPermission();
      if (!r.granted) { Alert.alert('Camera permission required'); return false; }
    }
    if (!micPermission?.granted) {
      const r = await requestMicPermission();
      if (!r.granted) { Alert.alert('Microphone permission required'); return false; }
    }
    if (!mediaPermission?.granted) {
      const r = await requestMediaPermission();
      if (!r.granted) { Alert.alert('Photo library permission required'); return false; }
    }
    return true;
  };

  const startRecording = async () => {
    const ok = await ensurePermissions();
    if (!ok) return;
    setIsRecording(true);
    setIsScrolling(true);
    setElapsed(0);
    try {
      // recordAsync resolves when stopRecording() is called
      const result = await cameraRef.current?.recordAsync({ maxDuration: 180 });
      if (result?.uri) recordingRef.current = result;
    } catch (e) {
      console.error('Recording error', e);
    }
  };

  const stopRecording = async () => {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
    setIsScrolling(false);

    // Save to camera roll
    if (recordingRef.current?.uri) {
      try {
        await MediaLibrary.saveToLibraryAsync(recordingRef.current.uri);
      } catch (e) {
        console.error('Save failed', e);
      }
    }

    // Mark as filmed
    try {
      const token = await getToken();
      await updateScriptStatus(id!, 'filmed', token!);
      qc.invalidateQueries({ queryKey: ['scripts'] });
    } catch (e) {
      console.error('Status update failed', e);
    }

    setShowSuccess(true);
  };

  const restart = () => {
    stopScroll();
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setIsScrolling(false);
    setIsRecording(false);
    setElapsed(0);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (isLoading || !script) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const teleprompterText = script.scriptData.teleprompterText;

  // Success overlay
  if (showSuccess) {
    return (
      <View style={[styles.root, styles.center]}>
        <View style={styles.successIcon}>
          <Ionicons name="checkmark" size={40} color={colors.success} />
        </View>
        <Text style={styles.successTitle}>Saved to Camera Roll</Text>
        <Text style={styles.successSub}>Script marked as filmed</Text>
        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.successShareBtn}
            onPress={() => {
              const text = `Just filmed this 🎬\n\n"${script.scriptData.coldOpen.slice(0, 100)}"\n\nScript made with ClipScript — clipscriptai.com`;
              import('expo-clipboard').then(C => C.setStringAsync(text));
              Alert.alert('Copied', 'Post text copied — paste it to your feed!');
            }}
          >
            <Ionicons name="share-outline" size={16} color={colors.accent} />
            <Text style={styles.successShareText}>Copy Post</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.successDoneBtn} onPress={() => router.back()}>
            <Text style={styles.successDoneText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera background */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing="front"
        mode="video"
      />

      {/* Dark overlay for readability */}
      <View style={styles.overlay} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { stopScroll(); router.back(); }} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colors.white} />
        </TouchableOpacity>
        {isRecording && (
          <View style={styles.recIndicator}>
            <View style={styles.recDot} />
            <Text style={styles.recTimer}>{fmt(elapsed)}</Text>
          </View>
        )}
        <View style={{ width: 36 }} />
      </View>

      {/* Teleprompter text */}
      <ScrollView
        ref={scrollRef}
        style={styles.teleScroll}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.teleContent}
      >
        <Text style={styles.teleText}>{teleprompterText}</Text>
        <View style={{ height: SCREEN_H * 0.5 }} />
      </ScrollView>

      {/* Bottom controls */}
      <View style={styles.controls}>
        {/* Speed bar */}
        <View style={styles.speedRow}>
          <Text style={styles.speedLabel}>0.5×</Text>
          <View style={styles.speedTrack}>
            <View style={[styles.speedFill, { width: `${((speed - 0.5) / 1.5) * 100}%` }]} />
            {/* Simple increment/decrement since Slider isn't in base RN */}
            <View style={styles.speedBtns}>
              {[0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((v) => (
                <TouchableOpacity key={v} style={[styles.speedPip, speed === v && styles.speedPipActive]} onPress={() => setSpeed(v)}>
                  <Text style={[styles.speedPipText, speed === v && styles.speedPipTextActive]}>{v}×</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.speedLabel}>2×</Text>
        </View>

        {/* Action buttons */}
        <View style={styles.btns}>
          <TouchableOpacity style={styles.iconBtn} onPress={restart}>
            <Ionicons name="refresh" size={22} color={colors.white} />
          </TouchableOpacity>

          {!isRecording ? (
            <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
              <View style={styles.recordBtnInner} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.recordBtn} onPress={stopRecording}>
              <View style={styles.stopBtnInner} />
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.iconBtn} onPress={() => setIsScrolling(s => !s)}>
            <Ionicons name={isScrolling ? 'pause' : 'play'} size={22} color={colors.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  topBar: {
    position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, zIndex: 10,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  recIndicator: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  recTimer: { fontSize: 13, fontWeight: '700', color: colors.white, fontVariant: ['tabular-nums'] },
  teleScroll: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 180 },
  teleContent: { paddingTop: SCREEN_H * 0.4, paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  teleText: { fontSize: 24, fontWeight: '600', color: colors.white, lineHeight: 38, textAlign: 'center' },
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.md, paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    backgroundColor: 'rgba(11,11,13,0.85)',
  },
  speedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  speedLabel: { fontSize: 11, color: colors.muted, width: 28, textAlign: 'center' },
  speedTrack: { flex: 1, position: 'relative' },
  speedFill: { height: 2, backgroundColor: colors.accent, borderRadius: 1 },
  speedBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  speedPip: { paddingVertical: 4, paddingHorizontal: 2 },
  speedPipActive: {},
  speedPipText: { fontSize: 10, color: colors.muted },
  speedPipTextActive: { color: colors.accent, fontWeight: '700' },
  btns: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xl },
  iconBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center',
  },
  recordBtn: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 3, borderColor: colors.error,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.15)',
  },
  recordBtnInner: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.error },
  stopBtnInner: { width: 28, height: 28, borderRadius: 4, backgroundColor: colors.error },
  // Success
  successIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.success + '22', alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  successTitle: { fontSize: 22, fontWeight: '800', color: colors.white, marginBottom: spacing.sm },
  successSub: { fontSize: 15, color: colors.muted, marginBottom: spacing.xl },
  successActions: { flexDirection: 'row', gap: spacing.sm },
  successShareBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: colors.accent, borderRadius: radius.xl,
    paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  successShareText: { fontSize: 15, fontWeight: '600', color: colors.accent },
  successDoneBtn: { backgroundColor: colors.accent, borderRadius: radius.xl, paddingHorizontal: spacing.xl, paddingVertical: 14 },
  successDoneText: { fontSize: 15, fontWeight: '700', color: colors.background },
});
