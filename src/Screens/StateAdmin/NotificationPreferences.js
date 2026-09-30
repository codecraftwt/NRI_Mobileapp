import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT, lightColors as baseColors } from '../../theme';
import {
  getStateAdminNotificationPreferences,
  updateStateAdminNotificationPreferences,
} from '../../Api/StateAdmin/stateAdminNotificationsApi';

const C = {
  ...baseColors,
  primary: '#20304C',
  accent: '#A64416',
};

const CHANNELS = [
  {
    key: 'app',
    title: 'In-App Notifications',
    description: 'Receive real-time alerts, SLA reminders, and assignment updates directly in the app.',
    icon: 'notifications-active',
    color: '#3B82F6',
    bgColor: '#EFF6FF',
  },
  {
    key: 'whatsapp',
    title: 'WhatsApp Alerts',
    description: 'Get urgent customer escalation notices and high-priority ticket alerts on WhatsApp.',
    icon: 'chat',
    color: '#10B981',
    bgColor: '#ECFDF5',
  },
  {
    key: 'email',
    title: 'Email Digest & Reports',
    description: 'Receive monthly revenue summaries, SLA compliance reports, and audit logs by email.',
    icon: 'email',
    color: '#8B5CF6',
    bgColor: '#F3E8FF',
  },
  {
    key: 'sms',
    title: 'SMS Messages',
    description: 'Receive critical SMS OTPs, emergency alerts, and login verifications on mobile.',
    icon: 'sms',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
];

function NotificationPreferences({ navigation }) {
  const [preferences, setPreferences] = useState({
    app: true,
    whatsapp: true,
    email: true,
    sms: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackDialog, setFeedbackDialog] = useState(null);

  useEffect(() => {
    let isMounted = true;
    getStateAdminNotificationPreferences()
      .then(res => {
        if (isMounted && res) {
          setPreferences({
            app: !!res.app,
            whatsapp: !!res.whatsapp,
            email: !!res.email,
            sms: !!res.sms,
          });
        }
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, []);

  const handleToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateStateAdminNotificationPreferences(preferences);
      setFeedbackDialog({
        type: 'success',
        title: 'Preferences Saved',
        message: res.message || 'Your notification channel settings have been updated.',
      });
    } catch (e) {
      setFeedbackDialog({
        type: 'error',
        title: 'Failed to Save',
        message: e?.message || 'Could not update notification preferences. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Navy Header */}
      <View style={styles.header}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Channel Preferences</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>
          Configure delivery channels for state-admin alerts, SLA warnings, and reports
        </Text>
      </View>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loaderText}>Loading channel preferences...</Text>
        </View>
      ) : (
        <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHeader}>Delivery Channels</Text>

          <View style={styles.channelsCard}>
            {CHANNELS.map((ch, idx) => (
              <View
                key={ch.key}
                style={[
                  styles.channelRow,
                  idx < CHANNELS.length - 1 && styles.channelBorder,
                ]}
              >
                <View style={[styles.channelIconBg, { backgroundColor: ch.bgColor }]}>
                  <Icon name={ch.icon} size={22} color={ch.color} />
                </View>

                <View style={styles.channelInfo}>
                  <Text style={styles.channelTitle}>{ch.title}</Text>
                  <Text style={styles.channelDescription}>{ch.description}</Text>
                </View>

                <Switch
                  value={!!preferences[ch.key]}
                  onValueChange={() => handleToggle(ch.key)}
                  trackColor={{ false: '#E2E8F0', true: '#BFDBFE' }}
                  thumbColor={preferences[ch.key] ? '#2563EB' : '#94A3B8'}
                />
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.saveBtnText}>Save Preferences</Text>
                <Icon name="check" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Feedback Dialog */}
      <Modal visible={!!feedbackDialog} transparent animationType="fade" onRequestClose={() => setFeedbackDialog(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View
              style={[
                styles.feedbackIconWrap,
                { backgroundColor: feedbackDialog?.type === 'success' ? '#ECFDF5' : '#FEF2F2' },
              ]}
            >
              <Icon
                name={feedbackDialog?.type === 'success' ? 'check' : 'error'}
                size={30}
                color={feedbackDialog?.type === 'success' ? '#10B981' : '#EF4444'}
              />
            </View>
            <Text style={styles.dialogTitle}>{feedbackDialog?.title}</Text>
            <Text style={styles.dialogMsg}>{feedbackDialog?.message}</Text>

            <TouchableOpacity
              style={styles.dialogOkBtn}
              onPress={() => setFeedbackDialog(null)}
            >
              <Text style={styles.dialogOkBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 8, lineHeight: 18 },

  body: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loaderWrap: { paddingVertical: 60, alignItems: 'center' },
  loaderText: { fontSize: 13, color: '#64748B', marginTop: 12 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginLeft: 4,
  },
  channelsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
    marginBottom: 20,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    gap: 14,
  },
  channelBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  channelIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  channelInfo: { flex: 1 },
  channelTitle: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  channelDescription: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 16 },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A64416',
    height: 52,
    borderRadius: 26,
    shadowColor: '#A64416',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  saveBtnDisabled: { opacity: 0.65 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Dialog
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  feedbackIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  dialogMsg: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  dialogOkBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogOkBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default NotificationPreferences;
