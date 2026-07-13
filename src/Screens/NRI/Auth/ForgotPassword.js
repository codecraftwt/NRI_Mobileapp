import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword } from '../../../Redux/slices/userSlice';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ForgotPassword({ navigation }) {
  const dispatch = useDispatch();
  const forgotPasswordStatus = useSelector(state => state.user.forgotPasswordStatus);
  const submitting = forgotPasswordStatus === 'loading';

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSendResetLink = () => {
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');

    dispatch(forgotPassword({ email: email.trim() }))
      .unwrap()
      .then(() => {
        setSent(true);
      })
      .catch((err) => {
        const message = err?.errors?.email?.[0] || err?.message || 'Something went wrong. Please try again.';
        setError(err?.errors?.email ? message : '');
        Alert.alert('Could Not Send Reset Link', message);
      });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Icon name="radio-button-checked" size={24} color="#007AFF" />
          <Text style={styles.brandText}>NRI Circle</Text>
        </View>

        {sent ? (
          <>
            <View style={styles.checkCircle}>
              <Icon name="mark-email-read" size={32} color="#10B981" />
            </View>
            <Text style={styles.title}>Check your email</Text>
            <Text style={styles.subtitle}>
              We've sent a password reset link to <Text style={styles.bold}>{email.trim()}</Text>. Click the link in the email to reset your password.
            </Text>

            <TouchableOpacity style={styles.ctaBtn} onPress={handleSendResetLink} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Resend Email</Text>
                  <Icon name="send" size={16} color="white" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')}>
              <Text style={styles.signInText}>Back to <Text style={styles.signInLink}>Sign in</Text></Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.title}>Forgot your password?</Text>
            <Text style={styles.subtitle}>Enter your email and we'll send you a link to reset it.</Text>

            <Text style={styles.inputLabel}>Email Address</Text>
            <View style={[styles.inputWrap, !!error && styles.inputWrapError]}>
              <Icon name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="you@example.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(v) => { setEmail(v); if (error) setError(''); }}
              />
            </View>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <TouchableOpacity style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]} onPress={handleSendResetLink} disabled={submitting}>
              {submitting ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <>
                  <Text style={styles.ctaText}>Send Reset Link</Text>
                  <Icon name="send" size={16} color="white" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')} disabled={submitting}>
              <Text style={styles.signInText}>Remembered your password? <Text style={styles.signInLink}>Sign in</Text></Text>
            </TouchableOpacity>
          </>
        )}

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
  checkCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#E6F7EF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 19, marginBottom: 28 },
  bold: { fontWeight: '700', color: '#1E293B' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 48 },
  inputWrapError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  inputIcon: { marginRight: 0 },
  input: { flex: 1, fontSize: 14, color: '#1E293B', height: '100%' },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: 5 },
  ctaBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 26, shadowColor: '#FF7C1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 3 },
  ctaBtnDisabled: { opacity: 0.7 },
  ctaText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  signInRow: { alignItems: 'center', marginTop: 20 },
  signInText: { fontSize: 13, color: '#64748B' },
  signInLink: { color: '#007AFF', fontWeight: '700' },
  footer: { fontSize: 11, color: '#CBD5E1', textAlign: 'center', marginTop: 24 },
});

export default ForgotPassword;
