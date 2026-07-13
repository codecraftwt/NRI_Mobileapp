import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../../../Redux/slices/userSlice';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Register({ navigation }) {
  const dispatch = useDispatch();
  const registerStatus = useSelector(state => state.user.registerStatus);
  const submitting = registerStatus === 'loading';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const clearError = (field) => {
    if (fieldErrors[field]) setFieldErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const errorFor = (field) => {
    const value = fieldErrors[field];
    if (!value) return null;
    return Array.isArray(value) ? value[0] : value;
  };

  const validate = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email address is required.';
    else if (!EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
    if (!phone.trim()) errors.phone = 'Phone number is required.';
    else if (phone.trim().replace(/\D/g, '').length < 7) errors.phone = 'Enter a valid phone number.';
    if (!password) errors.password = 'Password is required.';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
    if (!confirmPassword) errors.password_confirmation = 'Please confirm your password.';
    else if (password !== confirmPassword) errors.password_confirmation = 'Passwords do not match.';
    return errors;
  };

  const handleCreateAccount = () => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    dispatch(registerUser({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
      passwordConfirmation: confirmPassword,
      referralCode: referralCode.trim() || undefined,
      // affiliate_code isn't collected in this form — it's expected to come from
      // marketing-link attribution (deep link / UTM), not manual entry.
      affiliateCode: undefined,
    }))
      .unwrap()
      .then(() => {
        navigation.replace('OnboardingProfile');
      })
      .catch((error) => {
        if (error?.errors) {
          setFieldErrors(error.errors);
          Alert.alert('Check your details', error.message || 'Some information you entered is invalid.');
        } else {
          Alert.alert('Registration Failed', error?.message || 'Something went wrong. Please try again.');
        }
      });
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.brandRow}>
          <Icon name="radio-button-checked" size={24} color="#007AFF" />
          <Text style={styles.brandText}>NRI Circle</Text>
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Join NRI Circle to start managing everything back home with ease.</Text>

        <Text style={styles.inputLabel}>Full Name</Text>
        <View style={[styles.inputWrap, errorFor('name') && styles.inputWrapError]}>
          <Icon name="person-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Your full name"
            placeholderTextColor="#94A3B8"
            value={name}
            onChangeText={(v) => { setName(v); clearError('name'); }}
          />
        </View>
        {!!errorFor('name') && <Text style={styles.errorText}>{errorFor('name')}</Text>}

        <Text style={styles.inputLabel}>Email Address</Text>
        <View style={[styles.inputWrap, errorFor('email') && styles.inputWrapError]}>
          <Icon name="mail-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="name@domain.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(v) => { setEmail(v); clearError('email'); }}
          />
        </View>
        {!!errorFor('email') && <Text style={styles.errorText}>{errorFor('email')}</Text>}

        <Text style={styles.inputLabel}>Phone Number</Text>
        <View style={[styles.inputWrap, errorFor('phone') && styles.inputWrapError]}>
          <Icon name="phone-iphone" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="+1 555 000 0000"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={(v) => { setPhone(v); clearError('phone'); }}
          />
        </View>
        {!!errorFor('phone') && <Text style={styles.errorText}>{errorFor('phone')}</Text>}

        <Text style={styles.inputLabel}>Password</Text>
        <View style={[styles.inputWrap, errorFor('password') && styles.inputWrapError]}>
          <Icon name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Minimum 8 characters"
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

        <Text style={styles.inputLabel}>Confirm Password</Text>
        <View style={[styles.inputWrap, errorFor('password_confirmation') && styles.inputWrapError]}>
          <Icon name="lock-outline" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor="#94A3B8"
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={(v) => { setConfirmPassword(v); clearError('password_confirmation'); }}
          />
          <TouchableOpacity onPress={() => setShowConfirm(v => !v)}>
            <Icon name={showConfirm ? 'visibility-off' : 'visibility'} size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>
        {!!errorFor('password_confirmation') && <Text style={styles.errorText}>{errorFor('password_confirmation')}</Text>}

        <Text style={styles.inputLabel}>Referral Code <Text style={styles.optional}>(optional)</Text></Text>
        <View style={[styles.inputWrap, errorFor('referral_code') && styles.inputWrapError]}>
          <Icon name="card-giftcard" size={18} color="#94A3B8" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Have a friend's code? Enter it here"
            placeholderTextColor="#94A3B8"
            autoCapitalize="characters"
            value={referralCode}
            onChangeText={(v) => { setReferralCode(v); clearError('referral_code'); }}
          />
        </View>
        {!!errorFor('referral_code') && <Text style={styles.errorText}>{errorFor('referral_code')}</Text>}

        <TouchableOpacity style={[styles.ctaBtn, submitting && styles.ctaBtnDisabled]} onPress={handleCreateAccount} disabled={submitting}>
          {submitting ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Text style={styles.ctaText}>Create Account</Text>
              <Icon name="arrow-forward" size={18} color="white" />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.signInRow} onPress={() => navigation.navigate('Login')} disabled={submitting}>
          <Text style={styles.signInText}>Already have an account? <Text style={styles.signInLink}>Sign in</Text></Text>
        </TouchableOpacity>

        <Text style={styles.footer}>© 2026 NRI Circle. All rights reserved.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  scrollContent: { padding: 24, paddingTop: 56, paddingBottom: 40 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 28 },
  brandText: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 19, marginBottom: 24 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 14 },
  optional: { fontSize: 12, color: '#94A3B8', fontWeight: '400' },
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

export default Register;
