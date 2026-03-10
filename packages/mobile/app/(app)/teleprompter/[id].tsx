import { useRef, useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Alert, ActivityIndicator, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { getScript, updateScriptStatus } from '@/lib/api';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const { height: SCREEN_H } = Dimensions.get('window');
const TEAL = '#03EDD6';
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

const SPEEDS = [
  { label: 'Slow', value: 0.6 },
  { label: 'Normal', value: 1.0 },
  { label: 'Fast', value: 1.6 },
] as const;

export default function TeleprompterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const [camPermission, requestCamPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const cameraRef = useRef<CameraView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const scrollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [isRecording, setIsRecording] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [elapsed, setElapsed] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [pendingUri, setPendingUri] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dotOpacity = useRef(new Animated.Value(1)).current;

  // Reset all state when screen gains focus — fixes "stuck on success screen" bug
  // (teleprompter is a Tabs.Screen so state persists between navigations)
  useFocusEffect(
    useCallback(() => {
      setPendingUri(null);
      setShowSuccess(false);
      setSavedToLibrary(false);
      setIsRecording(false);
      setIsScrolling(false);
      setElapsed(0);
      setCountdown(0);
      scrollY.current = 0;
    }, [])
  );

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

  // Blinking REC dot
  useEffect(() => {
    if (isRecording) {
      const blink = Animated.loop(
        Animated.sequence([
          Animated.timing(dotOpacity, { toValue: 0.2, duration: 500, useNativeDriver: true }),
          Animated.timing(dotOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        ])
      );
      blink.start();
      return () => blink.stop();
    } else {
      dotOpacity.setValue(1);
    }
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
    return true;
  };

  // --- Recording lifecycle ---
  // beginRecording starts recording and lands on the review screen when stopped.
  // keepTake saves + marks filmed. retake resets so the user can go again.
  const beginRecording = async () => {
    setIsRecording(true);
    setIsScrolling(true);
    try {
      const result = await cameraRef.current?.recordAsync({ maxDuration: 180 });
      // recordAsync resolves after stopRecording() is called
      setPendingUri(result?.uri ?? null);
    } catch (e) {
      console.error('Recording error', e);
      setIsRecording(false);
      setIsScrolling(false);
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
    setIsRecording(false);
    setIsScrolling(false);
  };

  const keepTake = async () => {
    let savedToLibrary = false;
    if (pendingUri) {
      if (IS_EXPO_GO) {
        Alert.alert(
          'Video not saved',
          'Expo Go cannot save videos to your camera roll. To save videos, install the ClipScript app via a device build.\n\nYour script is still marked as filmed.',
        );
      } else {
        try {
          const perm = await MediaLibrary.requestPermissionsAsync();
          if (perm.granted) {
            await MediaLibrary.saveToLibraryAsync(pendingUri);
            savedToLibrary = true;
          } else {
            Alert.alert('Permission denied', 'Grant photo/video access in Settings to save videos.');
          }
        } catch (e: any) {
          Alert.alert('Save failed', e?.message ?? 'Could not save to camera roll.');
        }
      }
    }
    try {
      const token = await getToken();
      await updateScriptStatus(id!, 'filmed', token!);
      qc.invalidateQueries({ queryKey: ['scripts'] });
    } catch {}
    setSavedToLibrary(savedToLibrary);
    setShowSuccess(true);
  };

  const retake = () => {
    setPendingUri(null);
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setElapsed(0);
  };

  // Countdown: 3 → 2 → 1 → beginRecording
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => {
      if (countdown === 1) {
        setCountdown(0);
        beginRecording();
      } else {
        setCountdown(c => c - 1);
      }
    }, 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const initiateRecording = async () => {
    const ok = await ensurePermissions();
    if (!ok) return;
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    setElapsed(0);
    setCountdown(3);
  };

  const restart = () => {
    if (isRecording) stopRecording();
    stopScroll();
    scrollY.current = 0;
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    setIsScrolling(false);
    setIsRecording(false);
    setElapsed(0);
    setCountdown(0);
  };

  const fmt = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (isLoading || !script) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} size="large" /></View>;
  }

  const teleprompterText = script.scriptData.teleprompterText;
  const controlsHeight = 168 + insets.bottom;

  // Review screen — shown after stopping, before committing
  if (pendingUri && !showSuccess) {
    return (
      <View style={[styles.root, styles.center]}>
        <GlowOrbs />
        <View style={styles.reviewIcon}>
          <Ionicons name="videocam" size={36} color={TEAL} />
        </View>
        <Text style={styles.reviewTitle}>How was that take?</Text>
        <Text style={styles.reviewSub}>{fmt(elapsed)} recorded</Text>
        <View style={styles.reviewActions}>
          <TouchableOpacity style={styles.retakeBtn} onPress={retake}>
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.retakeBtnText}>Re-take</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepBtn} onPress={keepTake}>
            <Ionicons name="checkmark" size={18} color="#0B0B0D" />
            <Text style={styles.keepBtnText}>Keep It</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (showSuccess) {
    return (
      <View style={[styles.root, styles.center]}>
        <GlowOrbs />
        <View style={styles.successCircle}>

          <Ionicons name="checkmark" size={44} color="#0B0B0D" />
        </View>
        <Text style={styles.successTitle}>{savedToLibrary ? 'Saved to Camera Roll' : 'Take Complete'}</Text>
        <Text style={styles.successSub}>
          {savedToLibrary
            ? 'Check your Photos/Gallery app · Script marked as filmed'
            : 'Script marked as filmed'}
        </Text>
        <View style={styles.successActions}>
          <TouchableOpacity
            style={styles.retakeBtn}
            onPress={() => {
              setShowSuccess(false);
              setSavedToLibrary(false);
              setPendingUri(null);
              setElapsed(0);
              scrollY.current = 0;
              scrollRef.current?.scrollTo({ y: 0, animated: false });
            }}
          >
            <Ionicons name="videocam-outline" size={16} color={colors.white} />
            <Text style={styles.retakeBtnText}>Film Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepBtn} onPress={() => router.replace('/(app)/camera')}>
            <Text style={styles.keepBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {/* Camera feed */}
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        mode="video"
      />

      {/* Subtle overlay — keep yourself visible */}
      <View style={styles.overlay} />

      {/* Top gradient for control legibility */}
      <LinearGradient
        colors={['rgba(0,0,0,0.65)', 'transparent']}
        style={[styles.topGradient, { height: insets.top + 80 }]}
        pointerEvents="none"
      />

      {/* Top bar */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => { stopScroll(); router.back(); }}
        >
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>

        {isRecording ? (
          <View style={styles.recBadge}>
            <Animated.View style={[styles.recDot, { opacity: dotOpacity }]} />
            <Text style={styles.recTimer}>{fmt(elapsed)}</Text>
          </View>
        ) : (
          <View style={styles.scriptTypePill}>
            <Text style={styles.scriptTypePillText}>TELEPROMPTER</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => setFacing(f => f === 'front' ? 'back' : 'front')}
          disabled={isRecording}
        >
          <Ionicons name="camera-reverse-outline" size={22} color={isRecording ? 'rgba(255,255,255,0.3)' : '#fff'} />
        </TouchableOpacity>
      </View>

      {/* Teleprompter text */}
      <ScrollView
        ref={scrollRef}
        style={[styles.teleScroll, { bottom: controlsHeight }]}
        scrollEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.teleContent}
      >
        <Text style={styles.teleText}>{teleprompterText}</Text>
        <View style={{ height: SCREEN_H * 0.5 }} />
      </ScrollView>

      {/* Bottom text fade */}
      <LinearGradient
        colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.75)']}
        style={[styles.bottomFade, { bottom: controlsHeight, height: 100 }]}
        pointerEvents="none"
      />

      {/* Controls panel */}
      <View style={[styles.controls, { paddingBottom: insets.bottom + 20 }]}>
        {/* Speed row */}
        <View style={styles.speedRow}>
          <Text style={styles.speedLabel}>SPEED</Text>
          <View style={styles.speedBtns}>
            {SPEEDS.map((s) => (
              <TouchableOpacity
                key={s.value}
                style={[styles.speedBtn, speed === s.value && styles.speedBtnActive]}
                onPress={() => setSpeed(s.value)}
              >
                <Text style={[styles.speedBtnText, speed === s.value && styles.speedBtnTextActive]}>
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.sideBtn} onPress={restart}>
            <View style={styles.sideBtnCircle}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </View>
            <Text style={styles.sideBtnLabel}>Restart</Text>
          </TouchableOpacity>

          {/* Record button */}
          {!isRecording ? (
            <TouchableOpacity
              style={styles.recordRing}
              onPress={initiateRecording}
              activeOpacity={0.85}
              disabled={countdown > 0}
            >
              <View style={styles.recordFill} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.recordRingActive}
              onPress={stopRecording}
              activeOpacity={0.85}
            >
              <View style={styles.stopSquare} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setIsScrolling(s => !s)}
          >
            <View style={styles.sideBtnCircle}>
              <Ionicons
                name={isScrolling ? 'pause' : 'play'}
                size={20}
                color="#fff"
              />
            </View>
            <Text style={styles.sideBtnLabel}>{isScrolling ? 'Pause' : 'Play'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3-2-1 countdown overlay */}
      {countdown > 0 && (
        <View style={styles.countdownOverlay} pointerEvents="none">
          <Text style={styles.countdownNum}>{countdown}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.28)' },

  topGradient: { position: 'absolute', top: 0, left: 0, right: 0 },
  topBar: {
    position: 'absolute', left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  topBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center',
  },
  recBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20,
  },
  recDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  recTimer: { fontSize: 14, fontWeight: '700', color: '#fff' },
  scriptTypePill: {
    backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
  },
  scriptTypePillText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.2 },

  teleScroll: { position: 'absolute', top: 0, left: 0, right: 0 },
  teleContent: {
    paddingTop: SCREEN_H * 0.32,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
  },
  teleText: {
    fontSize: 27, fontWeight: '700', color: '#fff', lineHeight: 44, textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 6,
  },
  bottomFade: { position: 'absolute', left: 0, right: 0 },

  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(8,8,10,0.88)',
    paddingTop: 16, paddingHorizontal: spacing.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.07)',
  },
  speedRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 12, marginBottom: 16,
  },
  speedLabel: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.4 },
  speedBtns: { flexDirection: 'row', gap: 6 },
  speedBtn: {
    paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  speedBtnActive: { backgroundColor: TEAL + '28', borderColor: TEAL },
  speedBtnText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.45)' },
  speedBtnTextActive: { color: TEAL },

  actionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 44,
  },
  sideBtn: { alignItems: 'center', gap: 5, width: 52 },
  sideBtnCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center',
  },
  sideBtnLabel: { fontSize: 11, color: 'rgba(255,255,255,0.55)', fontWeight: '500' },

  // Record button — idle: white ring, red fill
  recordRing: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  recordFill: { width: 62, height: 62, borderRadius: 31, backgroundColor: '#ef4444' },
  // Record button — recording: red ring, white square
  recordRingActive: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: '#ef4444',
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.12)',
  },
  stopSquare: { width: 28, height: 28, borderRadius: 7, backgroundColor: '#ef4444' },

  // Countdown overlay
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject, zIndex: 50,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  countdownNum: {
    fontSize: 140, fontWeight: '900', color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 24,
  },

  // Review screen
  reviewIcon: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: TEAL + '22', borderWidth: 1, borderColor: TEAL + '55',
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  reviewTitle: { fontSize: 24, fontWeight: '800', color: colors.white, marginBottom: spacing.xs },
  reviewSub: { fontSize: 15, color: colors.muted, marginBottom: spacing.xl },
  reviewActions: { flexDirection: 'row', gap: spacing.sm },
  retakeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  retakeBtnText: { fontSize: 15, fontWeight: '600', color: colors.white },
  keepBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: TEAL, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  keepBtnText: { fontSize: 15, fontWeight: '700', color: '#0B0B0D' },
  // Success screen
  successCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: TEAL, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  successTitle: { fontSize: 24, fontWeight: '800', color: colors.white, marginBottom: spacing.xs },
  successSub: { fontSize: 15, color: colors.muted, marginBottom: spacing.xl },
  successActions: { flexDirection: 'row', gap: spacing.sm },
  successCopyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: TEAL, borderRadius: radius.xl, paddingHorizontal: spacing.lg, paddingVertical: 14,
  },
  successCopyText: { fontSize: 15, fontWeight: '700', color: '#0B0B0D' },
  successDoneBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingVertical: 14,
  },
  successDoneText: { fontSize: 15, fontWeight: '600', color: colors.white },
});
