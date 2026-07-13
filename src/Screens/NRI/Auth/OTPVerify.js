import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useDispatch } from 'react-redux';
import { login } from '../../../Redux/slices/userSlice';

function OTPVerify({ route, navigation }) {
  const { phone } = route.params || { phone: '+1 555 123 4567' };
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(59);
  const dispatch = useDispatch();

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleVerify = () => {
    if (code.length < 4) {
      Alert.alert('Verification Failed', 'Please enter the 6-digit OTP code.');
      return;
    }

    // Set default user details and login session
    dispatch(login({
      user: {
        id: 1,
        name: 'John Doe',
        email: 'john@example.com',
        phone: phone,
        membership: 'None', // Starts with no plan to let them select
        language: 'English',
        onboarded: false,
        rm: null,
      },
      token: 'fake-jwt-token-998877',
    }));

    // Proceed to Membership Plan selector screen
    navigation.navigate('Plans');
  };

  const handleResend = () => {
    setTimer(59);
    Alert.alert('OTP Resent', 'A new OTP verification code has been sent to your mobile.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.title}>Verify phone</Text>
        <Text style={styles.subtitle}>We sent a verification code to {phone}</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Enter Code</Text>
        <TextInput
          style={styles.otpInput}
          placeholder="Enter 6-digit code"
          placeholderTextColor="#475569"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
          letterSpacing={4}
          textAlign="center"
        />

        <View style={styles.timerRow}>
          {timer > 0 ? (
            <Text style={styles.timerText}>Resend code in {timer}s</Text>
          ) : (
            <TouchableOpacity onPress={handleResend}>
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={[styles.btn, code.length < 4 && styles.btnDisabled]}
          onPress={handleVerify}
        >
          <Text style={styles.btnText}>Verify & Continue</Text>
          <Icon name="done" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
    padding: 24,
    paddingTop: 60,
  },
  header: {
    marginBottom: 40,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 8,
    marginLeft: -8,
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: 'white',
    fontFamily: 'Outfit',
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    fontFamily: 'Roboto',
  },
  form: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94A3B8',
    marginBottom: 12,
  },
  otpInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    height: 56,
    marginBottom: 20,
  },
  timerRow: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    color: '#64748B',
    fontSize: 14,
  },
  resendText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  btn: {
    flexDirection: 'row',
    backgroundColor: '#007AFF',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  btnDisabled: {
    backgroundColor: '#1E293B',
  },
  btnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default OTPVerify;
