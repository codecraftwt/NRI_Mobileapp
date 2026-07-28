import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, TextInput, Modal, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import { useVendorSupport } from '../../Hooks/useVendorSupport';
import { useVendorJobs } from '../../Hooks/useVendorJobs';

// The dispute can optionally be tied to one of the vendor's jobs (sends
// `ticket_id`). Default is a general payout/account issue (no ticket_id).
const GENERAL_OPTION = { label: '— General / payment issue —', ticketId: null };

function getStatusPill(status) {
  switch (String(status || '').toLowerCase()) {
    case 'resolved': return { bg: '#D1FAE5', text: '#059669' };
    case 'rejected': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#FFEDD5', text: '#C2410C' }; // pending / in review
  }
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function Support() {
  const [page, setPage] = useState(1);
  const {
    disputes, meta, loading, failed, retry, fetchPage,
    raiseLoading, raise,
  } = useVendorSupport(page);

  // Jobs for the "Related Job" typeahead (GET /vendor/jobs?search=). No status
  // filter — a vendor can dispute a completed job's payment, not just active ones.
  const { jobs, loading: jobsLoading, fetch: fetchJobs } = useVendorJobs({ page: 1 });
  const [jobSearch, setJobSearch] = useState('');

  const jobOptions = useMemo(() => [
    GENERAL_OPTION,
    ...jobs.map(j => ({ label: `${j.ticket} · ${j.service}`.trim(), ticketId: j.id })),
  ], [jobs]);

  const [relatedJob, setRelatedJob] = useState(GENERAL_OPTION);
  const [issue, setIssue] = useState('');
  const [amount, setAmount] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);

  const openJobPicker = () => {
    setJobSearch('');
    setPickerOpen(true);
  };

  const onJobSearch = (text) => {
    setJobSearch(text);
    fetchJobs({ search: text.trim() || undefined, page: 1 });
  };

  const goToPage = (p) => {
    setPage(p);
    fetchPage(p);
  };

  const handleSubmit = async () => {
    if (!issue.trim()) {
      Alert.alert('Describe the issue', 'Please explain what went wrong with this job or payment.');
      return;
    }
    try {
      await raise({ ticketId: relatedJob.ticketId, reason: issue.trim(), amount }).unwrap();
      setIssue('');
      setAmount('');
      setRelatedJob(GENERAL_OPTION);
      Alert.alert('Dispute Submitted', 'Your district partner will review this dispute.');
    } catch (e) {
      const msg = e?.status === 403
        ? 'This ticket belongs to another vendor.'
        : e?.message || 'Could not submit your dispute. Please try again.';
      Alert.alert('Could Not Submit', msg);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Support</Text>
        <Text style={styles.headerSub}>Raise and track payout or account disputes</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Raise a Dispute */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="campaign" size={20} color="#D94625" />
            <Text style={styles.cardTitle}>Raise a Dispute</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Related Job</Text>
            <Text style={styles.hint}>Optional — leave as "General / payment issue" for payout or account problems.</Text>
            <TouchableOpacity style={styles.select} onPress={openJobPicker} activeOpacity={0.7}>
              <Text style={styles.selectText} numberOfLines={1}>{relatedJob.label}</Text>
              <Icon name="expand-more" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Describe the issue <Text style={styles.req}>*</Text></Text>
            <TextInput
              style={styles.textArea}
              placeholder="Explain what went wrong with this job or payment..."
              placeholderTextColor="#94A3B8"
              value={issue}
              onChangeText={setIssue}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Disputed Amount <Text style={styles.labelMuted}>(₹, optional)</Text></Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, raiseLoading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={raiseLoading}
            activeOpacity={0.85}
          >
            {raiseLoading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Icon name="send" size={18} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Submit Dispute</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.footerNote}>Your district partner reviews disputes and will record the resolution here.</Text>
        </View>

        {/* My Disputes */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="gavel" size={20} color="#3B82F6" />
            <Text style={styles.cardTitle}>My Disputes</Text>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color="#D94625" />
              <Text style={styles.emptyText}>Loading disputes...</Text>
            </View>
          ) : failed ? (
            <TouchableOpacity style={styles.emptyState} onPress={retry} activeOpacity={0.7}>
              <Icon name="refresh" size={26} color="#DC2626" />
              <Text style={[styles.emptyText, { color: '#DC2626' }]}>Couldn't load disputes. Tap to retry.</Text>
            </TouchableOpacity>
          ) : disputes.length === 0 ? (
            <View style={styles.emptyState}>
              <Icon name="inbox" size={28} color="#CBD5E1" />
              <Text style={styles.emptyText}>No disputes raised yet.</Text>
            </View>
          ) : (
            <>
              {disputes.map((d, index) => {
                const pill = getStatusPill(d.status);
                return (
                  <View key={d.id ?? index} style={[styles.disputeRow, index < disputes.length - 1 && styles.rowBorder]}>
                    <View style={styles.disputeTop}>
                      <View style={styles.jobWrap}>
                        <View style={styles.indexBadge}><Text style={styles.indexText}>{index + 1}</Text></View>
                        <Text style={styles.jobText}>{d.job}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: pill.bg }]}>
                        <Text style={[styles.statusPillText, { color: pill.text }]}>{d.statusLabel}</Text>
                      </View>
                    </View>

                    <Text style={styles.issueText}>{d.issue}</Text>

                    <View style={styles.metaGrid}>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Amount</Text>
                        <Text style={styles.metaValue}>{d.amount != null ? `₹${d.amount.toFixed(2)}` : '—'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Resolution</Text>
                        <Text style={styles.metaValue}>{d.resolution || '—'}</Text>
                      </View>
                      <View style={styles.metaItem}>
                        <Text style={styles.metaLabel}>Raised</Text>
                        <Text style={styles.metaValue}>{formatDate(d.raisedAt)}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}

              <View style={styles.paginationRow}>
                <Text style={styles.entriesText}>
                  {meta.total} {meta.total === 1 ? 'entry' : 'entries'}
                </Text>
                {meta.lastPage > 1 && (
                  <View style={styles.pager}>
                    <TouchableOpacity
                      style={[styles.pageBtn, page <= 1 && styles.pageBtnDisabled]}
                      onPress={() => goToPage(page - 1)}
                      disabled={page <= 1}
                    >
                      <Icon name="chevron-left" size={20} color={page <= 1 ? '#CBD5E1' : '#2563EB'} />
                    </TouchableOpacity>
                    <Text style={styles.pageIndicator}>{meta.currentPage} / {meta.lastPage}</Text>
                    <TouchableOpacity
                      style={[styles.pageBtn, page >= meta.lastPage && styles.pageBtnDisabled]}
                      onPress={() => goToPage(page + 1)}
                      disabled={page >= meta.lastPage}
                    >
                      <Icon name="chevron-right" size={20} color={page >= meta.lastPage ? '#CBD5E1' : '#2563EB'} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </>
          )}
        </View>

      </ScrollView>

      {/* Related Job picker — searches ticket number / service name */}
      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <TouchableOpacity style={styles.modalSheet} activeOpacity={1} onPress={() => {}}>
            <Text style={styles.modalTitle}>Select Related Job</Text>
            <View style={styles.searchBox}>
              <Icon name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by ticket or service..."
                placeholderTextColor="#94A3B8"
                value={jobSearch}
                onChangeText={onJobSearch}
                autoCorrect={false}
              />
              {jobsLoading && <ActivityIndicator size="small" color="#94A3B8" />}
            </View>
            <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 320 }}>
              {jobOptions.map(opt => {
                const selected = opt.ticketId === relatedJob.ticketId;
                return (
                  <TouchableOpacity
                    key={opt.ticketId ?? 'general'}
                    style={styles.optionRow}
                    onPress={() => { setRelatedJob(opt); setPickerOpen(false); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.optionText, selected && styles.optionTextSelected]} numberOfLines={1}>{opt.label}</Text>
                    {selected && <Icon name="check" size={20} color="#D94625" />}
                  </TouchableOpacity>
                );
              })}
              {!jobsLoading && jobOptions.length === 1 && (
                <Text style={styles.noJobsText}>No jobs found{jobSearch ? ` for "${jobSearch}"` : ''}.</Text>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  cardTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  field: { marginBottom: 16 },
  label: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  labelMuted: { fontSize: 13, color: '#94A3B8', fontFamily: typography.body.fontFamily },
  req: { color: '#DC2626' },
  hint: { fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 8, lineHeight: 17 },

  select: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: '#F8FAFC', marginTop: 8,
  },
  selectText: { fontSize: 14, color: '#0F172A', flex: 1, paddingRight: 8 },

  textArea: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', textAlignVertical: 'top', minHeight: 110, marginTop: 8, lineHeight: 20,
  },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#0F172A', backgroundColor: '#F8FAFC', marginTop: 8,
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#A64416', borderRadius: 26, paddingVertical: 15, minHeight: 52,
  },

  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },
  footerNote: { fontSize: 12, color: '#94A3B8', marginTop: 14, lineHeight: 18, textAlign: 'center' },

  disputeRow: { paddingBottom: 14, marginBottom: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  disputeTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  jobWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indexBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  indexText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  jobText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#1E293B' },
  statusPill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  statusPillText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily },

  issueText: { fontSize: 14, color: '#334155', marginTop: 10, lineHeight: 20 },

  metaGrid: { flexDirection: 'row', marginTop: 12, gap: 12 },
  metaItem: { flex: 1 },
  metaLabel: { fontSize: 11, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  metaValue: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 3 },

  paginationRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  entriesText: { fontSize: 12, color: '#94A3B8' },
  pager: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pageBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, borderColor: '#BFDBFE', justifyContent: 'center', alignItems: 'center' },
  pageBtnDisabled: { borderColor: '#E2E8F0' },
  pageIndicator: { fontSize: 13, color: '#64748B' },

  emptyState: { alignItems: 'center', gap: 8, paddingVertical: 22 },
  emptyText: { fontSize: 13, color: '#94A3B8' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 12, height: 44, marginBottom: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  optionText: { fontSize: 15, color: '#334155', flex: 1, paddingRight: 12 },
  optionTextSelected: { color: '#D94625', fontFamily: typography.labelMedium.fontFamily },
  noJobsText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 20 },
});

export default Support;
