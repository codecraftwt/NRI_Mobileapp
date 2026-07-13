import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../../../Redux/slices/userSlice';
import { store } from '../../../Redux/store';

function Login({ navigation }) {
  const dispatch = useDispatch();
  const loginStatus = useSelector(state => state.user.loginStatus);
  const submitting = loginStatus === 'loading';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearError = (field) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const errorFor = (field) => {
    const value = fieldErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const handleSignIn = () => {
    const errors = {};
    if (!email.trim()) errors.login = 'Email is required.';
    if (!password) errors.password = 'Password is required.';
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    dispatch(loginUser({ login: email.trim(), password }))
      .unwrap()
      .then(() => {
        // Read the resolved state, not the thunk's raw payload — the slice's
        // reducer preserves/derives the correct `onboarded` flag, and that
        // only reflects in the store once the reducer has actually run.
        const onboarded = store.getState().user.user?.onboarded;
        navigation.replace(onboarded ? 'AppHome' : 'OnboardingProfile');
      })
      .catch((error) => {
        if (error?.errors) {
          setFieldErrors(error.errors);
        }
        Alert.alert('Sign In Failed', error?.message || 'Email or password is incorrect.');
      });
  };

  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Icon name="radio-button-checked" size={24} color="#007AFF" />
          <Text style={styles.brandText}>NRI Circle</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Enter your credentials to access your NRI Circle dashboard.</Text>

        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={[styles.inputWrap, errorFor('login') && styles.inputWrapError]}>
          <Icon name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="name@domain.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('login'); }}
          />
        </View>
        {!!errorFor('login') && <Text style={styles.errorText}>{errorFor('login')}</Text>}

        <Text style={styles.inputLabel}>Password</Text>
        <View style={[styles.inputWrap, errorFor('password') && styles.inputWrapError]}>
          <Icon name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showPassword}
            value={password}
            onChangeText={(v) => { setPassword(v); clearError('password'); }}
          />
          <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
            <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        {!!errorFor('password') && <Text style={styles.errorText}>{errorFor('password')}</Text>}

        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.checkboxRow} onPress={() => setKeepSignedIn(v => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, keepSignedIn && styles.checkboxChecked]}>
              {keepSignedIn && <Icon name="check" size={13} color="white" />}
            </View>
            <Text style={styles.checkboxLabel}>Keep me signed in</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleForgotPassword}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]} onPress={handleSignIn} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Text style={styles.ctaText}>Sign In</Text>
              <Icon name="arrow-forward" size={18} color="white" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signUpRow} onPress={() => navigation.navigate('Register')} disabled={submitting}>
          <Text style={styles.signUpText}>New to NRI Circle? <Text style={styles.signUpLink}>Create an account</Text></Text>
        </TouchableOpacity>

        <Text style={styles.footer}>© 2026 NRI Circle. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollContent: { flexGrow: 1, padding: 24, paddingTop: 80, paddingBottom: 40, justifyContent: 'center' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 40 },
  brandText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 19, marginBottom: 28 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputWrapError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon: { marginRight: 0 },
  input: { flex: 1, fontSize: 14, color: '#1E293B', height: '100%' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 5 },
  optionsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18 },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkbox: { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  checkboxLabel: { fontSize: 13, color: '#475569' },
  forgotText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  ctaBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 26, shadowColor: '#FF7C1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  signUpRow: { alignItems: 'center', marginTop: 20 },
  signUpText: { fontSize: 13, color: '#64748B' },
  signUpLink: { color: '#007AFF', fontWeight: '700' },
  footer: { fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 24 },
});

export default Login;
