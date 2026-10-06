import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
  Linking,
  Modal,
  Alert,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { useAttachmentViewer } from '../../Components/useAttachmentViewer';
import {
  getTelecallerServiceRequestDetail,
  addTelecallerRequestNote,
  sendTelecallerVendorChatMessage,
  proposeTelecallerQuotedPrice,
} from '../../Api/Telecaller/telecallerRequestsApi';

function formatInr(val) {
  const num = Number(val || 0);
  const isNeg = num < 0;
  const absFormatted = Math.abs(num).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNeg ? `₹-${absFormatted}` : `₹${absFormatted}`;
}

function formatDateTime(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusStyle(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('resolv') || s.includes('complet')) return { bg: '#ECFDF5', text: '#059669', border: '#A7F3D0' };
  if (s.includes('progress') || s.includes('active') || s.includes('assign')) return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
  if (s.includes('pend') || s.includes('hold')) return { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' };
  if (s.includes('cancel') || s.includes('breach') || s.includes('reject')) return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
  return { bg: '#F8FAFC', text: '#475569', border: '#E2E8F0' };
}

const TIMELINE_STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'assigned', label: 'Vendor assigned' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'completed', label: 'Completed' },
  { key: 'report_sent', label: 'Report sent' },
];

function getTimelineProgressIndex(status, statusHistory = []) {
  const mapStatusToStep = (st) => {
    const s = String(st || '').toLowerCase();
    if (!s) return 0;
    if (s.includes('report_sent') || s.includes('closed') || s.includes('delivered') || s.includes('archived')) {
      return 4;
    }
    if (
      s.includes('complet') ||
      s.includes('resolv') ||
      s.includes('review') ||
      s.includes('submitted') ||
      s.includes('done')
    ) {
      return 3;
    }
    if (s.includes('progress') || s.includes('active') || s.includes('started') || s.includes('ongoing')) {
      return 2;
    }
    if (s.includes('assign')) {
      return 1;
    }
    return 0;
  };

  let maxStep = mapStatusToStep(status);

  if (Array.isArray(statusHistory)) {
    statusHistory.forEach(h => {
      const step = mapStatusToStep(h.status);
      if (step > maxStep) {
        maxStep = step;
      }
    });
  }

  return maxStep;
}

function TicketDetail({ route, navigation }) {
  const rawTicketParam = route?.params?.ticket;
  const ticketId =
    route?.params?.ticketId ||
    route?.params?.id ||
    (typeof rawTicketParam === 'object' && rawTicketParam !== null ? rawTicketParam.id : rawTicketParam);
  const ticketNumberParam =
    route?.params?.ticketNumber ||
    (typeof rawTicketParam === 'string' ? rawTicketParam : rawTicketParam?.ticketNumber || rawTicketParam?.ticket_number);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const { openAttachment, preview: attachmentPreview } = useAttachmentViewer();

  // Modal states
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [quoteModalVisible, setQuoteModalVisible] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState('');
  const [quoteReason, setQuoteReason] = useState('');
  const [submittingQuote, setSubmittingQuote] = useState(false);

  // Vendor chat message state
  const [vendorChatMessage, setVendorChatMessage] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Internal note state
  const [newNote, setNewNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    if (!ticketId) {
      setError('Invalid request ID');
      setLoading(false);
      return;
    }
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const res = await getTelecallerServiceRequestDetail(ticketId);
      setData(res);
    } catch (err) {
      setError(err?.message || 'Failed to load request details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDetail(true);
  }, [fetchDetail]);

  // Send vendor chat
  const handleSendVendorChat = async () => {
    if (!vendorChatMessage.trim() || sendingChat) return;
    try {
      setSendingChat(true);
      await sendTelecallerVendorChatMessage(ticketId, vendorChatMessage.trim());
      setVendorChatMessage('');
      fetchDetail(true);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not send message to vendor');
    } finally {
      setSendingChat(false);
    }
  };

  // Add internal note
  const handleAddNote = async () => {
    if (!newNote.trim() || addingNote) return;
    try {
      setAddingNote(true);
      await addTelecallerRequestNote(ticketId, newNote.trim());
      setNewNote('');
      fetchDetail(true);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Could not add internal note');
    } finally {
      setAddingNote(false);
    }
  };

  // Propose quoted price
  const handleProposeQuote = async () => {
    if (!quoteAmount || isNaN(Number(quoteAmount))) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount in INR.');
      return;
    }
    try {
      setSubmittingQuote(true);
      await proposeTelecallerQuotedPrice(ticketId, {
        amount: Number(quoteAmount),
        reason: quoteReason.trim(),
      });
      setQuoteModalVisible(false);
      setQuoteAmount('');
      setQuoteReason('');
      Alert.alert('Success', 'Quote proposed successfully! Awaiting admin approval.');
      fetchDetail(true);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to propose quote price');
    } finally {
      setSubmittingQuote(false);
    }
  };


  if (loading && !data) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ticketNumberParam || (ticketId ? `#${ticketId}` : 'Service Request')}
            </Text>
            <View style={styles.headerRightPlaceholder} />
          </View>
        </View>
        <View style={styles.creamBodyLoading}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.container}>
        <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />
        <View style={styles.blueHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {ticketNumberParam || (ticketId ? `#${ticketId}` : 'Service Request')}
            </Text>
            <View style={styles.headerRightPlaceholder} />
          </View>
        </View>
        <View style={styles.creamBodyLoading}>
          <Icon name="error-outline" size={48} color="#DC2626" />
          <Text style={styles.errorTitle}>Could not load request</Text>
          <Text style={styles.errorSubtitle}>{error || 'Request not found'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetail()}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusStyle = getStatusStyle(data.status);
  const currentStepIdx = getTimelineProgressIndex(data.status, data.statusHistory);

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />

      {/* Header Bar */}
      <View style={styles.blueHeader}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {data.ticketNumber}
          </Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      {/* Status Stepper Tracker - fixed, not part of scrolling tabs */}
      <View style={styles.stepperWrap}>
        <View style={styles.stepperCard}>
          <View style={styles.stepperRow}>
            {TIMELINE_STEPS.map((step, idx) => {
              const isPassed = idx <= currentStepIdx;
              const isCurrent = idx === currentStepIdx;
              return (
                <View key={step.key} style={styles.stepItem}>
                  <View style={styles.stepIndicatorRow}>
                    {idx > 0 && (
                      <View style={[styles.stepLine, idx <= currentStepIdx && styles.stepLineActive]} />
                    )}
                    <View style={[styles.stepDot, isPassed && styles.stepDotActive, isCurrent && styles.stepDotCurrent]}>
                      {isPassed ? (
                        <Icon name="check" size={12} color="#FFFFFF" />
                      ) : (
                        <View style={styles.stepDotInner} />
                      )}
                    </View>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <View style={[styles.stepLine, idx < currentStepIdx && styles.stepLineActive]} />
                    )}
                  </View>
                  <Text style={[styles.stepLabel, isPassed && styles.stepLabelActive]} numberOfLines={1}>
                    {step.label}
                  </Text>
                </View>
              );
            })}
          </View>

          {data.statusHistory.length > 0 && (
            <TouchableOpacity
              style={styles.historyLinkBtn}
              onPress={() => setHistoryModalVisible(true)}
              activeOpacity={0.7}
            >
              <Icon name="history" size={14} color="#3B82F6" />
              <Text style={styles.historyLinkText}>View full history ({data.statusHistory.length})</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'details' && styles.tabBtnActive]}
          onPress={() => setActiveTab('details')}
          activeOpacity={0.7}
        >
          <Icon name="receipt" size={16} color={activeTab === 'details' ? '#20304C' : '#94A3B8'} />
          <Text style={[styles.tabBtnText, activeTab === 'details' && styles.tabBtnTextActive]}>Details</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'activity' && styles.tabBtnActive]}
          onPress={() => setActiveTab('activity')}
          activeOpacity={0.7}
        >
          <Icon name="forum" size={16} color={activeTab === 'activity' ? '#20304C' : '#94A3B8'} />
          <Text style={[styles.tabBtnText, activeTab === 'activity' && styles.tabBtnTextActive]}>Activity</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'details' ? (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
      >
        {/* 1. Request Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="receipt" size={18} color="#3B82F6" />
            <Text style={styles.cardTitle}>Request Details</Text>
          </View>

          <View style={styles.detailsGrid}>
            <View style={styles.detailColFull}>
              <Text style={styles.detailLabel}>SERVICE</Text>
              <Text style={styles.detailValueBold}>{data.serviceName}</Text>
              {data.createdAt ? (
                <Text style={styles.detailValueSub}>Created {formatDateTime(data.createdAt)}</Text>
              ) : null}
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>CUSTOMER</Text>
              <Text style={styles.detailValueBold}>{data.customer.name}</Text>
              {data.customer.email && (
                <Text style={styles.detailValueSub}>{data.customer.email}</Text>
              )}
              {data.customer.phone && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${data.customer.phone}`)}
                  style={styles.phoneClickRow}
                >
                  <Icon name="phone" size={12} color="#2563EB" />
                  <Text style={styles.detailLink}>{data.customer.phone}</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>LOCATION</Text>
              <Text style={styles.detailValue}>
                {[data.location.districtName, data.location.stateName].filter(Boolean).join(', ') || 'Not specified'}
              </Text>
              {data.location.pincode && (
                <Text style={styles.detailValueSub}>Pincode: {data.location.pincode}</Text>
              )}
              {data.location.address && (
                <Text style={styles.detailValueSub}>{data.location.address}</Text>
              )}
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>FAMILY MEMBER</Text>
              <Text style={styles.detailValue}>{data.familyMember || 'None'}</Text>
            </View>

            <View style={styles.detailCol}>
              <Text style={styles.detailLabel}>PREFERRED DATE</Text>
              <Text style={styles.detailValue}>
                {data.preferredDate ? formatDate(data.preferredDate) : 'Not specified'}
              </Text>
            </View>
          </View>
        </View>

        {/* 2. Assignment Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="assignment-ind" size={18} color="#8B5CF6" />
            <Text style={styles.cardTitle}>Assignment</Text>
          </View>

          <View style={styles.assignmentBlock}>
            <Text style={styles.detailLabel}>VENDOR</Text>
            {data.vendor ? (
              <View style={styles.vendorBox}>
                <View style={styles.vendorHeaderRow}>
                  <Text style={styles.vendorName}>{data.vendor.name}</Text>
                  <View style={styles.companyTag}>
                    <Text style={styles.companyTagText}>Company / Firm</Text>
                  </View>
                </View>

                {data.vendor.rating != null && (
                  <View style={styles.ratingRow}>
                    <Icon name="star" size={14} color="#F59E0B" />
                    <Text style={styles.ratingText}>{data.vendor.rating} • Active</Text>
                  </View>
                )}

                {data.vendor.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${data.vendor.phone}`)}
                    style={styles.phoneClickRow}
                  >
                    <Icon name="phone" size={13} color="#2563EB" />
                    <Text style={styles.detailLink}>{data.vendor.phone}</Text>
                  </TouchableOpacity>
                )}

                {data.vendor.email && (
                  <Text style={styles.detailValueSub}>{data.vendor.email}</Text>
                )}

                {data.vendor.assignedAt && (
                  <Text style={styles.assignedTimeText}>
                    Assigned {formatDateTime(data.vendor.assignedAt)}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.unassignedBox}>
                <Icon name="error-outline" size={18} color="#D97706" />
                <Text style={styles.unassignedText}>No vendor assigned yet.</Text>
              </View>
            )}

            <View style={{ marginTop: 12 }}>
              <Text style={styles.detailLabel}>TELECALLER</Text>
              {data.telecaller?.name ? (
                <View style={styles.vendorBox}>
                  <View style={styles.vendorHeaderRow}>
                    <Text style={styles.vendorName}>{data.telecaller.name}</Text>
                  </View>
                  {data.telecaller.phone ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(`tel:${data.telecaller.phone}`)}
                      style={styles.phoneClickRow}
                    >
                      <Icon name="phone" size={13} color="#2563EB" />
                      <Text style={styles.detailLink}>{data.telecaller.phone}</Text>
                    </TouchableOpacity>
                  ) : null}
                  {data.telecaller.email ? (
                    <Text style={styles.detailValueSub}>{data.telecaller.email}</Text>
                  ) : null}
                </View>
              ) : (
                <View style={styles.unassignedBox}>
                  <Icon name="error-outline" size={18} color="#D97706" />
                  <Text style={styles.unassignedText}>No telecaller assigned yet.</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* 3. Pricing & Payments Card */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithAction}>
            <View style={styles.cardTitleRow}>
              <Icon name="payments" size={18} color="#10B981" />
              <Text style={styles.cardTitle}>Pricing & Payments</Text>
            </View>
            {data.canProposePrice && (
              <TouchableOpacity
                style={styles.proposeBtn}
                onPress={() => setQuoteModalVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.proposeBtnText}>Propose Price</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Top Metric Cards: Vendor Cost & Margin */}
          <View style={styles.pricingMetricsRow}>
            <View style={styles.pricingMetricBox}>
              <Text style={styles.metricLabel}>VENDOR COST</Text>
              <Text style={styles.metricValue}>{formatInr(data.pricing.vendorCost)}</Text>
            </View>

            <View style={[styles.pricingMetricBox, data.pricing.margin < 0 ? styles.metricBoxDanger : styles.metricBoxSuccess]}>
              <Text style={styles.metricLabel}>MARGIN (BEFORE GST)</Text>
              <Text
                style={[
                  styles.metricValue,
                  { color: data.pricing.margin < 0 ? '#DC2626' : '#059669' },
                ]}
              >
                {formatInr(data.pricing.margin)}
              </Text>
            </View>
          </View>

          {/* Breakdown Table */}
          <View style={styles.pricingList}>
            <View style={styles.pricingRowItem}>
              <Text style={styles.pricingItemLabel}>Customer Price</Text>
              <Text style={styles.pricingItemValue}>{formatInr(data.pricing.customerPrice)}</Text>
            </View>

            <View style={styles.pricingRowItem}>
              <Text style={styles.pricingItemLabel}>Express Surcharge</Text>
              <Text style={styles.pricingItemValue}>{formatInr(data.pricing.expressSurcharge)}</Text>
            </View>

            <View style={[styles.pricingRowItem, styles.pricingTotalRowItem]}>
              <Text style={styles.pricingTotalItemLabel}>Total</Text>
              <Text style={styles.pricingTotalItemValue}>{formatInr(data.pricing.totalAmount)}</Text>
            </View>

            {data.pricing.pendingAdditionalCharge ? (
              <View style={[styles.pricingRowItem, styles.pricingPendingRowItem]}>
                <Text style={styles.pricingPendingLabel}>Additional Charge (pending)</Text>
                <Text style={styles.pricingPendingValue}>
                  {formatInr(data.pricing.pendingAdditionalCharge.amount)}
                  {data.pricing.pendingAdditionalCharge.displayAmount != null
                    ? ` ($${data.pricing.pendingAdditionalCharge.displayAmount})`
                    : ''}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Additional Payment Requests Section */}
          {data.additionalPaymentRequests && data.additionalPaymentRequests.length > 0 && (
            <View style={styles.additionalPaymentsSection}>
              <Text style={styles.additionalPaymentsTitle}>Additional Payment Requests</Text>
              {data.additionalPaymentRequests.map((req, idx) => (
                <View key={req.id || idx} style={styles.additionalPaymentItem}>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>
                      {req.status ? req.status.charAt(0).toUpperCase() + req.status.slice(1) : 'Pending'}
                    </Text>
                  </View>
                  <Text style={styles.additionalPaymentText}>
                    {formatInr(req.amount)}
                    {req.displayAmount != null ? ` ($${req.displayAmount})` : ''}
                    {req.reason ? ` — ${req.reason}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 4. Vendor Report Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="assignment-turned-in" size={18} color="#059669" />
            <Text style={styles.cardTitle}>Vendor Report</Text>
          </View>

          {data.report ? (
            <View style={styles.reportContent}>
              {/* Report Header: Vendor & Timestamps */}
              <View style={styles.reportHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.reportVendorName}>
                    {data.report.vendor?.businessName || data.vendor?.name || 'Assigned Vendor'}
                  </Text>
                  {data.report.submittedAt && (
                    <Text style={styles.reportDateText}>
                      Submitted {formatDateTime(data.report.submittedAt)}
                    </Text>
                  )}
                </View>

                {data.report.sentToCustomerAt ? (
                  <View style={styles.sentBadge}>
                    <Icon name="check-circle" size={12} color="#059669" />
                    <Text style={styles.sentBadgeText}>Sent to Customer</Text>
                  </View>
                ) : data.report.reviewedAt ? (
                  <View style={styles.reviewedBadge}>
                    <Icon name="done-all" size={12} color="#2563EB" />
                    <Text style={styles.reviewedBadgeText}>Reviewed</Text>
                  </View>
                ) : null}
              </View>

              {/* Report Text */}
              {data.report.reportText ? (
                <View style={styles.reportTextBox}>
                  <Text style={styles.reportTextLabel}>REPORT NOTES</Text>
                  <Text style={styles.reportTextBody}>{data.report.reportText}</Text>
                </View>
              ) : null}

              {/* Media & Attachments */}
              {data.report.media && data.report.media.length > 0 && (
                <View style={styles.reportMediaSection}>
                  <Text style={styles.reportMediaLabel}>ATTACHED MEDIA & DOCUMENTS</Text>
                  <View style={styles.reportMediaRow}>
                    {data.report.media.map((url, idx) => {
                      const isPdf = typeof url === 'string' && /\.pdf(\?|$)/i.test(url);
                      return (
                        <TouchableOpacity
                          key={idx}
                          style={styles.pdfThumb}
                          onPress={() => openAttachment(url)}
                          activeOpacity={0.7}
                        >
                          <Icon name={isPdf ? 'picture-as-pdf' : 'image'} size={26} color="#64748B" />
                          <Text style={styles.pdfThumbText}>{isPdf ? 'PDF' : 'IMG'}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyReportBox}>
              <Icon name="assignment-late" size={24} color="#94A3B8" />
              <Text style={styles.emptyReportText}>No vendor report submitted yet.</Text>
            </View>
          )}
        </View>
      </ScrollView>
      ) : (
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
      >
        {/* 5. Vendor Chat */}
        <View style={styles.card}>
          <View style={styles.cardHeaderWithAction}>
            <View style={styles.cardTitleRow}>
              <Icon name="chat" size={18} color="#6366F1" />
              <Text style={styles.cardTitle}>Vendor Chat</Text>
            </View>
            <View style={styles.privateTag}>
              <Icon name="lock" size={11} color="#6366F1" />
              <Text style={styles.privateTagText}>Private</Text>
            </View>
          </View>
          <Text style={styles.staffOnlyNotice}>
            Private chat with {data.vendor?.name || data.report?.vendor?.businessName || 'Vendor'} — the customer cannot see it.
          </Text>

          {data.vendorChat.length === 0 ? (
            <View style={styles.emptyChatBox}>
              <Icon name="chat-bubble-outline" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation with the vendor.</Text>
            </View>
          ) : (
            <View style={styles.chatThread}>
              {data.vendorChat.map(msg => {
                const isStaff = msg.senderRole === 'staff' || msg.senderSide === 'staff';
                return (
                  <View
                    key={msg.id}
                    style={[styles.chatBubble, isStaff ? styles.chatBubbleStaff : styles.chatBubbleVendor]}
                  >
                    <Text style={styles.chatSenderName}>{msg.senderName}</Text>
                    <Text style={styles.chatMessageText}>{msg.message}</Text>
                    {msg.createdAt && (
                      <Text style={styles.chatTimeText}>{formatDateTime(msg.createdAt)}</Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {(data.vendor || data.report?.vendor || data.vendorChat.length > 0) && (
            <View style={styles.chatInputRow}>
              <TextInput
                style={styles.chatInput}
                placeholder="Message the vendor..."
                placeholderTextColor="#94A3B8"
                value={vendorChatMessage}
                onChangeText={setVendorChatMessage}
              />
              <TouchableOpacity
                style={styles.sendChatBtn}
                onPress={handleSendVendorChat}
                disabled={sendingChat || !vendorChatMessage.trim()}
              >
                {sendingChat ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Icon name="send" size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 6. Call History */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="phone-in-talk" size={18} color="#0EA5E9" />
            <Text style={styles.cardTitle}>Call History ({data.callLogs.length})</Text>
          </View>

          {data.callLogs.length === 0 ? (
            <Text style={styles.emptyTextSub}>No calls logged for this request yet.</Text>
          ) : (
            <View style={styles.callLogsList}>
              {data.callLogs.map(call => {
                const partyName = call.partyName || call.title || 'Vendor';
                const callerName = call.byName || call.by?.name;

                return (
                  <View key={call.id} style={styles.callLogItem}>
                    <View style={styles.callLogIconBg}>
                      <Icon name="call" size={16} color="#0EA5E9" />
                    </View>
                    <View style={styles.callLogInfo}>
                      <View style={styles.callLogHeaderRow}>
                        <Text style={styles.callLogTitle}>{partyName}</Text>
                        {call.outcomeLabel ? (
                          <View style={styles.callOutcomeBadge}>
                            <Text style={styles.callOutcomeText}>{call.outcomeLabel}</Text>
                          </View>
                        ) : null}
                      </View>
                      {call.purposeLabel && call.purposeLabel !== partyName ? (
                        <Text style={styles.callLogPurpose}>{call.purposeLabel}</Text>
                      ) : null}
                      {call.note && <Text style={styles.callLogNote}>{call.note}</Text>}
                      <Text style={styles.callLogMeta}>
                        {callerName ? `by ${callerName} • ` : ''}{formatDateTime(call.createdAt)} {call.duration ? `(${call.duration})` : ''}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* 7. Internal Notes (staff only) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="note-add" size={18} color="#64748B" />
            <Text style={styles.cardTitle}>Internal Notes (staff only)</Text>
          </View>

          {data.internalNotes.length === 0 ? (
            <Text style={styles.emptyTextSub}>No internal notes yet.</Text>
          ) : (
            <View style={styles.notesList}>
              {data.internalNotes.map(n => (
                <View key={n.id} style={styles.noteItem}>
                  <Text style={styles.noteText}>{n.note}</Text>
                  <Text style={styles.noteMeta}>
                    {n.author} {n.createdAt ? `• ${formatDateTime(n.createdAt)}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.addNoteRow}>
            <TextInput
              style={styles.noteInput}
              placeholder="Add an internal note..."
              placeholderTextColor="#94A3B8"
              value={newNote}
              onChangeText={setNewNote}
            />
            <TouchableOpacity
              style={styles.addNoteBtn}
              onPress={handleAddNote}
              disabled={addingNote || !newNote.trim()}
            >
              {addingNote ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.addNoteBtnText}>Add</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      )}

      {/* History Modal */}
      <Modal
        visible={historyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setHistoryModalVisible(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Status History</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Icon name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }} contentContainerStyle={{ padding: 16 }}>
              {data.statusHistory.map((h, i) => (
                <View key={i} style={styles.historyModalItem}>
                  <View style={styles.historyDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyModalStatus}>{h.label}</Text>
                    {h.changedBy ? <Text style={styles.historyModalBy}>By {h.changedBy}</Text> : null}
                    {h.comment ? <Text style={styles.historyModalComment}>{h.comment}</Text> : null}
                    <Text style={styles.historyModalDate}>{formatDateTime(h.changedAt)}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Quote Proposal Modal */}
      <Modal
        visible={quoteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuoteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardAvoidingWrap}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setQuoteModalVisible(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Propose Quoted Price</Text>
                <TouchableOpacity onPress={() => setQuoteModalVisible(false)}>
                  <Icon name="close" size={24} color="#64748B" />
                </TouchableOpacity>
              </View>
              <View style={{ padding: 16, gap: 12 }}>
                <Text style={styles.quoteModalPrompt}>Enter proposed price for this custom service:</Text>
                <TextInput
                  style={styles.quoteInput}
                  placeholder="Amount in INR (₹)"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={quoteAmount}
                  onChangeText={setQuoteAmount}
                />
                <TextInput
                  style={[styles.quoteInput, { height: 70, textAlignVertical: 'top' }]}
                  placeholder="Reason / breakdown..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={quoteReason}
                  onChangeText={setQuoteReason}
                />
                <TouchableOpacity
                  style={styles.quoteSubmitBtn}
                  onPress={handleProposeQuote}
                  disabled={submittingQuote}
                >
                  {submittingQuote ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.quoteSubmitBtnText}>Submit Proposal</Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      {attachmentPreview}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  creamBodyLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    color: '#64748B',
    marginTop: 14,
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 14,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    lineHeight: 18,
  },
  retryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 24,
    backgroundColor: '#20304C',
    borderRadius: 8,
    marginBottom: 10,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  backBtnAlt: {
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  backBtnAltText: {
    color: '#94A3B8',
    fontSize: 13,
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#20304C',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    marginLeft: 5,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.h3.fontFamily,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 36,
  },
  detailColFull: {
    width: '100%',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 4,
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 80,
    gap: 12,
  },

  stepperWrap: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 2,
    gap: 8,
    backgroundColor: '#F8FAFC',
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabBtnActive: {
    backgroundColor: '#EFF4FB',
    borderColor: '#20304C',
  },
  tabBtnText: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
  },
  tabBtnTextActive: {
    color: '#20304C',
  },

  stepperCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepItem: {
    flex: 1,
    alignItems: 'center',
  },
  stepIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
  },
  stepLineActive: {
    backgroundColor: '#059669',
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  stepDotActive: {
    backgroundColor: '#059669',
  },
  stepDotCurrent: {
    borderWidth: 2,
    borderColor: '#A7F3D0',
  },
  stepDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  stepLabel: {
    fontSize: 9,
    fontFamily: typography.tiny.fontFamily,
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#059669',
    fontFamily: typography.labelMedium.fontFamily,
  },
  historyLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 4,
  },
  historyLinkText: {
    fontSize: 11,
    color: '#3B82F6',
    fontFamily: typography.labelMedium.fontFamily,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: typography.h4.fontFamily,
    color: '#1E293B',
  },
  cardHeaderWithAction: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  proposeBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  proposeBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 12,
  },
  detailCol: {
    width: '50%',
    paddingRight: 6,
  },
  detailLabel: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValueBold: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  detailValue: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#334155',
  },
  detailValueSub: {
    fontSize: 11,
    fontFamily: typography.small.fontFamily,
    color: '#64748B',
    marginTop: 1,
  },
  phoneClickRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailLink: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#2563EB',
  },

  assignmentBlock: {
    gap: 8,
  },
  vendorBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  vendorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  vendorName: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  companyTag: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  companyTagText: {
    color: '#2563EB',
    fontSize: 9,
    fontFamily: typography.labelMedium.fontFamily,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#64748B',
  },
  assignedTimeText: {
    fontSize: 10,
    fontFamily: typography.small.fontFamily,
    color: '#94A3B8',
    marginTop: 4,
  },
  unassignedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFBEB',
    padding: 10,
    borderRadius: 8,
    gap: 6,
    marginTop: 4,
  },
  unassignedText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D97706',
  },

  pricingMetricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  pricingMetricBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  metricBoxDanger: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  metricBoxSuccess: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  metricLabel: {
    fontSize: 9,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#64748B',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
  },

  pricingList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  pricingRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pricingItemLabel: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: '#475569',
  },
  pricingItemValue: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  pricingTotalRowItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: 2,
    marginBottom: 2,
  },
  pricingTotalItemLabel: {
    fontSize: 14,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
  },
  pricingTotalItemValue: {
    fontSize: 15,
    fontFamily: typography.h3.fontFamily,
    color: '#0F172A',
  },
  pricingPendingRowItem: {
    borderBottomWidth: 0,
    paddingTop: 8,
  },
  pricingPendingLabel: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#EA580C',
  },
  pricingPendingValue: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#EA580C',
  },

  additionalPaymentsSection: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  additionalPaymentsTitle: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  additionalPaymentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pendingBadge: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  pendingBadgeText: {
    color: '#EA580C',
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
  },
  additionalPaymentText: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#334155',
    flex: 1,
  },

  reportContent: {
    gap: 10,
    marginTop: 4,
  },
  reportHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  reportVendorName: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  reportDateText: {
    fontSize: 11,
    fontFamily: typography.small.fontFamily,
    color: '#64748B',
    marginTop: 2,
  },
  sentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  sentBadgeText: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#059669',
  },
  reviewedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  reviewedBadgeText: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#2563EB',
  },

  reportTextBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reportTextLabel: {
    fontSize: 9,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reportTextBody: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: '#334155',
    lineHeight: 18,
  },

  reportMediaSection: {
    marginTop: 4,
  },
  reportMediaLabel: {
    fontSize: 9,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  reportMediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  pdfThumb: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
  },
  pdfThumbText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#64748B',
  },

  emptyReportBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 6,
  },
  emptyReportText: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#94A3B8',
  },

  staffOnlyNotice: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: '#94A3B8',
    marginBottom: 8,
  },

  privateTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  privateTagText: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#6366F1',
  },
  emptyChatBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyChatText: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: '#94A3B8',
    textAlign: 'center',
  },
  chatThread: {
    gap: 8,
    marginBottom: 8,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '85%',
  },
  chatBubbleStaff: {
    backgroundColor: '#EEF2FF',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  chatBubbleVendor: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  chatSenderName: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#64748B',
    marginBottom: 2,
  },
  chatMessageText: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#0F172A',
  },
  chatTimeText: {
    fontSize: 9,
    fontFamily: typography.tiny.fontFamily,
    color: '#94A3B8',
    marginTop: 3,
    alignSelf: 'flex-end',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#0F172A',
  },
  sendChatBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#6366F1',
    justifyContent: 'center',
    alignItems: 'center',
  },

  callLogsList: {
    gap: 8,
  },
  callLogItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  callLogIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callLogInfo: {
    flex: 1,
  },
  callLogHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  callLogTitle: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    flex: 1,
  },
  callOutcomeBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  callOutcomeText: {
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#059669',
  },
  callLogPurpose: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0284C7',
    marginTop: 2,
  },
  callLogNote: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: '#475569',
    marginTop: 2,
  },
  callLogMeta: {
    fontSize: 10,
    fontFamily: typography.small.fontFamily,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyTextSub: {
    fontSize: 11,
    fontFamily: typography.body.fontFamily,
    color: '#94A3B8',
  },

  notesList: {
    gap: 6,
    marginBottom: 8,
  },
  noteItem: {
    backgroundColor: '#F8FAFC',
    padding: 8,
    borderRadius: 6,
  },
  noteText: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#334155',
  },
  noteMeta: {
    fontSize: 10,
    fontFamily: typography.small.fontFamily,
    color: '#94A3B8',
    marginTop: 2,
  },
  addNoteRow: {
    flexDirection: 'row',
    gap: 6,
  },
  noteInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 5,
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#0F172A',
  },
  addNoteBtn: {
    backgroundColor: '#20304C',
    borderRadius: 6,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNoteBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
  },

  keyboardAvoidingWrap: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
  },
  historyModalItem: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#3B82F6',
    marginTop: 4,
  },
  historyModalStatus: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
  },
  historyModalBy: {
    fontSize: 11,
    fontFamily: typography.small.fontFamily,
    color: '#64748B',
  },
  historyModalComment: {
    fontSize: 12,
    fontFamily: typography.body.fontFamily,
    color: '#334155',
    marginTop: 2,
  },
  historyModalDate: {
    fontSize: 10,
    fontFamily: typography.tiny.fontFamily,
    color: '#94A3B8',
    marginTop: 2,
  },

  quoteModalPrompt: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: '#475569',
  },
  quoteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: '#0F172A',
  },
  quoteSubmitBtn: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  quoteSubmitBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
  },
});

export default TicketDetail;
