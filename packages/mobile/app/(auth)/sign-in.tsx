import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import * as AppleAuthentication from 'expo-apple-authentication';
import { colors, spacing, radius } from '@/lib/theme';
import { GlowOrbs } from '@/components/GlowOrbs';

const TEAL = '#03EDD6';
const RED  = '#FD1741';

type Mode = 'sign-in' | 'sign-up' | 'verify';

export default function SignIn() {
  const { signIn, setActive: setSignInActive, isLoaded: signInLoaded } = useSignIn();
  const { signUp, setActive: setSignUpActive, isLoaded: signUpLoaded } = useSignUp();

  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <GlowOrbs />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" bounces={false}>
        {/* Logo row — icon.png + logo.png, same as landing page nav */}
        <View style={styles.logoRow}>
          <Image source={require('../../assets/icon.png')} style={styles.icon} resizeMode="contain" />
          <Image source={require('../../assets/logo.png')} style={styles.logoImg} resizeMode="contain" />
        </View>

        {/* Kicker pill */}
        <View style={styles.kickerPill}>
          <View style={styles.pulseDot} />
          <Text style={styles.kickerText}>AI-POWERED SCRIPTS</Text>
        </View>

        {/* Hero — "Film it." uses teal+red split to simulate gradient without MaskedView */}
        <Text style={styles.heroPre}>Write it.</Text>
        <View style={styles.heroFilmRow}>
          <Text style={[styles.heroFilm, { color: TEAL }]}>Fi</Text>
          <Text style={[styles.heroFilm, { color: '#7DEBB8' }]}>lm</Text>
          <Text style={[styles.heroFilm, { color: '#C04E7C' }]}> it</Text>
          <Text style={[styles.heroFilm, { color: RED }]}>.</Text>
        </View>
        <Text style={styles.heroPre}>Post it.</Text>

        <Text style={styles.subtitle}>
          {mode === 'verify'
            ? `Enter the code we sent to ${email}`
            : mode === 'sign-in'
            ? 'Welcome back. Your scripts are waiting.'
            : 'Create your account to start scripting.'}
        </Text>

        {/* Divider with gradient line */}
        <LinearGradient
          colors={[TEAL, RED]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.divider}
        />

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg, alignItems: 'center' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  icon: { width: 36, height: 36, borderRadius: radius.md },
  logoImg: { height: 26, width: 130 },
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
