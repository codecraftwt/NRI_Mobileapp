import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';

// Services and their rates are set by admin and read-only for the vendor —
// changes can only be requested, not edited directly.
const SERVICES_OFFERED = [
  { key: 'home-visit', name: 'Scheduled home visits', price: '₹1,500' },
  { key: 'doctor-appt', name: 'Doctor appointment booking', price: '₹1,500' },
];

function ServiceOffered({ navigation }) {
  const handleSendRateRequest = () =>
    Alert.alert('Request Sent', 'Your rate-change request has been sent to the admin.');

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Services Offered" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Services offered</Text>
            <Icon name="lock" size={16} color="#94A3B8" />
          </View>

          {SERVICES_OFFERED.map((s, i) => (
            <View key={s.key} style={[styles.serviceRow, i < SERVICES_OFFERED.length - 1 && styles.serviceRowBorder]}>
              <Text style={styles.serviceName}>{s.name}</Text>
              <Text style={styles.servicePrice}>{s.price}</Text>
            </View>
          ))}

          <Text style={styles.note}>Rate-change requests are disabled. Contact your admin.</Text>

          <TouchableOpacity style={styles.adminBtn} onPress={handleSendRateRequest} activeOpacity={0.85}>
            <Text style={styles.adminBtnText}>Send request to admin</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  serviceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  serviceRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  serviceName: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', flex: 1, paddingRight: 12 },
  servicePrice: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  note: { fontSize: 12, color: '#94A3B8', marginTop: 12 },

  adminBtn: { backgroundColor: '#1E293B', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  adminBtnText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
});

export default ServiceOffered;
