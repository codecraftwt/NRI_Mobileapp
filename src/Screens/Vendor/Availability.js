import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';

function Availability({ navigation }) {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [reason, setReason] = useState('');

  const handleMarkUnavailable = () => {
    if (!fromDate.trim() || !toDate.trim()) {
      Alert.alert('Required Fields', 'Please enter both From and To dates.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required Field', 'Please enter a reason.');
      return;
    }
    Alert.alert('Marked Unavailable', `You are now unavailable from ${fromDate} to ${toDate}.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Availability" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="event-available" size={20} color="#059669" />
            <Text style={styles.sectionTitle}>Available for jobs</Text>
          </View>
          <Text style={styles.sectionDesc}>
            You are currently available. Mark yourself unavailable for a date range below.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="event-busy" size={20} color="#D94625" />
            <Text style={styles.sectionTitle}>Mark as Unavailable</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>From</Text>
            <View style={styles.inputWrap}>
              <Icon name="calendar-today" size={16} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="dd-mm-yyyy"
                placeholderTextColor="#94A3B8"
                value={fromDate}
                onChangeText={setFromDate}
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>To</Text>
            <View style={styles.inputWrap}>
              <Icon name="calendar-today" size={16} color="#94A3B8" />
              <TextInput
                style={styles.input}
                placeholder="dd-mm-yyyy"
                placeholderTextColor="#94A3B8"
                value={toDate}
                onChangeText={setToDate}
                maxLength={10}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Reason (holiday, capacity full…)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="e.g. On holiday, capacity full..."
              placeholderTextColor="#94A3B8"
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleMarkUnavailable}>
            <Icon name="event-busy" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Mark as Unavailable</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, gap: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  sectionDesc: { fontSize: 13, color: '#64748B', lineHeight: 19 },

  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#F8FAFC',
  },
  input: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  textArea: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
    backgroundColor: '#F8FAFC', textAlignVertical: 'top', minHeight: 80, lineHeight: 20,
  },

  submitBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: '#DC2626', borderRadius: 14,
    paddingVertical: 14, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default Availability;
