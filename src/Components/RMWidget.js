import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

function RMWidget({ rm }) {
  if (!rm) return null;
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Your Relationship Manager</Text>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{rm.avatar || 'RM'}</Text>
      </View>
      <Text style={styles.name}>{rm.name}</Text>
      <Text style={styles.email}>{rm.email}</Text>
      {!!rm.phone && (
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${rm.phone}`)}>
          <Icon name="phone" size={15} color="#007AFF" />
          <Text style={styles.callBtnText}>Call {rm.phone}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: 'white', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  title: { fontSize: 16, fontWeight: 'bold', color: '#333', alignSelf: 'flex-start', marginBottom: 16 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: 'white' },
  name: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  email: { fontSize: 12.5, color: '#6B7280', marginTop: 2 },
  callBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#007AFF', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7, marginTop: 14 },
  callBtnText: { fontSize: 12.5, color: '#007AFF', fontWeight: '600' },
});

export default RMWidget;
