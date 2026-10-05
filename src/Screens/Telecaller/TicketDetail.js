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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import {
  getTelecallerServiceRequestDetail,
  addTelecallerRequestNote,
  sendTelecallerVendorChatMessage,
  proposeTelecallerQuotedPrice,
  submitTelecallerCustomerFeedback,
} from '../../Api/Telecaller/telecallerRequestsApi';

function formatInr(val) {
  const num = Number(val || 0);
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

function getTimelineProgressIndex(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('report') || s.includes('closed')) return 4;
  if (s.includes('complet') || s.includes('resolv')) return 3;
  if (s.includes('progress') || s.includes('active')) return 2;
  if (s.includes('assign')) return 1;
  return 0;
}

function TicketDetail({ route, navigation }) {
  const ticketId = route.params?.ticketId || route.params?.id || route.params?.ticket;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

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

  // Feedback rating state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      setError(null);
      const res = await getTelecallerServiceRequestDetail(ticketId);
      setData(res);
      if (res.feedback) {
        setFeedbackRating(res.feedback.rating || 5);
        setFeedbackNote(res.feedback.note || '');
      }
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

  // Submit feedback
  const handleSubmitFeedback = async () => {
    try {
      setSubmittingFeedback(true);
      await submitTelecallerCustomerFeedback(ticketId, {
        rating: feedbackRating,
        note: feedbackNote.trim(),
      });
      Alert.alert('Success', 'Customer feedback recorded.');
      fetchDetail(true);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to submit feedback');
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
        <ActivityIndicator size="large" color="#A64416" />
        <Text style={styles.loadingText}>Loading request details...</Text>
      </View>
    );
  }

  if (error || !data) {
    return (
      <View style={styles.centerContainer}>
        <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
        <Icon name="error-outline" size={48} color="#DC2626" />
        <Text style={styles.errorTitle}>Could not load request</Text>
        <Text style={styles.errorSubtitle}>{error || 'Request not found'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetail()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.backBtnAlt} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnAltText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusStyle = getStatusStyle(data.status);
  const currentStepIdx = getTimelineProgressIndex(data.status);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header Bar */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <View style={styles.headerTextWrap}>
            <View style={styles.ticketTitleRow}>
              <Text style={styles.ticketIdText}>{data.ticketNumber}</Text>
              <View style={[styles.headerStatusPill, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.headerStatusText, { color: statusStyle.text }]}>{data.statusLabel}</Text>
              </View>
              <View style={styles.headerUrgencyPill}>
                <Text style={styles.headerUrgencyText}>{data.urgencyLabel}</Text>
              </View>
            </View>
            <Text style={styles.headerServiceName} numberOfLines={2}>
              {data.serviceName}
            </Text>
            <Text style={styles.headerDateText}>
              Created {formatDateTime(data.createdAt)}
            </Text>
          </View>

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="arrow-back" size={18} color="#FFFFFF" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#A64416']} />}
      >
        {/* Status Stepper Tracker */}
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

        {/* 1. Request Details Card */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="receipt" size={18} color="#3B82F6" />
            <Text style={styles.cardTitle}>Request Details</Text>
          </View>

          <View style={styles.detailsGrid}>
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
              <Text style={styles.detailValueBold}>
                {data.telecaller?.name || 'Telecaller'}
              </Text>
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

          <View style={styles.pricingTable}>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Customer Price</Text>
              <Text style={styles.pricingVal}>{formatInr(data.pricing.customerPrice)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Vendor Cost</Text>
              <Text style={styles.pricingVal}>{formatInr(data.pricing.vendorCost)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Express Surcharge</Text>
              <Text style={styles.pricingVal}>{formatInr(data.pricing.expressSurcharge)}</Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>Margin</Text>
              <Text style={[styles.pricingVal, { color: '#059669', fontWeight: '700' }]}>
                {formatInr(data.pricing.margin)} (before GST)
              </Text>
            </View>
            <View style={styles.pricingRow}>
              <Text style={styles.pricingLabel}>GST ({data.pricing.gstPercent}%)</Text>
              <Text style={styles.pricingVal}>{formatInr(data.pricing.gst)}</Text>
            </View>
            <View style={[styles.pricingRow, styles.pricingTotalRow]}>
              <Text style={styles.pricingTotalLabel}>Total</Text>
              <Text style={styles.pricingTotalVal}>{formatInr(data.pricing.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* 4. Customer Feedback (Staff Only) */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Icon name="rate-review" size={18} color="#EA580C" />
            <Text style={styles.cardTitle}>Customer Feedback (Staff Only)</Text>
          </View>
          <Text style={styles.staffOnlyNotice}>Internal only — never visible to this customer.</Text>

          {data.feedback ? (
            <View style={styles.feedbackDisplayBox}>
              <View style={styles.feedbackStarRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <Icon
                    key={star}
                    name={star <= data.feedback.rating ? 'star' : 'star-border'}
                    size={20}
                    color="#F59E0B"
                  />
                ))}
                <Text style={styles.feedbackRatingNumber}>{data.feedback.rating}/5</Text>
              </View>
              {data.feedback.note && (
                <Text style={styles.feedbackNoteText}>"{data.feedback.note}"</Text>
              )}
            </View>
          ) : (
            <View style={styles.feedbackForm}>
              <Text style={styles.feedbackPrompt}>Rate customer experience:</Text>
              <View style={styles.feedbackStarInputRow}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity key={star} onPress={() => setFeedbackRating(star)}>
                    <Icon
                      name={star <= feedbackRating ? 'star' : 'star-border'}
                      size={28}
                      color="#F59E0B"
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput
                style={styles.inputArea}
                placeholder="Add internal feedback note..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={2}
                value={feedbackNote}
                onChangeText={setFeedbackNote}
              />
              <TouchableOpacity
                style={styles.submitFeedbackBtn}
                onPress={handleSubmitFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitFeedbackBtnText}>Save Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

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
            Private chat with {data.vendor?.name || 'Vendor'} — the customer cannot see it.
          </Text>

          {data.vendorChat.length === 0 ? (
            <View style={styles.emptyChatBox}>
              <Icon name="chat-bubble-outline" size={28} color="#CBD5E1" />
              <Text style={styles.emptyChatText}>No messages yet. Start the conversation with the vendor.</Text>
            </View>
          ) : (
            <View style={styles.chatThread}>
              {data.vendorChat.map(msg => {
                const isStaff = msg.senderRole === 'staff';
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

          {data.vendor && (
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
              {data.callLogs.map(call => (
                <View key={call.id} style={styles.callLogItem}>
                  <View style={styles.callLogIconBg}>
                    <Icon name="call" size={16} color="#0EA5E9" />
                  </View>
                  <View style={styles.callLogInfo}>
                    <Text style={styles.callLogTitle}>{call.title}</Text>
                    {call.note && <Text style={styles.callLogNote}>{call.note}</Text>}
                    <Text style={styles.callLogMeta}>
                      {call.targetName} • {formatDateTime(call.createdAt)} {call.duration ? `(${call.duration})` : ''}
                    </Text>
                  </View>
                </View>
              ))}
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

      {/* History Modal */}
      <Modal visible={historyModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
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
          </View>
        </View>
      </Modal>

      {/* Quote Proposal Modal */}
      <Modal visible={quoteModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
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
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    color: '#CBD5E1',
    marginTop: 12,
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#EF4444',
    marginTop: 12,
  },
  errorSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  retryBtn: {
    paddingVertical: 8,
    paddingHorizontal: 20,
    backgroundColor: '#A64416',
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
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  ticketTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ticketIdText: {
    fontSize: 18,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  headerStatusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  headerStatusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  headerUrgencyPill: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  headerUrgencyText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '600',
  },
  headerServiceName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E2E8F0',
    marginTop: 2,
  },
  headerDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  backBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 80,
    gap: 12,
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
    color: '#94A3B8',
    marginTop: 4,
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#059669',
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValueBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  detailValue: {
    fontSize: 12,
    color: '#334155',
  },
  detailValueSub: {
    fontSize: 11,
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
    color: '#2563EB',
    fontWeight: '600',
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
    fontWeight: '700',
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
    fontWeight: '600',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  ratingText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  assignedTimeText: {
    fontSize: 10,
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
    color: '#D97706',
    fontWeight: '600',
  },

  pricingTable: {
    gap: 6,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  pricingLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  pricingVal: {
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
  },
  pricingTotalRow: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pricingTotalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  pricingTotalVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },

  staffOnlyNotice: {
    fontSize: 11,
    color: '#94A3B8',
    marginBottom: 8,
  },
  feedbackDisplayBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
  },
  feedbackStarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  feedbackRatingNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 6,
  },
  feedbackNoteText: {
    fontSize: 12,
    color: '#475569',
    fontStyle: 'italic',
    marginTop: 6,
  },
  feedbackForm: {
    gap: 8,
  },
  feedbackPrompt: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  feedbackStarInputRow: {
    flexDirection: 'row',
    gap: 6,
  },
  inputArea: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 8,
    fontSize: 12,
    color: '#0F172A',
    textAlignVertical: 'top',
  },
  submitFeedbackBtn: {
    backgroundColor: '#EA580C',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
  },
  submitFeedbackBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 2,
  },
  chatMessageText: {
    fontSize: 12,
    color: '#0F172A',
  },
  chatTimeText: {
    fontSize: 9,
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
  callLogTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
  },
  callLogNote: {
    fontSize: 11,
    color: '#475569',
    marginTop: 2,
  },
  callLogMeta: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
  emptyTextSub: {
    fontSize: 11,
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
    color: '#334155',
  },
  noteMeta: {
    fontSize: 10,
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
    fontWeight: '700',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
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
    fontWeight: '700',
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
    fontWeight: '700',
    color: '#0F172A',
  },
  historyModalBy: {
    fontSize: 11,
    color: '#64748B',
  },
  historyModalComment: {
    fontSize: 12,
    color: '#334155',
    marginTop: 2,
  },
  historyModalDate: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },

  quoteModalPrompt: {
    fontSize: 13,
    color: '#475569',
  },
  quoteInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 10,
    fontSize: 13,
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
    fontWeight: '700',
  },
});

export default TicketDetail;
