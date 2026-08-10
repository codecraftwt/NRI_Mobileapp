import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography } from '../../theme/typography';
import { useVendorProfile } from '../../Hooks/Vendor/useVendorProfile';

// yyyy-mm-dd → Date (local); Date → yyyy-mm-dd (API) / dd-mm-yyyy (display).
const parseApiDate = (s) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s || '');
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};
const toApiDate = (d) =>
  d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null;
const toDisplay = (d) =>
  d ? `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}` : '';

function Availability({ navigation }) {
  const { profile, loading, actionLoading, updateAvailability } = useVendorProfile();
  const { showAlert, alertProps } = useAppAlert();

  const [availableForJobs, setAvailableForJobs] = useState(true);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [reason, setReason] = useState('');
  const [picker, setPicker] = useState(null); // 'from' | 'to' | null

  useEffect(() => {
    if (profile?.availability) {
      setAvailableForJobs(profile.availability.isAvailable !== false);
      setFromDate(parseApiDate(profile.availability.unavailableFrom));
      setToDate(parseApiDate(profile.availability.unavailableTo));
      setReason(profile.availability.reason || '');
    }
  }, [profile]);

  const onDateChange = (event, selected) => {
    const field = picker;
    setPicker(null);
    if (event.type === 'dismissed' || !selected) return;
    if (field === 'from') setFromDate(selected);
    else if (field === 'to') setToDate(selected);
  };

  const handleMarkAvailable = async () => {
    try {
      await updateAvailability({ isAvailable: true }).unwrap();
      setAvailableForJobs(true);
      setFromDate(null); setToDate(null); setReason('');
      showAlert('Availability Updated', 'You are now available for jobs.');
    } catch (e) {
      showAlert('Update Failed', e?.message || 'Could not update availability.');
    }
  };

  const handleMarkUnavailable = async () => {
    if (!fromDate || !toDate) {
      showAlert('Select Dates', 'Please choose both From and To dates.');
      return;
    }
    if (!reason.trim()) {
      showAlert('Required Field', 'Please enter a reason.');
      return;
    }
    try {
      await updateAvailability({
        isAvailable: false,
        unavailableFrom: toApiDate(fromDate),
        unavailableTo: toApiDate(toDate),
        reason: reason.trim(),
      }).unwrap();
      setAvailableForJobs(false);
      showAlert('Marked Unavailable', `You are unavailable from ${toDisplay(fromDate)} to ${toDisplay(toDate)}.`);
    } catch (e) {
      showAlert('Update Failed', e?.message || 'Could not update availability.');
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Availability" showBack />
        <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Availability" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Availability</Text>

          <View style={[styles.statusPill, availableForJobs ? styles.statusPillOn : styles.statusPillOff]}>
            <Text style={[styles.statusPillText, availableForJobs ? styles.statusPillTextOn : styles.statusPillTextOff]}>
              {availableForJobs ? 'Available for jobs' : 'Currently unavailable'}
            </Text>
          </View>

          <View style={styles.dateRow}>
            <View style={styles.dateCol}>
              <Text style={styles.fieldLabel}>From</Text>
              <TouchableOpacity style={styles.inputWrap} onPress={() => setPicker('from')} activeOpacity={0.7}>
                <Text style={[styles.dateText, !fromDate && styles.datePlaceholder]}>{toDisplay(fromDate) || 'dd-mm-yyyy'}</Text>
                <Icon name="calendar-today" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <View style={styles.dateCol}>
              <Text style={styles.fieldLabel}>To</Text>
              <TouchableOpacity style={styles.inputWrap} onPress={() => setPicker('to')} activeOpacity={0.7}>
                <Text style={[styles.dateText, !toDate && styles.datePlaceholder]}>{toDisplay(toDate) || 'dd-mm-yyyy'}</Text>
                <Icon name="calendar-today" size={16} color="#94A3B8" />
              </TouchableOpacity>
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

          {availableForJobs ? (
            <TouchableOpacity style={[styles.unavailBtn, actionLoading && styles.btnDisabled]} onPress={handleMarkUnavailable} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator size="small" color="#DC2626" /> : <Text style={styles.unavailBtnText}>Mark as Unavailable</Text>}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.availBtn, actionLoading && styles.btnDisabled]} onPress={handleMarkAvailable} disabled={actionLoading}>
              {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.availBtnText}>Mark as Available</Text>}
            </TouchableOpacity>
          )}

          {picker && (
            <DateTimePicker
              value={(picker === 'from' ? fromDate : toDate) || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={picker === 'to' && fromDate ? fromDate : undefined}
              onChange={onDateChange}
            />
          )}
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
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

  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  statusPill: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8 },
  statusPillOn: { backgroundColor: '#DCFCE7' },
  statusPillOff: { backgroundColor: '#FEF3C7' },
  statusPillText: { fontSize: 14, fontWeight: '700' },
  statusPillTextOn: { color: '#16A34A' },
  statusPillTextOff: { color: '#D97706' },

  dateRow: { flexDirection: 'row', gap: 12 },
  dateCol: { flex: 1, gap: 6 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: '#334155' },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8,
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 13, backgroundColor: '#F8FAFC',
  },
  dateText: { flex: 1, fontSize: 14, color: '#0F172A' },
  datePlaceholder: { color: '#94A3B8' },
  textArea: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
    backgroundColor: '#F8FAFC', textAlignVertical: 'top', minHeight: 56, lineHeight: 20,
  },

  btnDisabled: { opacity: 0.6 },
  unavailBtn: {
    borderWidth: 1.5, borderColor: '#FCA5A5', backgroundColor: '#FFFFFF', borderRadius: 14,
    paddingVertical: 14, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  unavailBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },
  availBtn: {
    backgroundColor: '#16A34A', borderRadius: 14,
    paddingVertical: 14, justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  availBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
});

export default Availability;
