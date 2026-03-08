import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useSignIn, useSignUp } from '@clerk/clerk-expo';
import { colors, spacing, radius } from '@/lib/theme';

type Mode = 'sign-in' | 'sign-up' | 'verify';

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
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Logo */}
        <View style={styles.logoRow}>
          <View style={styles.logoBox}>
            <Text style={styles.logoText}>CS</Text>
          </View>
          <Text style={styles.brand}>ClipScript</Text>
        </View>

        <Text style={styles.title}>
          {mode === 'sign-in' ? 'Welcome back' : mode === 'sign-up' ? 'Create account' : 'Check your email'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'verify'
            ? `Enter the code we sent to ${email}`
            : 'Scripts, teleprompter, and filming — all in one place.'}
        </Text>

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
              style={styles.btn}
              onPress={mode === 'sign-in' ? handleSignIn : handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.btnText}>{mode === 'sign-in' ? 'Sign In' : 'Create Account'}</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.switchBtn}
              onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
            >
              <Text style={styles.switchText}>
                {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
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
            <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.btnText}>Verify Email</Text>
              )}
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
  scroll: { flexGrow: 1, justifyContent: 'center', padding: spacing.lg },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  logoBox: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center',
  },
  logoText: { fontSize: 16, fontWeight: '800', color: colors.background },
  brand: { fontSize: 22, fontWeight: '800', color: colors.white },
  title: { fontSize: 28, fontWeight: '800', color: colors.white, marginBottom: spacing.sm },
  subtitle: { fontSize: 15, color: colors.neutral, marginBottom: spacing.xl, lineHeight: 22 },
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
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  btnText: { fontSize: 16, fontWeight: '700', color: colors.background },
  switchBtn: { marginTop: spacing.lg, alignItems: 'center' },
  switchText: { fontSize: 14, color: colors.neutral },
});
