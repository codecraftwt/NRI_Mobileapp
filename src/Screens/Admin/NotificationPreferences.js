import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, View, Switch, TouchableOpacity, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { getNotificationPreferences, updateNotificationPreferences } from '../../Api/notificationApi';

const ADMIN_BASE = '/super-admin';

const CHANNELS = [
  { id: 'app', label: 'App', hint: 'In-app notifications', icon: 'notifications-none', color: '#3B82F6' },
  { id: 'whatsapp', label: 'WhatsApp', hint: 'Alerts via WhatsApp', icon: 'chat', color: '#059669' },
  { id: 'email', label: 'Email', hint: 'Alerts via email', icon: 'mail-outline', color: '#F59E0B' },
  { id: 'sms', label: 'SMS', hint: 'Alerts via text message', icon: 'sms', color: '#8B5CF6' },
];

function NotificationPreferences({ navigation }) {
  const [prefs, setPrefs] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    setFailed(false);
    getNotificationPreferences(ADMIN_BASE)
      .then(setPrefs)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const toggle = (id) => {
    if (!prefs) return;
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next); // optimistic
    setSavingId(id);
    updateNotificationPreferences(next, ADMIN_BASE)
      .then(setPrefs)
      .catch(() => setPrefs(prefs)) // revert on failure
      .finally(() => setSavingId(null));
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={{ marginLeft: 4 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Preferences</Text>
        <View style={{ width: 44 }} />
      </View>

      {loading ? (
        <View style={styles.stateBox}><ActivityIndicator size="large" color="#20304C" /></View>
      ) : failed ? (
        <TouchableOpacity style={styles.stateBox} onPress={load} activeOpacity={0.7}>
          <Icon name="refresh" size={36} color="#DC2626" />
          <Text style={styles.stateText}>Couldn't load preferences. Tap to retry.</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.listCard}>
          {CHANNELS.map((ch, idx) => (
            <View key={ch.id} style={[styles.row, idx < CHANNELS.length - 1 && styles.rowBorder]}>
              <View style={[styles.iconBg, { backgroundColor: ch.color + '18' }]}>
                <Icon name={ch.icon} size={20} color={ch.color} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>{ch.label}</Text>
                <Text style={styles.rowHint}>{ch.hint}</Text>
              </View>
              {savingId === ch.id ? (
                <ActivityIndicator size="small" color="#20304C" />
              ) : (
                <Switch
                  value={!!prefs?.[ch.id]}
                  onValueChange={() => toggle(ch.id)}
                  trackColor={{ false: '#E2E8F0', true: '#A64416' }}
                  thumbColor="#FFFFFF"
                />
              )}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 58, paddingBottom: 20, backgroundColor: '#20304C',
  },
  backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },

  stateBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 80 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 30, lineHeight: 20 },

  listCard: {
    margin: 20, backgroundColor: '#FFFFFF', borderRadius: 20, paddingHorizontal: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  iconBg: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  rowHint: { fontSize: 12, color: '#64748B', marginTop: 2 },
});

export default NotificationPreferences;
