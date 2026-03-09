import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaskedView from '@react-native-masked-view/masked-view';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { colors, spacing, radius } from '@/lib/theme';

// Gradient: teal → red (matches landing page hero-gradient-text)
const GRAD_START = '#03EDD6'; // hsl(175 97% 55%)
const GRAD_END   = '#FD1741'; // hsl(348 99% 59%)

type Mode = 'sign-in' | 'sign-up' | 'verify';

function GradientText({ text, style }: { text: string; style?: object }) {
  return (
    <MaskedView maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{text}</Text>}>
      <LinearGradient
        colors={[GRAD_START, GRAD_END]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Text style={[style, { opacity: 0 }]}>{text}</Text>
      </LinearGradient>
    </MaskedView>
  );
}

export default function SignIn() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!signInLoaded) return;
    setLoading(true);
    try {
      const result = await signIn!.create({ identifier: email.trim(), password });
      if (result.status === 'complete') {
        await setSignInActive!({ session: result.createdSessionId });
      }
    } catch (e: any) {
      Alert.alert('Sign in failed', e?.errors?.[0]?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    try {
      await signUp!.create({ emailAddress: email.trim(), password });
      await signUp!.prepareEmailAddressVerification({ strategy: 'email_code' });
      setMode('verify');
    } catch (e: any) {
      Alert.alert('Sign up failed', e?.errors?.[0]?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!signUpLoaded) return;
    setLoading(true);
    try {
      const result = await signUp!.attemptEmailAddressVerification({ code: code.trim() });
      if (result.status === 'complete') {
        await setSignUpActive!({ session: result.createdSessionId });
      }
    } catch (e: any) {
      Alert.alert('Verification failed', e?.errors?.[0]?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      {/* Subtle teal glow orb top-right */}
      <View style={styles.orbTeal} />
      {/* Subtle red glow orb bottom-left */}
      <View style={styles.orbRed} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <Image
            source={require('../../assets/icon.png')}
            style={styles.icon}
            resizeMode="contain"
          />
          <Image
            source={require('../../assets/logo.png')}
            style={styles.logoImg}
            resizeMode="contain"
          />
        </View>

        {/* Hero */}
        <Text style={styles.heroPre}>Write it.</Text>
        <GradientText text="Film it." style={styles.heroGradient} />
        <Text style={styles.heroPre}>Post it.</Text>

        <Text style={styles.subtitle}>
          {mode === 'verify'
            ? `Enter the code we sent to ${email}`
            : mode === 'sign-in'
            ? 'Welcome back. Your scripts are waiting.'
            : 'Create your account to start scripting.'}
        </Text>

        {/* Teal divider */}
        <View style={styles.divider} />

        {mode !== 'verify' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
            />
            <TouchableOpacity
              onPress={mode === 'sign-in' ? handleSignIn : handleSignUp}
              disabled={loading}
              style={styles.btnWrapper}
            >
              <LinearGradient
                colors={[GRAD_START, GRAD_END]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color="#0B0B0D" />
                ) : (
                  <Text style={styles.btnText}>{mode === 'sign-in' ? 'Sign In' : 'Create Account'}</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            >
              <Text style={styles.switchText}>
                {mode === 'sign-in' ? "Don't have an account? " : 'Already have an account? '}
                <Text style={styles.switchAccent}>{mode === 'sign-in' ? 'Sign up' : 'Sign in'}</Text>
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              placeholderTextColor={colors.muted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TouchableOpacity onPress={handleVerify} disabled={loading} style={styles.btnWrapper}>
              <LinearGradient
                colors={[GRAD_START, GRAD_END]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color="#0B0B0D" />
                ) : (
                  <Text style={styles.btnText}>Verify Email</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('sign-up')}>
              <Text style={styles.switchText}>
                Go back
              </Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // Ambient glow orbs — larger + higher opacity since RN can't blur like CSS
  orbTeal: {
    position: 'absolute', top: -120, left: -120,
    width: 380, height: 380, borderRadius: 190,
    backgroundColor: '#03EDD6', opacity: 0.14,
  },
  orbRed: {
    position: 'absolute', top: -80, right: -80,
    width: 340, height: 340, borderRadius: 170,
    backgroundColor: '#FD1741', opacity: 0.12,
  },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  icon: { width: 36, height: 36, borderRadius: radius.md },
  logoImg: { height: 26, width: 130 },
  heroPre: { fontSize: 38, fontWeight: '800', color: colors.white, lineHeight: 48 },
  heroGradient: { fontSize: 38, fontWeight: '800', lineHeight: 48 },
  subtitle: { fontSize: 15, color: colors.neutral, marginTop: spacing.md, lineHeight: 22 },
  divider: {
    height: 1, marginVertical: spacing.xl,
    backgroundColor: GRAD_START, opacity: 0.3,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 15,
    color: colors.white,
    marginBottom: spacing.md,
  },
  btnWrapper: { marginTop: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
  btn: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '800', color: '#0B0B0D' },
  switchBtn: { marginTop: spacing.lg, alignItems: 'center' },
  switchText: { fontSize: 14, color: colors.neutral },
  switchAccent: { color: GRAD_START, fontWeight: '700' },
});
