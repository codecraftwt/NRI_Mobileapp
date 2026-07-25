import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Alert, Linking, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorJobDetail } from '../../Hooks/useVendorJobDetail';
import { getVendorJobInvoiceUrl } from '../../Api/vendorJobsApi';
import { downloadDocumentFile } from '../../Utils/fileDownload';

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
  const { detail: job, loading, failed, error, retry } = useVendorJobDetail(ticketId);
  const token = useSelector(state => state.user.token);

  const [commitDate, setCommitDate] = useState('');
  const [commitTime, setCommitTime] = useState('');
  const [reportText, setReportText] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingUrl, setTrackingUrl] = useState('');

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

  const handleSaveTracking = () => {
    Alert.alert('Tracking Saved', 'Shipment tracking details have been saved.');
  };

  const handleDownloadInvoice = async () => {
    try {
      await downloadDocumentFile({
        url: getVendorJobInvoiceUrl(ticketId),
        filename: `Invoice-${job?.ticket || ticketId}`,
        token,
      });
      Alert.alert('Invoice Downloaded', 'The invoice PDF has been saved to your device.');
    } catch (e) {
      Alert.alert('Download Failed', e?.message || 'Could not download the invoice.');
    }
  };

  const handleCallCustomer = () => {
    Linking.openURL(`tel:${job.customer.phone}`).catch(() =>
      Alert.alert('Could Not Call', 'Unable to open the dialer.')
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={18} color="#3B82F6" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Job</Text>
          <View style={{ width: 44 }} />
        </View>
        <View style={styles.centerState}>
          <ActivityIndicator size="small" color="#D94625" />
          <Text style={styles.centerStateText}>Loading job...</Text>
        </View>
      </View>
    );
  }

  if (failed || !job) {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back-ios" size={18} color="#3B82F6" style={{ marginLeft: 6 }} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>Job</Text>
          <View style={{ width: 44 }} />
        </View>
        <TouchableOpacity style={styles.centerState} onPress={retry} activeOpacity={0.7}>
          <Icon name="refresh" size={40} color="#DC2626" />
          <Text style={styles.centerStateText}>{error?.message || "Couldn't load this job. Tap to retry."}</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
        {/* Summary Header Card */}
        <View style={styles.card}>
          <View style={styles.summaryTop}>
            <Text style={styles.summaryTicket}>{job.ticket}</Text>
            <View style={styles.summaryBadges}>
              <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: statusStyle.text }]} />
                <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>{job.status}</Text>
              </View>
              <View style={styles.priorityBadge}>
                <Text style={styles.priorityBadgeText}>{job.priority}</Text>
              </View>
            </View>
          </View>

          <View style={styles.serviceRow}>
            <Icon name="home-repair-service" size={16} color="#64748B" />
            <Text style={styles.summaryService}>{job.service}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryMetaRow}>
            <View style={styles.summaryMetaCol}>
              <Text style={styles.infoLabel}>Your Payout</Text>
              <Text style={styles.payoutValue}>₹{job.payout.toFixed(2)}</Text>
            </View>
            <View style={[styles.summaryMetaCol, { alignItems: 'flex-end' }]}>
              <Text style={styles.infoLabel}>Complete By</Text>
              <Text style={styles.infoValue}>{job.completeBy}</Text>
            </View>
          </View>
        </View>

        {/* Job Details */}
        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <Icon name="info-outline" size={18} color="#3B82F6" />
            <Text style={styles.sectionTitle}>Job Details</Text>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Customer</Text>
            <Text style={styles.infoValueBold}>{job.customer.name}</Text>
            <TouchableOpacity style={styles.phoneRow} onPress={handleCallCustomer} activeOpacity={0.7}>
              <Icon name="call" size={14} color="#2563EB" />
              <Text style={styles.phoneText}>{job.customer.phone}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.detailBlock}>
            <Text style={styles.infoLabel}>Address</Text>
            <Text style={styles.infoValueBold}>{job.address.line}</Text>
            <Text style={styles.addressCity}>{job.address.city}</Text>
          </View>

          {!!job.committedEta && (
            <View style={styles.detailBlock}>
              <Text style={styles.infoLabel}>Your Committed ETA</Text>
              <Text style={styles.infoValueBold}>{job.committedEta}</Text>
            </View>
          )}

          {job.addons.length > 0 && (
            <View style={styles.detailBlock}>
              <Text style={styles.infoLabel}>Add-ons</Text>
              <View style={styles.addonChips}>
                {job.addons.map((addon, idx) => (
                  <View key={idx} style={styles.addonChip}>
                    <Text style={styles.addonChipText}>{addon}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

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
              <Icon name="bolt" size={18} color="#059669" />
              <Text style={styles.sectionTitle}>Job Actions</Text>
            </View>
            <View style={styles.completedBanner}>
              <Icon name="check-circle" size={22} color="#059669" />
              <Text style={styles.completedBannerText}>This job is complete. Thank you!</Text>
            </View>
            <TouchableOpacity style={styles.invoiceBtn} onPress={handleDownloadInvoice} activeOpacity={0.8}>
              <Icon name="picture-as-pdf" size={18} color="#2563EB" />
              <Text style={styles.invoiceBtnText}>Download Invoice (PDF)</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Shipment / Tracking */}
        {(isInProgress || isCompleted) && (
          <View style={styles.card}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Icon name="local-shipping" size={18} color="#0EA5E9" />
                <Text style={styles.sectionTitle}>Shipment / Tracking</Text>
              </View>
              <Text style={styles.optionalText}>optional</Text>
            </View>

            <View style={styles.reportField}>
              <Text style={styles.commitLabel}>Tracking / Shipment Number</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="e.g. AWB123456789"
                placeholderTextColor="#94A3B8"
                value={trackingNumber}
                onChangeText={setTrackingNumber}
              />
            </View>

            <View style={styles.reportField}>
              <Text style={styles.commitLabel}>Tracking URL</Text>
              <TextInput
                style={styles.dateInput}
                placeholder="https://tracking.example.com/..."
                placeholderTextColor="#94A3B8"
                value={trackingUrl}
                onChangeText={setTrackingUrl}
                autoCapitalize="none"
                keyboardType="url"
              />
            </View>

            <TouchableOpacity style={styles.saveTrackingBtn} onPress={handleSaveTracking} activeOpacity={0.8}>
              <Icon name="save-alt" size={16} color="#2563EB" />
              <Text style={styles.saveTrackingText}>Save Tracking</Text>
            </TouchableOpacity>
          </View>
        )}

        {isCompleted && job.report && (
          <View style={[styles.card, styles.reportCardWrap]}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionHeader}>
                <Icon name="description" size={18} color="#059669" />
                <Text style={styles.sectionTitle}>Your Submitted Report</Text>
              </View>
            </View>
            <Text style={styles.reportContent}>{job.report}</Text>
            {!!job.reportFile && (
              <TouchableOpacity style={styles.pdfThumb} activeOpacity={0.7}>
                <Icon name="insert-drive-file" size={26} color="#64748B" />
                <Text style={styles.pdfThumbText}>PDF</Text>
              </TouchableOpacity>
            )}
            <View style={styles.reportTimeRow}>
              <Icon name="schedule" size={13} color="#94A3B8" />
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
                    <View style={styles.timelineTopRow}>
                      <View style={[styles.timelineBadge, { backgroundColor: eventStyle.bg }]}>
                        <Text style={[styles.timelineBadgeText, { color: eventStyle.text }]}>{event.status}</Text>
                      </View>
                      <Text style={styles.timelineDate}>{event.date}</Text>
                    </View>
                    <Text style={styles.timelineNote}>{event.note}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <TouchableOpacity style={styles.backToJobsBtn} onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <Icon name="arrow-back" size={16} color="#2563EB" />
          <Text style={styles.backToJobsText}>Back to My Jobs</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 40 },
  centerStateText: { fontSize: 14, color: '#64748B', textAlign: 'center' },

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
  timelineTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  timelineDate: { fontSize: 12, color: '#94A3B8' },
  timelineNote: { fontSize: 13, color: '#475569', marginTop: 4 },

  // Summary header card
  summaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  summaryTicket: { fontSize: 18, fontWeight: '800', color: '#1E293B', flexShrink: 1 },
  summaryBadges: { flexDirection: 'row', gap: 8, flexShrink: 0 },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryService: { fontSize: 14, color: '#475569', flex: 1, lineHeight: 20 },
  summaryDivider: { height: 1, backgroundColor: '#F1F5F9' },
  summaryMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  summaryMetaCol: { gap: 3 },
  payoutValue: { fontSize: 20, fontWeight: '800', color: '#059669' },

  // Job details blocks
  detailBlock: { gap: 3 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  phoneText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  addonChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  addonChip: { backgroundColor: '#F5F3FF', borderWidth: 1, borderColor: '#DDD6FE', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  addonChipText: { fontSize: 12, fontWeight: '600', color: '#6D28D9' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  optionalText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },

  invoiceBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 14, paddingVertical: 13,
  },
  invoiceBtnText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },

  saveTrackingBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10,
  },
  saveTrackingText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },

  reportCardWrap: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  sharedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#DCFCE7', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 },
  sharedBadgeText: { fontSize: 11, fontWeight: '700', color: '#059669' },
  pdfThumb: {
    width: 72, height: 72, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center', gap: 2,
  },
  pdfThumbText: { fontSize: 11, fontWeight: '600', color: '#64748B' },
  reportTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  backToJobsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, alignSelf: 'center',
    borderWidth: 1.5, borderColor: '#BFDBFE', borderRadius: 24, paddingHorizontal: 24, paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backToJobsText: { fontSize: 14, fontWeight: '700', color: '#2563EB' },
});

export default JobDetail;
