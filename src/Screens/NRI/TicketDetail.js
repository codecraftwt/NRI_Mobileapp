import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, TextInput, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { pick, types as pickerTypes, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useAttachmentViewer } from '../../Components/useAttachmentViewer';
import { useTicketDetail } from '../../Hooks/useTicketDetail';
import { useReports } from '../../Hooks/useReports';
import { getTicketSupportChat } from '../../Api/ticketApi';
import { fulfillDocumentRequest } from '../../Api/supportTicketApi';
import { resolveLocalCopies } from '../../Utils/localFileCopy';
import { typography } from '../../theme/typography';
import { STATUS_BAR_HEIGHT } from '../../theme/spacing';

const MAX_DOC_FILES = 5;
const MAX_DOC_SIZE_BYTES = 5 * 1024 * 1024;

// Ticket amounts (total, base, add-ons, surcharge, discount) are USD, same as
// the booking flow — format with $ instead of the old ₹.
const formatUsd = (value) =>
  `$${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// gst_rate may arrive as a fraction (0.18) or whole percent (18) — normalize
// to a "GST (18%)" label.
const formatGstLabel = (rate) => {
  if (rate == null) return 'GST';
  const pct = rate <= 1 ? rate * 100 : rate;
  const rounded = Number.isInteger(pct) ? pct : Number(pct.toFixed(2));
  return `GST (${rounded}%)`;
};

function getStatusColor(statusLabel) {
  switch (statusLabel?.toUpperCase()) {
    case 'NEW': return { bg: '#E0F2FE', text: '#0284C7' };
    case 'ASSIGNED': return { bg: '#FEF9C3', text: '#CA8A04' };
    case 'IN PROGRESS':
    case 'IN_PROGRESS': return { bg: '#DCFCE7', text: '#16A34A' };
    case 'IN REVIEW':
    case 'IN_REVIEW': return { bg: '#E0E7FF', text: '#4338CA' };
    case 'COMPLETED': return { bg: '#E0F2FE', text: '#0284C7' };
    case 'CANCELLED': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#F1F5F9', text: '#475569' };
  }
}

function getUrgencyLabel(urgency) {
  if (!urgency) return '';
  return urgency.charAt(0).toUpperCase() + urgency.slice(1);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getTime() < Date.now();
}

function TicketDetail({ route, navigation }) {
  const { ticketId } = route.params || {};
  const { detail: ticket, loading, failed, retry, rate, rateLoading } = useTicketDetail(ticketId);
  const { reports, loading: reportsLoading, failed: reportsFailed, retry: retryReports } = useReports();
  const report = (ticket && reports.find(r => r.ticketNumber === ticket.ticketNumber)) || ticket?.report || null;
  const { openAttachment, preview: attachmentPreview } = useAttachmentViewer();
  const { showAlert, alertProps } = useAppAlert();

  const [refreshing, setRefreshing] = useState(false);
  const [supportChatReplies, setSupportChatReplies] = useState([]);
  const [pendingDocFiles, setPendingDocFiles] = useState({});
  const [uploadingDocId, setUploadingDocId] = useState(null);

  const fetchSupportChat = useCallback(async () => {
    if (!ticketId) return;
    try {
      const res = await getTicketSupportChat(ticketId);
      setSupportChatReplies(res?.replies || []);
    } catch (e) {
      // Chat may not exist yet or request failed; silent fallback
    }
  }, [ticketId]);

  useEffect(() => {
    fetchSupportChat();
  }, [fetchSupportChat]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retry(), retryReports(), fetchSupportChat()]);
    setRefreshing(false);
  };

  // Extract latest state of each document request from support chat & ticket detail
  const documentRequests = useMemo(() => {
    const map = new Map();
    for (const dr of ticket?.documentRequests || []) {
      if (dr && dr.id != null) {
        map.set(dr.id, {
          ...dr,
          requestedAt: dr.createdAt || dr.requestedAt || null,
          uploadedAt: dr.fulfilledAt || dr.uploadedAt || null,
        });
      }
    }
    for (const reply of supportChatReplies) {
      const dr = reply?.documentRequest;
      if (dr && dr.id != null) {
        const existing = map.get(dr.id);
        const isUploadReply = String(reply.message || '').toLowerCase().includes('upload') || (dr.files && dr.files.length > 0);
        const requestedAt = existing?.requestedAt || (!isUploadReply ? reply.createdAt : null) || dr.createdAt;
        const uploadedAt = dr.fulfilledAt || (isUploadReply ? reply.createdAt : null) || existing?.uploadedAt;

        if (!existing || dr.isLatest || (dr.files && dr.files.length > 0)) {
          map.set(dr.id, {
            ...existing,
            ...dr,
            label: dr.label || existing?.label || 'Document',
            requestedAt,
            uploadedAt,
            authorName: reply.authorName || existing?.authorName,
            replyCreatedAt: reply.createdAt || existing?.replyCreatedAt,
            replyMessage: reply.message || existing?.replyMessage,
            files: (dr.files && dr.files.length > 0) ? dr.files : (existing?.files || []),
          });
        }
      }
    }
    return Array.from(map.values());
  }, [supportChatReplies, ticket?.documentRequests]);

  const handlePickDocFiles = async (documentRequestId) => {
    try {
      const results = await pick({
        type: [pickerTypes.images, pickerTypes.pdf],
        allowMultiSelection: true,
      });
      const tooMany = results.length > MAX_DOC_FILES;
      const candidates = results.slice(0, MAX_DOC_FILES);
      const oversized = candidates.filter(f => f.size && f.size > MAX_DOC_SIZE_BYTES);
      const accepted = (await resolveLocalCopies(
        candidates.filter(f => !f.size || f.size <= MAX_DOC_SIZE_BYTES),
      )).map(f => ({ name: f.name, uri: f.uri, type: f.type, size: f.size }));
      if (oversized.length > 0) {
        showAlert('File Too Large', `${oversized.length} file(s) were skipped for exceeding 5 MB.`);
      } else if (tooMany) {
        showAlert('Limit Reached', `Only the first ${MAX_DOC_FILES} file(s) were kept (max ${MAX_DOC_FILES}).`);
      }
      if (accepted.length) setPendingDocFiles(prev => ({ ...prev, [documentRequestId]: accepted }));
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      showAlert('Error', 'Could not select the file(s). Please try again.');
    }
  };

  const handleUploadDocFiles = async (documentRequestId) => {
    const files = pendingDocFiles[documentRequestId];
    if (!files?.length || uploadingDocId) return;
    setUploadingDocId(documentRequestId);
    try {
      await fulfillDocumentRequest(documentRequestId, files);
      setPendingDocFiles(prev => { const next = { ...prev }; delete next[documentRequestId]; return next; });
      await Promise.all([retry(), fetchSupportChat()]);
      showAlert('Success', 'Document(s) uploaded successfully.');
    } catch (error) {
      const msg = error?.status === 422
        ? 'This request has already been fulfilled. Please wait for the vendor to reopen it.'
        : error?.message || 'Please try again.';
      showAlert('Could Not Upload', msg);
    } finally {
      setUploadingDocId(null);
    }
  };

  const [selectedStars, setSelectedStars] = useState(0);
  const [feedbackNote, setFeedbackNote] = useState('');
  const [thankYouVisible, setThankYouVisible] = useState(false);

  const handleSubmitRating = async () => {
    if (!selectedStars) {
      showAlert('Select a Rating', 'Please tap a star to rate this service.');
      return;
    }
    try {
      await rate(selectedStars, feedbackNote.trim() || undefined).unwrap();
      setThankYouVisible(true);
    } catch (error) {
      showAlert('Could Not Submit Rating', error?.message || 'Please try again.');
    }
  };

  const handleViewAttachment = (url) => {
    if (!url) return;
    openAttachment(url);
  };

  // Pay Now on the "Additional Payment Requested" card hands off to a
  // dedicated breakdown + gateway-picker screen (mirrors CustomPlanPayment.js)
  // rather than starting checkout inline. TicketDetail's own useFocusEffect
  // below already refetches on every focus, so simply returning here (goBack)
  // after a successful payment is enough to clear this card.
  const handlePayNowPress = () => {
    if (!ticket?.pendingAdditionalCharge) return;
    const addonsTotalForNav = ticket.addons.reduce((sum, a) => sum + Number(a.customerPrice || 0), 0);
    navigation.navigate('AdditionalPaymentBreakdown', {
      ticketId: ticket.id,
      ticketNumber: ticket.ticketNumber,
      serviceName: ticket.serviceName,
      reason: ticket.pendingAdditionalCharge.reason,
      baseAmount: Math.max(0, Number(ticket.pricing?.customerPrice || 0) - addonsTotalForNav),
      alreadyPaidAmount: ticket.pricing?.totalAmount,
      additionalAmount: ticket.pendingAdditionalCharge.amount,
      additionalAmountInr: ticket.pendingAdditionalCharge.amountInr,
      additionalGstAmountInr: ticket.pendingAdditionalCharge.gstAmountInr,
      additionalTotalAmountInr: ticket.pendingAdditionalCharge.totalAmountInr,
      gstAmount: ticket.pricing?.amountDueGst,
      gstRate: ticket.pricing?.gstRate,
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (ticketId) {
        retry();
        fetchSupportChat();
      }
      retryReports();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ticketId, fetchSupportChat])
  );

  if (loading && !ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request Details" showBack />
        <View style={styles.emptyState}>
          <ActivityIndicator size="small" color="#D94625" />
          <Text style={styles.emptyText}>Loading request...</Text>
        </View>
      </View>
    );
  }

  if (failed) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request Details" showBack />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Couldn't load this request.</Text>
          <TouchableOpacity style={styles.backLink} onPress={retry}>
            <Text style={styles.backLinkText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!ticket) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Request Details" showBack />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Request not found.</Text>
          <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={16} color="#3B82F6" />
            <Text style={styles.backLinkText}>Back to My Requests</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const statusStyle = getStatusColor(ticket.statusLabel);
  const overdue = isOverdue(ticket.slaDeadline);
  const locationLine = ticket.location ? [ticket.location.taluka, ticket.location.city, ticket.location.state].filter(Boolean).join(', ') : '';
  const timeline = ticket.timeline.length ? ticket.timeline : [{ to: ticket.status, at: ticket.createdAt, note: 'Ticket created' }];
  const addonsTotal = ticket.addons.reduce((sum, a) => sum + Number(a.customerPrice || 0), 0);
  const baseAmount = Math.max(0, Number(ticket.pricing?.customerPrice || 0) - addonsTotal);

  // GST is charged at payment and baked into total_amount; the detail's pricing
  // often doesn't return gst_rate/gst_amount separately. Prefer the API's
  // values, otherwise derive: GST = total − (base + add-ons + surcharge − discount).
  const p = ticket.pricing || {};
  const preGstSubtotal = Number(p.customerPrice || 0) + Number(p.expressSurcharge || 0) - Number(p.discountAmount || 0);
  const gstAmount = p.gstAmount != null
    ? Number(p.gstAmount)
    : Math.max(0, Math.round((Number(p.totalAmount || 0) - preGstSubtotal) * 100) / 100);
  const gstRate = p.gstRate != null
    ? p.gstRate
    : (preGstSubtotal > 0 && gstAmount > 0 ? gstAmount / preGstSubtotal : null);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Header navigation={navigation} title={ticket.ticketNumber} showBack />
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid={false}
        extraScrollHeight={80}
        extraHeight={80}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >
        <View style={styles.card}>
          <View style={styles.topRow}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.badgeText, { color: statusStyle.text }]}>{ticket.statusLabel}</Text>
              </View>
              {!!ticket.urgency && (
                <View style={[styles.badge, styles.badgeNeutral]}>
                  <Text style={[styles.badgeText, styles.badgeTextNeutral]}>{getUrgencyLabel(ticket.urgency)}</Text>
                </View>
              )}
            </View>
            <View style={styles.submittedWrap}>
              <Text style={styles.hint}>Submitted</Text>
              <Text style={styles.submittedDate}>{formatDateTime(ticket.createdAt)}</Text>
            </View>
          </View>

          <Text style={styles.ticketId}>{ticket.ticketNumber}</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Service</Text>
              <Text style={styles.value}>{ticket.serviceName}</Text>
            </View>
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Vendor</Text>
              <Text style={styles.value}>{ticket.vendorName || 'Pending Assignment'}</Text>
            </View>
            {!!ticket.location?.address && (
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Location</Text>
                <Text style={styles.value}>{ticket.location.address}</Text>
                {!!locationLine && <Text style={styles.subValue}>{locationLine}</Text>}
              </View>
            )}
            {!!ticket.customerNotes && (
              <View style={styles.infoBlock}>
                <Text style={styles.label}>Notes</Text>
                <Text style={styles.value}>{ticket.customerNotes}</Text>
              </View>
            )}
          </View>

          {!!ticket.slaDeadline && (
            <View style={styles.infoBlock}>
              <Text style={styles.label}>Expected By (SLA)</Text>
              <View style={styles.slaRow}>
                <Text style={[styles.value, overdue && styles.overdueText]}>{formatDateTime(ticket.slaDeadline)}</Text>
                {overdue && (
                  <View style={styles.overdueBadge}>
                    <Text style={styles.overdueBadgeText}>Overdue</Text>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Documents requested by vendor */}
        {documentRequests.length > 0 && (
          <View style={styles.card}>
            <View style={styles.docsHeaderRow}>
              <View style={styles.docsTitleWrap}>
                <Icon name="upload-file" size={20} color="#2563EB" />
                <Text style={styles.docsSectionTitle}>Documents requested by vendor</Text>
              </View>
            </View>

            <View style={styles.docRequestsContainer}>
              {documentRequests.map((dr, index) => {
                const isFulfilled = String(dr.status || '').toLowerCase() === 'fulfilled';
                const requestedStr = dr.requestedAt ? formatDateTime(dr.requestedAt) : '';
                const uploadedStr = dr.uploadedAt ? formatDateTime(dr.uploadedAt) : '';
                let metaText = '';
                if (isFulfilled) {
                  if (requestedStr && uploadedStr) {
                    metaText = `Requested ${requestedStr} · uploaded ${uploadedStr}`;
                  } else if (uploadedStr) {
                    metaText = `Uploaded ${uploadedStr}`;
                  } else if (requestedStr) {
                    metaText = `Requested ${requestedStr}`;
                  }
                } else if (requestedStr) {
                  metaText = `Requested ${requestedStr}`;
                }

                const chosenFiles = pendingDocFiles[dr.id] || [];
                const isUploading = uploadingDocId === dr.id;

                return (
                  <View
                    key={dr.id ?? index}
                    style={[
                      styles.docItemBlock,
                      index > 0 && styles.docItemBorderTop,
                    ]}
                  >
                    <View style={styles.docItemTopRow}>
                      <Text style={styles.docItemTitle}>{dr.label || dr.name || 'Document'}</Text>
                      <View style={[styles.docStatusBadge, isFulfilled ? styles.docStatusFulfilled : styles.docStatusPending]}>
                        <Text style={[styles.docStatusBadgeText, isFulfilled ? styles.docStatusFulfilledText : styles.docStatusPendingText]}>
                          {isFulfilled ? 'Received' : 'Pending'}
                        </Text>
                      </View>
                    </View>

                    {!!metaText && (
                      <Text style={styles.docItemSubtitle}>{metaText}</Text>
                    )}

                    {isFulfilled && dr.files && dr.files.length > 0 && (
                      <View style={styles.docFileListRow}>
                        {dr.files.map((f, idx) => {
                          const fileUrl = typeof f === 'string' ? f : f?.url;
                          const fileName = (typeof f === 'object' && f?.name) ? f.name : `File ${idx + 1}`;
                          return (
                            <TouchableOpacity
                              key={fileUrl || idx}
                              style={styles.docFilePill}
                              onPress={() => handleViewAttachment(fileUrl || f)}
                              activeOpacity={0.7}
                              disabled={!fileUrl}
                            >
                              <Icon name="attach-file" size={15} color="#2563EB" />
                              <Text style={styles.docFilePillText}>File {idx + 1}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    )}

                    {!isFulfilled && (
                      <View style={styles.docUploadSection}>
                        <View style={styles.docUploadRow}>
                          <TouchableOpacity
                            style={styles.docPickerBox}
                            onPress={() => handlePickDocFiles(dr.id)}
                            activeOpacity={0.8}
                          >
                            <View style={styles.docChooseBtn}>
                              <Text style={styles.docChooseBtnText}>Choose Files</Text>
                            </View>
                            <Text style={styles.docChosenText} numberOfLines={1}>
                              {chosenFiles.length ? chosenFiles.map(f => f.name).join(', ') : 'No file chosen'}
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.docUploadBtn, (!chosenFiles.length || isUploading) && styles.docUploadBtnDisabled]}
                            onPress={() => handleUploadDocFiles(dr.id)}
                            disabled={!chosenFiles.length || isUploading}
                            activeOpacity={0.85}
                          >
                            {isUploading ? (
                              <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                              <>
                                <Icon name="file-upload" size={16} color="#FFFFFF" />
                                <Text style={styles.docUploadBtnText}>Upload</Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                        <Text style={styles.docUploadHint}>PDF, JPG or PNG · up to 5 files · 5 MB each</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {!!ticket.pendingAdditionalCharge && (
          <View style={styles.extraChargeCard}>
            <View style={styles.extraChargeHeader}>
              <Icon name="request-quote" size={18} color="#92400E" />
              <Text style={styles.extraChargeHeaderText}>Additional Payment Requested</Text>
            </View>
            <View style={styles.extraChargeBody}>
              <View style={styles.extraChargeTopRow}>
                <View>
                  <Text style={styles.extraChargeAmount}>{formatUsd(ticket.pendingAdditionalCharge.amount)}</Text>
                  <Text style={styles.extraChargeSub}>{ticket.pendingAdditionalCharge.reason || 'extra cost'}</Text>
                </View>
                <Text style={styles.extraChargeDate}>{formatDateTime(ticket.pendingAdditionalCharge.requestedAt)}</Text>
              </View>
              <TouchableOpacity
                style={styles.payChargeBtn}
                onPress={handlePayNowPress}
                activeOpacity={0.85}
              >
                <Icon name="credit-card" size={16} color="#FFFFFF" />
                <Text style={styles.payChargeBtnText}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!!ticket.pricing && Number(ticket.pricing.totalAmount) > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Charges Breakdown</Text>
            <View style={styles.chargesList}>
              <View style={styles.chargeRow}>
                <Text style={styles.chargeLabel}>Base: {ticket.serviceName}</Text>
                <Text style={styles.chargeValue}>{formatUsd(baseAmount)}</Text>
              </View>
              {ticket.addons.map((addon, idx) => (
                <View key={addon.serviceId ?? idx} style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>+ {addon.name}</Text>
                  <Text style={styles.chargeValue}>{formatUsd(addon.customerPrice)}</Text>
                </View>
              ))}
              {ticket.pricing.expressSurcharge > 0 && (
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>+ Express Surcharge</Text>
                  <Text style={styles.chargeValue}>{formatUsd(ticket.pricing.expressSurcharge)}</Text>
                </View>
              )}
              {ticket.pricing.discountAmount > 0 && (
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>− Discount{ticket.pricing.couponCode ? ` (${ticket.pricing.couponCode})` : ''}</Text>
                  <Text style={[styles.chargeValue, styles.discountValue]}>−{formatUsd(ticket.pricing.discountAmount)}</Text>
                </View>
              )}
              {gstAmount > 0 && (
                <View style={styles.chargeRow}>
                  <Text style={styles.chargeLabel}>{formatGstLabel(gstRate)}</Text>
                  <Text style={styles.chargeValue}>{formatUsd(gstAmount)}</Text>
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>{formatUsd(ticket.pricing.totalAmount)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.timelineHeaderRow}>
            <Text style={styles.sectionTitle}>Request Timeline</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Live</Text>
            </View>
          </View>
          <View style={styles.timelineWrapper}>
            {timeline.map((event, idx) => {
              // The last entry reflects the ticket's current state, which the API
              // already gives us as a ready-to-display label (status_label) — use
              // it there instead of reformatting the raw `to` value ourselves.
              // Earlier entries only have the raw value, so just despace it.
              const isCurrent = idx === timeline.length - 1;
              const displayLabel = isCurrent && ticket.statusLabel ? ticket.statusLabel : (event.to ? event.to.replace(/_/g, ' ') : 'Update');
              const eventStatusStyle = getStatusColor(isCurrent ? ticket.statusLabel : event.to);
              const isFirst = idx === 0;
              return (
                <View key={idx} style={styles.timelineRow}>
                  <View style={styles.timelineDotCol}>
                    <View style={[styles.timelineDotRing, isFirst && styles.timelineDotRingActive]} />
                    <View style={styles.timelineLine} />
                  </View>
                  <View style={styles.timelineCard}>
                    <View style={styles.timelineCardTop}>
                      <Text style={[styles.timelineStatus, { color: eventStatusStyle.text }]}>{displayLabel}</Text>
                      <Text style={styles.timelineTime}>{formatDateTime(event.at)}</Text>
                    </View>
                    <Text style={styles.timelineTitle}>{event.note || 'Status updated'}</Text>
                  </View>
                </View>
              );
            })}
            <View style={styles.timelineRow}>
              <View style={styles.timelineDotCol}>
                <View style={styles.timelineDotMuted} />
              </View>
              <Text style={styles.timelinePlaceholder}>Further updates will appear here…</Text>
            </View>
          </View>
        </View>

        {(ticket.status === 'completed' || !!report || reportsFailed) && (
          <View style={styles.card}>
            <View style={styles.reportHeaderRow}>
              <View style={styles.reportTitleWrap}>
                <Icon name="description" size={20} color="#10B981" />
                <Text style={styles.sectionTitle}>Service Report</Text>
              </View>
              {!!report?.status && (
                <View style={styles.reportStatusBadge}>
                  <Text style={styles.reportStatusText}>{report.status}</Text>
                </View>
              )}
            </View>
            {reportsFailed ? (
              <TouchableOpacity style={[styles.backLink, styles.reportBody]} onPress={retryReports}>
                <Icon name="refresh" size={16} color="#DC2626" />
                <Text style={[styles.backLinkText, { color: '#DC2626' }]}>Couldn't load the report. Tap to retry.</Text>
              </TouchableOpacity>
            ) : report ? (
              <View style={styles.reportBody}>
                {!!report.title && <Text style={styles.reportNote}>{report.title}</Text>}
                {!!(report.vendor || report.date) && (
                  <Text style={styles.subValue}>
                    {[report.vendor, formatDateTime(report.date)].filter(Boolean).join(' · ')}
                  </Text>
                )}
                {report.media.length > 0 && (
                  <View style={styles.attachmentRow}>
                    {report.media.map((m, idx) => (
                      <TouchableOpacity key={m.url ?? idx} style={styles.attachmentPill} onPress={() => handleViewAttachment(m.url)}>
                        <Icon name="attach-file" size={16} color="#0D9488" />
                        <Text style={styles.attachmentPillText}>{report.media.length > 1 ? `View Attachment ${idx + 1}` : 'View Attachment'}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : reportsLoading ? (
              <View style={[styles.reportLoadingRow, styles.reportBody]}>
                <ActivityIndicator size="small" color="#D94625" />
                <Text style={styles.subValue}>Checking for your service report...</Text>
              </View>
            ) : (
              <Text style={[styles.subValue, styles.reportBody]}>Your service report hasn't been shared yet.</Text>
            )}
          </View>
        )}

        {ticket.status === 'completed' && (
          <View style={styles.card}>
            <View style={styles.reportTitleWrap}>
              <Icon name="star" size={20} color="#F59E0B" />
              <Text style={styles.sectionTitle}>Rate this Service</Text>
            </View>

            {ticket.rating ? (
              <>
                <Text style={styles.label}>Your rating</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <Icon key={n} name={n <= ticket.rating.value ? 'star' : 'star-border'} size={28} color="#F59E0B" />
                  ))}
                </View>
                {!!ticket.rating.note && <Text style={styles.reportNote}>{ticket.rating.note}</Text>}
              </>
            ) : (
              <>
                <Text style={styles.label}>How did we do?</Text>
                <View style={styles.starRow}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <TouchableOpacity key={n} onPress={() => setSelectedStars(n)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Icon name={n <= selectedStars ? 'star' : 'star-border'} size={32} color="#F59E0B" />
                    </TouchableOpacity>
                  ))}
                </View>
                <TextInput
                  style={styles.feedbackInput}
                  placeholder="Any feedback? (optional)"
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={3}
                  value={feedbackNote}
                  onChangeText={setFeedbackNote}
                />
                <TouchableOpacity style={[styles.submitRatingBtn, rateLoading && styles.submitRatingBtnDisabled]} onPress={handleSubmitRating} disabled={rateLoading}>
                  {rateLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.submitRatingBtnText}>Submit Rating</Text>}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </KeyboardAwareScrollView>

      {/* Floating quick-access to Support Chat */}
      <TouchableOpacity
        style={styles.supportChatFab}
        onPress={() => {
          if (ticket.supportChat?.id) {
            navigation.navigate('SupportTicketChat', { ticketId: ticket.id, kind: 'job' });
          } else {
            navigation.navigate('RequestSupportChat', { serviceTicketId: ticket.id, ticketNumber: ticket.ticketNumber });
          }
        }}
        activeOpacity={0.85}
      >
        <Icon name="sms" size={26} color="#FFFFFF" />
        {ticket.supportChat?.unreadCount > 0 && (
          <View style={styles.chatFabUnreadBadge}>
            <Text style={styles.chatFabUnreadText}>{ticket.supportChat.unreadCount}</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Styled "Thank You" confirmation after a rating is submitted */}
      <Modal
        visible={thankYouVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setThankYouVisible(false)}
      >
        <View style={styles.thankYouOverlay}>
          <View style={styles.thankYouCard}>
            <View style={styles.thankYouIconWrap}>
              <Icon name="check-circle" size={40} color="#10B981" />
            </View>
            <Text style={styles.thankYouTitle}>Thank You!</Text>
            <View style={styles.thankYouStars}>
              {[1, 2, 3, 4, 5].map(n => (
                <Icon key={n} name={n <= selectedStars ? 'star' : 'star-border'} size={22} color="#F59E0B" />
              ))}
            </View>
            <Text style={styles.thankYouMessage}>
              Your rating has been submitted. We appreciate your feedback on this service.
            </Text>
            <TouchableOpacity
              style={styles.thankYouBtn}
              onPress={() => setThankYouVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.thankYouBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Styled AppAlert component */}
      <AppAlert {...alertProps} />
      {attachmentPreview}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  headerContainer: {
    backgroundColor: '#20304C',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: STATUS_BAR_HEIGHT,
    paddingBottom: 16,
  },
  headerBackBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    ...typography.sectionTitle,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  scrollContent: { paddingBottom: 120, paddingHorizontal: 16, paddingTop: 16, gap: 16 },
  
  card: { 
    backgroundColor: '#FFFFFF',
    padding: 20, 
    borderRadius: 20,
    gap: 16,
    borderWidth: 1, 
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  badgeRow: { flexDirection: 'row', gap: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  badgeNeutral: { backgroundColor: '#F1F5F9' },
  badgeText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, textTransform: 'uppercase' },
  badgeTextNeutral: { color: '#64748B' },
  
  submittedWrap: { alignItems: 'flex-end' },
  hint: { ...typography.tiny, color: '#94A3B8' },
  submittedDate: { ...typography.small, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', marginTop: 2 },
  
  ticketId: { ...typography.h2, color: '#0F172A' },
  
  infoGrid: { gap: 16, marginTop: 8 },
  infoBlock: { gap: 4 },
  label: { ...typography.small, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
  value: { ...typography.h4, color: '#0F172A' },
  subValue: { ...typography.small, color: '#64748B' },
  
  slaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  overdueText: { color: '#DC2626' },
  overdueBadge: { backgroundColor: '#FEE2E2', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  overdueBadgeText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626' },
  
  sectionTitle: { ...typography.sectionTitle, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 4 },

  // Documents requested by vendor
  docsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  docsTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  docsSectionTitle: {
    fontSize: 15,
    fontFamily: typography.h2.fontFamily,
    fontWeight: '700',
    color: '#0F172A',
  },
  docsCountBadge: {
    backgroundColor: '#FFF7ED',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  docsCountBadgeText: {
    fontSize: 11.5,
    fontFamily: typography.labelMedium.fontFamily,
    fontWeight: '700',
    color: '#EA580C',
  },
  docRequestsContainer: {
    gap: 16,
  },
  docItemBlock: {
    gap: 10,
  },
  docItemBorderTop: {
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 16,
  },
  docItemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  docItemTitle: {
    fontSize: 15.5,
    fontFamily: typography.h2.fontFamily,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  docStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 10,
  },
  docStatusPending: {
    backgroundColor: '#FFEDD5',
  },
  docStatusPendingText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C2410C',
  },
  docStatusFulfilled: {
    backgroundColor: '#D1FAE5',
  },
  docStatusFulfilledText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#059669',
  },
  docItemSubtitle: {
    fontSize: 12.5,
    color: '#64748B',
  },
  docFileListRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  docFilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#DBEAFE',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  docFilePillText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  docUploadSection: {
    gap: 6,
    marginTop: 2,
  },
  docUploadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  docPickerBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  docChooseBtn: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRightWidth: 1,
    borderRightColor: '#CBD5E1',
  },
  docChooseBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  docChosenText: {
    flex: 1,
    paddingHorizontal: 10,
    fontSize: 12.5,
    color: '#64748B',
  },
  docUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#047857',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8.5,
  },
  docUploadBtnDisabled: {
    backgroundColor: '#94A3B8',
    opacity: 0.6,
  },
  docUploadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  docUploadHint: {
    fontSize: 11.5,
    color: '#64748B',
  },

  supportChatFab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#D94625',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  chatFabUnreadBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  chatFabUnreadText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },

  // Additional Payment Requested card
  extraChargeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    overflow: 'hidden',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  extraChargeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f9f1e0',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  extraChargeHeaderText: { ...typography.labelLarge, fontFamily: typography.h2.fontFamily, color: '#92400E' },
  extraChargeBody: { padding: 16, gap: 12 },
  extraChargeTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  extraChargeAmount: { ...typography.h2, color: '#0F172A' },
  extraChargeSub: { ...typography.small, color: '#64748B', marginTop: 2 },
  extraChargeDate: { ...typography.small, color: '#64748B' },
  payChargeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#bf6119',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  payChargeBtnText: { ...typography.labelMedium, color: '#FFFFFF', fontWeight: '700' },

  chargesList: { gap: 0 },
  chargeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9', borderStyle: 'dashed' },
  chargeLabel: { ...typography.small, color: '#64748B', flex: 1, paddingRight: 8 },
  chargeValue: { ...typography.body, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  discountValue: { color: '#10B981' },
  
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, marginTop: 4, borderTopWidth: 2, borderTopColor: '#F1F5F9' },
  totalLabel: { ...typography.h4, color: '#0F172A' },
  totalValue: { ...typography.appTitle, color: '#0F172A' },
  
  timelineHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#BBF7D0', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: '#FFFFFF' },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  liveText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: '#10B981' },

  timelineWrapper: { marginTop: 4 },
  timelineRow: { flexDirection: 'row', gap: 14 },
  timelineDotCol: { alignItems: 'center', width: 18 },
  timelineDotRing: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', marginTop: 4 },
  timelineDotRingActive: { borderColor: '#F97316' },
  timelineDotMuted: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#CBD5E1', backgroundColor: '#FFFFFF', marginTop: 2 },
  timelineLine: { flex: 1, width: 0, borderLeftWidth: 1, borderStyle: 'dashed', borderColor: '#CBD5E1', marginVertical: 2, minHeight: 16 },
  timelineCard: { flex: 1, backgroundColor: '#EFF4FF', borderRadius: 12, padding: 14, marginBottom: 16 },
  timelineCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineStatus: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', textTransform: 'uppercase' },
  timelineTime: { ...typography.tiny, color: '#64748B' },
  timelineTitle: { ...typography.body, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', fontWeight: '700', marginTop: 6 },
  timelineSub: { ...typography.small, color: '#64748B', marginTop: 2 },
  timelinePlaceholder: { ...typography.small, color: '#94A3B8', fontStyle: 'italic', flex: 1, marginTop: 2 },
  
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { ...typography.body, color: '#64748B' },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  backLinkText: { ...typography.labelMedium, color: '#3B82F6' },

  reportHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  reportTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reportStatusBadge: { backgroundColor: '#D1FAE5', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  reportStatusText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: '#059669', textTransform: 'capitalize' },
  reportBody: { paddingTop: 16, gap: 8 },
  reportNote: { ...typography.body, color: '#0F172A' },
  reportLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  attachmentPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#EEF2FF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 10, alignSelf: 'flex-start' },
  attachmentPillText: { ...typography.small, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB', textDecorationLine: 'underline' },

  starRow: { flexDirection: 'row', gap: 8, marginVertical: 4 },
  feedbackInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...typography.body,
    color: '#0F172A',
    textAlignVertical: 'top',
    minHeight: 80,
    backgroundColor: '#F8FAFC'
  },
  submitRatingBtn: { backgroundColor: '#D94625', borderRadius: 24, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  submitRatingBtnDisabled: { opacity: 0.7 },
  submitRatingBtnText: { ...typography.labelLarge, color: '#FFFFFF' },

  // Thank You dialog
  thankYouOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  thankYouCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 28,
    paddingBottom: 22,
    paddingHorizontal: 24,
    alignItems: 'center',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
  },
  thankYouIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  thankYouTitle: {
    ...typography.h2,
    fontSize: 22,
    color: '#0F172A',
    textAlign: 'center',
  },
  thankYouStars: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 10,
    marginBottom: 12,
  },
  thankYouMessage: {
    ...typography.small,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 22,
  },
  thankYouBtn: {
    width: '100%',
    backgroundColor: '#D94625',
    borderRadius: 24,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  thankYouBtnText: { ...typography.labelLarge, color: '#FFFFFF' },
});

export default TicketDetail;
