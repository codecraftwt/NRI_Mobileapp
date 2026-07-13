import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { logoutUser } from '../Redux/slices/userSlice';

function OnboardingTopBar({ navigation, onBack }) {
  const dispatch = useDispatch();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout and discard signup progress?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logoutUser());
          let root = navigation;
          while (root.getParent()) root = root.getParent();
          root.reset({ index: 0, routes: [{ name: 'Login' }] });
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {onBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Icon name="arrow-back" size={20} color="#1E293B" />
        </TouchableOpacity>
      ) : (
        <View style={styles.brandRow}>
          <Icon name="radio-button-checked" size={20} color="#007AFF" />
          <Text style={styles.brandText}>NRI Circle</Text>
        </View>
      )}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 50, paddingBottom: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandText: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  backBtn: { padding: 4 },
  logoutBtn: { borderWidth: 1, borderColor: '#007AFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  logoutText: { fontSize: 12, color: '#007AFF', fontWeight: '700' },
});

export default OnboardingTopBar;
