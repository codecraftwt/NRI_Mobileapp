import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { logoutUser } from '../Redux/slices/userSlice';
import { lightColors as baseColors } from '../theme/colors';

const colors = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};

function OnboardingTopBar({ navigation, onBack }) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Icon name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
      ) : (
        <View style={styles.brandRow}>
          <Icon name="public" size={24} color={colors.primary} />
          <Text style={styles.brandText}>NRI <Text style={{ color: colors.primary }}>Circle</Text></Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: 'transparent' },
  brandRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  brandText: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', letterSpacing: -0.5 },
  backBtn: { padding: 4, position: 'absolute', left: 16, top: 50, zIndex: 10 },
});

export default OnboardingTopBar;
