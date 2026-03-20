import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const TEAL = '#03EDD6';
const RED  = '#FD1741';

type Mode = 'sign-in' | 'sign-up' | 'verify' | 'forgot' | 'reset';

export default function SignIn() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Try sign-in first (existing user)
      try {
        const result = await signIn!.create({
          strategy: 'oauth_token',
          provider: 'apple',
          token: credential.identityToken!,
        });
        if (result.status === 'complete') {
          await setSignInActive!({ session: result.createdSessionId });
        }
      } catch (signInErr: any) {
        // New user — create account
        if (signInErr?.errors?.[0]?.code === 'form_identifier_not_found') {
          await signUp!.create({
            strategy: 'oauth_token',
            provider: 'apple',
            token: credential.identityToken!,
            ...(credential.email && { emailAddress: credential.email }),
            ...(credential.fullName?.givenName && { firstName: credential.fullName.givenName }),
            ...(credential.fullName?.familyName && { lastName: credential.fullName.familyName }),
          });
          await setSignUpActive!({ session: signUp!.createdSessionId });
        } else {
          throw signInErr;
        }
      }
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        Alert.alert('Apple Sign In failed', e?.errors?.[0]?.message ?? e.message ?? 'Something went wrong.');
      }
    } finally {
      setLoading(false);
    }
  };

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

  const handleForgot = async () => {
    if (!signInLoaded) return;
    setLoading(true);
    try {
      await signIn!.create({ strategy: 'reset_password_email_code', identifier: email.trim() });
      setCode('');
      setNewPassword('');
      setMode('reset');
    } catch (e: any) {
      Alert.alert('Error', e?.errors?.[0]?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!signInLoaded) return;
    setLoading(true);
    try {
      const result = await signIn!.attemptFirstFactor({
        strategy: 'reset_password_email_code',
        code: code.trim(),
        password: newPassword,
      });
      if (result.status === 'complete') {
        await setSignInActive!({ session: result.createdSessionId });
      }
    } catch (e: any) {
      Alert.alert('Reset failed', e?.errors?.[0]?.message ?? e.message);
    } finally {
      setLoading(false);
    }
  };

  const subtitleMap: Record<Mode, string> = {
    'sign-in': 'Welcome back. Your scripts are waiting.',
    'sign-up': 'Create your account to start scripting.',
    'verify': `Enter the code we sent to ${email}`,
    'forgot': 'Enter your email and we\'ll send a reset code.',
    'reset': `Enter the code we sent to ${email} and your new password.`,
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GlowOrbs />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Logo row — JSX mark + wordmark text */}
        <View style={styles.logoRow}>
          <View style={styles.logoMark}>
            <Text style={styles.logoPlay}>▶</Text>
            <View style={styles.logoLines}>
              {[1, 0.7, 0.5].map((o, i) => (
                <View key={i} style={[styles.logoLine, { opacity: o }]} />
              ))}
            </View>
          </View>
          <Text style={styles.logoText}>
            <Text style={{ color: TEAL }}>Clip</Text>
            <Text style={{ color: colors.white }}>Script</Text>
          </Text>
        </View>

        {/* Kicker pill */}
        <View style={styles.kickerPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.kickerText}>AI-POWERED SCRIPTS</Text>
        </View>

        {/* Hero */}
        <Text style={styles.heroPre}>Write it.</Text>
        <View style={styles.heroFilmRow}>
          <Text style={[styles.heroFilm, { color: TEAL }]}>Fi</Text>
          <Text style={[styles.heroFilm, { color: '#7DEBB8' }]}>lm</Text>
          <Text style={[styles.heroFilm, { color: '#C04E7C' }]}> it</Text>
          <Text style={[styles.heroFilm, { color: RED }]}>.</Text>
        </View>
        <Text style={styles.heroPre}>Post it.</Text>

        <Text style={styles.subtitle}>{subtitleMap[mode]}</Text>

        {/* Divider */}
        <LinearGradient
          colors={[TEAL, RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.divider}
        />

        {/* ── Sign-in / Sign-up ── */}
        {(mode === 'sign-in' || mode === 'sign-up') && (
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

            {mode === 'sign-in' && (
              <TouchableOpacity
                style={styles.forgotBtn}
                onPress={() => { setCode(''); setNewPassword(''); setMode('forgot'); }}
              >
                <Text style={styles.forgotText}>Forgot password?</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={mode === 'sign-in' ? handleSignIn : handleSignUp}
              disabled={loading}
              style={styles.btnWrapper}
            >
              <LinearGradient
                colors={[TEAL, RED]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading
                  ? <ActivityIndicator color="#0B0B0D" />
                  : <Text style={styles.btnText}>{mode === 'sign-in' ? 'Sign In' : 'Create Account'}</Text>
                }
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

            {Platform.OS === 'ios' && (
              <>
                <View style={styles.orRow}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>or</Text>
                  <View style={styles.orLine} />
                </View>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={radius.md}
                  style={styles.appleBtn}
                  onPress={handleAppleSignIn}
                />
              </>
            )}
          </>
        )}

        {/* ── Verify email (sign-up) ── */}
        {mode === 'verify' && (
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
                colors={[TEAL, RED]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading
                  ? <ActivityIndicator color="#0B0B0D" />
                  : <Text style={styles.btnText}>Verify Email</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('sign-up')}>
              <Text style={styles.switchText}>Go back</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Forgot password — enter email ── */}
        {mode === 'forgot' && (
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
            <TouchableOpacity onPress={handleForgot} disabled={loading} style={styles.btnWrapper}>
              <LinearGradient
                colors={[TEAL, RED]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading
                  ? <ActivityIndicator color="#0B0B0D" />
                  : <Text style={styles.btnText}>Send Reset Code</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('sign-in')}>
              <Text style={styles.switchText}>Back to sign in</Text>
            </TouchableOpacity>
          </>
        )}

        {/* ── Reset password — enter code + new password ── */}
        {mode === 'reset' && (
          <>
            <TextInput
              style={styles.input}
              placeholder="6-digit reset code"
              placeholderTextColor={colors.muted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
            />
            <TextInput
              style={styles.input}
              placeholder="New password"
              placeholderTextColor={colors.muted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoComplete="new-password"
            />
            <TouchableOpacity onPress={handleReset} disabled={loading} style={styles.btnWrapper}>
              <LinearGradient
                colors={[TEAL, RED]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.btn}
              >
                {loading
                  ? <ActivityIndicator color="#0B0B0D" />
                  : <Text style={styles.btnText}>Set New Password</Text>
                }
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={styles.switchBtn} onPress={() => setMode('forgot')}>
              <Text style={styles.switchText}>Resend code</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  logoMark: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: TEAL + '18', borderRadius: 14, padding: 10,
    borderWidth: 1, borderColor: TEAL + '44',
  },
  logoPlay: { fontSize: 16, color: TEAL },
  logoLines: { gap: 4 },
  logoLine: { height: 2, width: 18, backgroundColor: TEAL, borderRadius: 2 },
  logoText: { fontSize: 22, fontWeight: '800' },
  kickerPill: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: TEAL + '66',
    borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6,
    marginBottom: spacing.lg,
  },
  pulseDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: TEAL },
  kickerText: { fontSize: 10, fontWeight: '700', letterSpacing: 1.5, color: TEAL, textTransform: 'uppercase' },
  heroPre: { fontSize: 44, fontWeight: '800', color: colors.white, lineHeight: 54, textAlign: 'center' },
  heroFilmRow: { flexDirection: 'row', justifyContent: 'center', lineHeight: 54 },
  heroFilm: { fontSize: 44, fontWeight: '800', lineHeight: 54 },
  subtitle: { fontSize: 15, color: colors.neutral, marginTop: spacing.md, lineHeight: 22, textAlign: 'center' },
  divider: { height: 1, marginVertical: spacing.xl, alignSelf: 'stretch', opacity: 0.4 },
  input: {
    alignSelf: 'stretch',
    backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    fontSize: 15, color: colors.white,
    marginBottom: spacing.md,
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: spacing.sm, marginTop: -spacing.sm },
  forgotText: { fontSize: 13, color: colors.muted },
  btnWrapper: { alignSelf: 'stretch', marginTop: spacing.sm, borderRadius: radius.md, overflow: 'hidden' },
  btn: { borderRadius: radius.md, paddingVertical: 16, alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '800', color: '#0B0B0D' },
  switchBtn: { marginTop: spacing.lg, alignItems: 'center' },
  switchText: { fontSize: 14, color: colors.neutral },
  switchAccent: { color: TEAL, fontWeight: '700' },
  orRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: spacing.xl, gap: spacing.sm },
  orLine: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  appleBtn: { alignSelf: 'stretch', height: 50, marginTop: spacing.md },
});
