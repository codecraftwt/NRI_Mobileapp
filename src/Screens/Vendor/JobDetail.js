import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MOCK_JOB_DATA = {
  '1': {
    ticket: 'NRI-2026-00011',
    service: 'Scheduled Home Visits by Care Executive',
    status: 'In Progress',
    priority: 'Standard',
    completeBy: '18 Jul 2026, 08:59',
    payout: 0,
    customer: { name: 'akanksha', phone: '7890120910' },
    address: { line: 'qwert', city: 'Kolhapur, Maharashtra' },
    addons: ['Extra Home Visit (beyond plan limit)'],
    committedEta: '17 Jul 2026, 20:40',
    timeline: [
      { status: 'New', date: '17 Jul 2026, 08:59', note: 'Ticket created' },
      { status: 'Assigned', date: '17 Jul 2026, 09:02', note: 'Vendor assigned' },
      { status: 'In Progress', date: '17 Jul 2026, 09:04', note: 'Service started' },
    ],
  },
  '2': {
    ticket: 'NRI-2026-00009',
    service: 'Scheduled Home Visits by Care Executive',
    status: 'Completed',
    priority: 'Standard',
    completeBy: '17 Jul 2026, 05:21',
    payout: 0,
    customer: { name: 'akanksha', phone: '7890120910' },
    address: { line: 'House 12', city: 'Kolhapur, Maharashtra' },
    addons: [],
    committedEta: '16 Jul 2026, 10:57',
    report: 'done....',
    reportSubmittedAt: '1 day ago',
    timeline: [
      { status: 'New', date: '16 Jul 2026, 05:21', note: 'Ticket created' },
      { status: 'Assigned', date: '16 Jul 2026, 05:24', note: 'Vendor assigned' },
      { status: 'In Progress', date: '16 Jul 2026, 05:27', note: 'Service started' },
      { status: 'Completed', date: '16 Jul 2026, 05:27', note: 'Report submitted by vendor' },
    ],
  },
  '3': {
    ticket: 'NRI-2026-00008',
    service: 'Medicine Reminder Coordination',
    status: 'Completed',
    priority: 'Standard',
    completeBy: '16 Jul 2026, 08:54',
    payout: 0,
    customer: { name: 'Ramesh Kulkarni', phone: '9876543210' },
    address: { line: '45 Ring Road', city: 'Kolhapur, Maharashtra' },
    addons: [],
    committedEta: '15 Jul 2026, 18:00',
    report: 'Reminders set up and confirmed with family.',
    reportSubmittedAt: '2 days ago',
    timeline: [
      { status: 'New', date: '15 Jul 2026, 08:54', note: 'Ticket created' },
      { status: 'Assigned', date: '15 Jul 2026, 09:00', note: 'Vendor assigned' },
      { status: 'In Progress', date: '15 Jul 2026, 09:10', note: 'Service started' },
      { status: 'Completed', date: '15 Jul 2026, 17:45', note: 'Report submitted by vendor' },
    ],
  },
};

function getStatusStyle(status) {
  switch (status) {
    case 'Completed': return { bg: '#D1FAE5', text: '#059669' };
    case 'In Progress': return { bg: '#FFEDD5', text: '#C2410C' };
    case 'Assigned': return { bg: '#FEF9C3', text: '#CA8A04' };
    case 'New': return { bg: '#DBEAFE', text: '#1D4ED8' };
    default: return { bg: '#F3F4F6', text: '#4B5563' };
  }
}

function JobDetail({ route, navigation }) {
  const { ticketId } = route.params || {};
  const job = MOCK_JOB_DATA[ticketId] || MOCK_JOB_DATA['1'];

  const [commitDate, setCommitDate] = useState('');
  const [commitTime, setCommitTime] = useState('');
  const [reportText, setReportText] = useState('');

  const handleAccept = () => {
    Alert.alert('Job Accepted', 'You have accepted this job.');
  };

  const handleReject = () => {
    Alert.alert('Reject Job', 'Are you sure you want to reject this job?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive' },
    ]);
  };

  const handleSubmitReport = () => {
    if (!reportText.trim()) {
      Alert.alert('Report Required', 'Please describe the work completed.');
      return;
    }
    Alert.alert('Report Submitted', 'Your completion report has been submitted.');
  };

  const isAssigned = job.status === 'New' || job.status === 'Assigned';
  const isInProgress = job.status === 'In Progress';
  const isCompleted = job.status === 'Completed';
  const statusStyle = getStatusStyle(job.status);

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={18} color="#3B82F6" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{job.ticket}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
              <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{job.status}</Text>
            </View>
            <View style={styles.priorityBadge}>
              <Text style={styles.priorityBadgeText}>{job.priority}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon name="event" size={18} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Complete by</Text>
              <Text style={styles.infoValue}>{job.completeBy}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon name="home-repair-service" size={18} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Service</Text>
              <Text style={styles.infoValue}>{job.service}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Icon name="account-balance-wallet" size={18} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Your Payout (vendor cost)</Text>
              <Text style={styles.infoValueBold}>₹{job.payout.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="person" size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>
          <View style={styles.customerInfo}>
            <View style={styles.customerAvatar}>
              <Text style={styles.customerInitial}>{job.customer.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={styles.customerName}>{job.customer.name}</Text>
              <Text style={styles.customerPhone}>{job.customer.phone}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="location-on" size={18} color="#DC2626" />
            <Text style={styles.sectionTitle}>Address</Text>
          </View>
          <Text style={styles.addressLine}>{job.address.line}</Text>
          <Text style={styles.addressCity}>{job.address.city}</Text>
        </View>

        {job.addons.length > 0 && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="add-circle-outline" size={18} color="#8B5CF6" />
              <Text style={styles.sectionTitle}>Add-ons</Text>
            </View>
            {job.addons.map((addon, idx) => (
              <View key={idx} style={styles.addonItem}>
                <Icon name="check-circle" size={16} color="#10B981" />
                <Text style={styles.addonText}>{addon}</Text>
              </View>
            ))}
          </View>
        )}

        {(isInProgress || isCompleted) && job.committedEta && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="schedule" size={18} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Your Committed ETA</Text>
            </View>
            <Text style={styles.etaValue}>{job.committedEta}</Text>
          </View>
        )}

        {isAssigned && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="gavel" size={18} color="#D94625" />
              <Text style={styles.sectionTitle}>Job Actions</Text>
            </View>
            <Text style={styles.actionDesc}>
              Accept this job with a committed completion time, or reject it to send it back to the assignment team.
            </Text>

            <View style={styles.commitField}>
              <Text style={styles.commitLabel}>I commit to complete this job by *</Text>
              <View style={styles.dateTimeRow}>
                <TextInput
                  style={styles.dateInput}
                  placeholder="dd-mm-yyyy"
                  placeholderTextColor="#94A3B8"
                  value={commitDate}
                  onChangeText={setCommitDate}
                  maxLength={10}
                />
                <TextInput
                  style={styles.timeInput}
                  placeholder="--:--"
                  placeholderTextColor="#94A3B8"
                  value={commitTime}
                  onChangeText={setCommitTime}
                  maxLength={5}
                />
              </View>
              <View style={styles.slaRow}>
                <Icon name="info-outline" size={14} color="#94A3B8" />
                <Text style={styles.slaHint}>SLA deadline: {job.completeBy}</Text>
              </View>
            </View>

            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
                <Icon name="check-circle-outline" size={18} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>Accept Job</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
                <Icon name="close" size={18} color="#DC2626" />
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isInProgress && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="gavel" size={18} color="#D94625" />
              <Text style={styles.sectionTitle}>Job Actions</Text>
            </View>
            <Text style={styles.actionDesc}>
              When the work is done, submit your completion report. This notifies the RM and closes the job.
            </Text>

            <View style={styles.reportField}>
              <Text style={styles.commitLabel}>Report *</Text>
              <TextInput
                style={styles.reportInput}
                placeholder="Describe the work completed, observations, and any follow-up needed."
                placeholderTextColor="#94A3B8"
                value={reportText}
                onChangeText={setReportText}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.reportField}>
              <Text style={styles.commitLabel}>Photos / Documents (optional, up to 8)</Text>
              <TouchableOpacity style={styles.fileUploadBtn}>
                <Icon name="cloud-upload" size={20} color="#64748B" />
                <Text style={styles.fileUploadText}>No file chosen</Text>
              </TouchableOpacity>
              <Text style={styles.fileHint}>
                Photos (JPG/PNG), PDF or video (MP4/MOV/WebM), max 25 MB each.
              </Text>
            </View>

            <TouchableOpacity style={styles.submitReportBtn} onPress={handleSubmitReport}>
              <Icon name="send" size={16} color="#FFFFFF" />
              <Text style={styles.submitReportBtnText}>Submit Report</Text>
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="gavel" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Job Actions</Text>
            </View>
            <View style={styles.completedBanner}>
              <Icon name="check-circle" size={22} color="#059669" />
              <Text style={styles.completedBannerText}>This job is complete. Thank you!</Text>
            </View>
          </View>
        )}

        {isCompleted && job.report && (
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="description" size={18} color="#3B82F6" />
              <Text style={styles.sectionTitle}>Your Submitted Report</Text>
            </View>
            <View style={styles.reportCard}>
              <Text style={styles.reportContent}>{job.report}</Text>
              <Text style={styles.reportTime}>Submitted {job.reportSubmittedAt}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="timeline" size={18} color="#64748B" />
            <Text style={styles.sectionTitle}>Timeline</Text>
          </View>
          <View style={styles.timelineWrapper}>
            {job.timeline.map((event, idx) => {
              const isLast = idx === job.timeline.length - 1;
              const eventStyle = getStatusStyle(event.status);
              return (
                <View key={idx} style={styles.timelineRow}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDot, isLast && styles.timelineDotActive, isLast && { backgroundColor: eventStyle.text }]} />
                    {!isLast && <View style={styles.timelineLine} />}
                  </View>
                  <View style={styles.timelineContent}>
                    <View style={[styles.timelineBadge, { backgroundColor: eventStyle.bg }]}>
                      <Text style={[styles.timelineBadgeText, { color: eventStyle.text }]}>{event.status}</Text>
                    </View>
                    <Text style={styles.timelineDate}>{event.date}</Text>
                    <Text style={styles.timelineNote}>{event.note}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  headerContainer: {
    backgroundColor: '#FDFBF7',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerBackBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFFFFF',
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2,
  },
  headerTitle: {
    ...typography.sectionTitle, fontFamily: typography.h2.fontFamily,
    color: '#1E293B', flex: 1, textAlign: 'center',
  },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', padding: 20, borderRadius: 20, gap: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },

  statusRow: { flexDirection: 'row', gap: 10 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },
  priorityBadge: {
    backgroundColor: '#F1F5F9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10,
  },
  priorityBadgeText: { fontSize: 13, fontWeight: '600', color: '#64748B' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: {
    ...typography.sectionTitle, fontFamily: typography.h2.fontFamily,
    color: '#0F172A', marginBottom: 0,
  },

  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: '#F8FAFC',
    justifyContent: 'center', alignItems: 'center', marginTop: 2,
  },
  infoContent: { flex: 1, gap: 2 },
  infoLabel: { fontSize: 11, fontWeight: '600', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20 },
  infoValueBold: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  customerInfo: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  customerAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1E3A8A',
    justifyContent: 'center', alignItems: 'center',
  },
  customerInitial: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  customerName: { fontSize: 15, fontWeight: '700', color: '#0F172A' },
  customerPhone: { fontSize: 13, color: '#64748B', marginTop: 2 },

  addressLine: { fontSize: 14, fontWeight: '600', color: '#0F172A', lineHeight: 20 },
  addressCity: { fontSize: 13, color: '#64748B', marginTop: 2 },

  addonItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  addonText: { fontSize: 13, color: '#475569', flex: 1 },

  etaValue: { fontSize: 15, fontWeight: '700', color: '#0F172A' },

  actionDesc: { fontSize: 13, color: '#64748B', lineHeight: 19 },

  commitField: { gap: 8 },
  commitLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  dateTimeRow: { flexDirection: 'row', gap: 10 },
  dateInput: {
    flex: 1, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  timeInput: {
    width: 100, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A',
    backgroundColor: '#F8FAFC', textAlign: 'center',
  },
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  slaHint: { fontSize: 12, color: '#94A3B8' },

  actionRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  acceptBtn: {
    flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#059669', justifyContent: 'center', alignItems: 'center',
  },
  acceptBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },
  rejectBtn: {
    flex: 1, flexDirection: 'row', gap: 8, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#DC2626',
    justifyContent: 'center', alignItems: 'center',
  },
  rejectBtnText: { fontSize: 15, fontWeight: '700', color: '#DC2626' },

  reportField: { gap: 8 },
  reportInput: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0F172A',
    textAlignVertical: 'top', minHeight: 100, backgroundColor: '#F8FAFC', lineHeight: 20,
  },

  fileUploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0',
    borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#F8FAFC',
  },
  fileUploadText: { fontSize: 14, color: '#64748B' },
  fileHint: { fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 16 },

  submitReportBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: '#D94625', borderRadius: 24, paddingVertical: 14,
    justifyContent: 'center', alignItems: 'center', marginTop: 4,
  },
  submitReportBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  completedBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#F0FDF4', borderRadius: 14, padding: 16,
  },
  completedBannerText: { fontSize: 14, fontWeight: '600', color: '#059669', flex: 1 },

  reportCard: {
    backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, gap: 8,
  },
  reportContent: { fontSize: 14, color: '#334155', lineHeight: 20 },
  reportTime: { fontSize: 12, color: '#94A3B8' },

  timelineWrapper: { marginTop: 4, paddingLeft: 4 },
  timelineRow: { flexDirection: 'row', gap: 16 },
  timelineDotCol: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: '#E2E8F0', marginTop: 6,
  },
  timelineDotActive: { width: 14, height: 14, borderRadius: 7, marginTop: 5 },
  timelineLine: { flex: 1, width: 2, backgroundColor: '#F1F5F9', marginTop: 4, marginBottom: -4 },
  timelineContent: { flex: 1, paddingBottom: 20, gap: 4 },
  timelineBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  timelineBadgeText: { fontSize: 12, fontWeight: '700' },
  timelineDate: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  timelineNote: { fontSize: 13, color: '#475569' },
});

export default JobDetail;
