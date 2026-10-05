import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Linking,
  Modal,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme';
import { getAdminTicketDetail } from '../../Api/Admin/adminTicketsApi';

const titleCase = (s) => String(s || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

function getStatusMeta(status) {
  const s = String(status || '').toLowerCase();
  if (s.includes('complet')) {
    return {
      label: 'Completed',
      bg: '#ECFDF5',
      text: '#059669',
      border: '#A7F3D0',
      icon: 'check-circle',
      description: 'The requested service has been successfully completed and verified.',
    };
  }
  if (s.includes('refund')) {
    return {
      label: 'Refunded',
      bg: '#ECFDF5',
      text: '#059669',
      border: '#A7F3D0',
      icon: 'replay',
      description: 'Payment has been refunded back to the customer account.',
    };
  }
  if (s.includes('progress')) {
    return {
      label: 'In Progress',
      bg: '#EFF6FF',
      text: '#2563EB',
      border: '#BFDBFE',
      icon: 'sync',
      description: 'Work is currently in progress by the assigned vendor / operations team.',
    };
  }
  if (s.includes('assign')) {
    return {
      label: 'Assigned',
      bg: '#EFF6FF',
      text: '#2563EB',
      border: '#BFDBFE',
      icon: 'assignment-ind',
      description: 'A vendor / service partner has been assigned to execute the request.',
    };
  }
  if (s === 'new') {
    return {
      label: 'New',
      bg: '#F3E8FF',
      text: '#7E22CE',
      border: '#DDD6FE',
      icon: 'fiber-new',
      description: 'The ticket has been submitted by the customer and is awaiting team assignment.',
    };
  }
  if (s.includes('escalat')) {
    return {
      label: 'Escalated',
      bg: '#FFFBEB',
      text: '#D97706',
      border: '#FDE68A',
      icon: 'warning',
      description: 'Ticket has been escalated to senior management / RM for urgent attention.',
    };
  }
  if (s.includes('cancel')) {
    return {
      label: 'Cancelled',
      bg: '#FEF2F2',
      text: '#DC2626',
      border: '#FECACA',
      icon: 'cancel',
      description: 'The service ticket was cancelled.',
    };
  }
  return {
    label: titleCase(status || 'New'),
    bg: '#F8FAFC',
    text: '#475569',
    border: '#E2E8F0',
    icon: 'info',
    description: 'Ticket status recorded in system.',
  };
}

function getPriorityStyle(priority) {
  const p = String(priority || '').toLowerCase();
  if (p === 'urgent' || p === 'high') return { bg: '#FEE2E2', text: '#EF4444' };
  if (p === 'medium') return { bg: '#FEF3C7', text: '#D97706' };
  return { bg: '#F1F5F9', text: '#64748B' };
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

function handleCall(phone) {
  if (!phone) return;
  const cleaned = String(phone).replace(/\s+/g, '');
  Linking.openURL(`tel:${cleaned}`).catch(() => {});
}

function handleEmail(email) {
  if (!email) return;
  Linking.openURL(`mailto:${email}`).catch(() => {});
}

function InfoRow({ icon, label, value, valueColor, actionIcon, onAction }) {
  if (!value) return null;
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Icon name={icon} size={16} color="#64748B" />
      </View>
      <View style={styles.flex1}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      {actionIcon && onAction && (
        <TouchableOpacity style={styles.actionBtn} onPress={onAction} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
          <Icon name={actionIcon} size={18} color="#20304C" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function TicketDetail({ route, navigation }) {
  const routeTicket = route?.params?.ticket || null;
  const ticketId = route?.params?.ticketId || routeTicket?.id;

  const [ticket, setTicket] = useState(routeTicket);
  const [loading, setLoading] = useState(!routeTicket);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const fetchDetail = useCallback(async (isRefresh = false) => {
    if (!ticketId) return;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const data = await getAdminTicketDetail(ticketId);
      setTicket(data);
    } catch (err) {
      setError(err?.message || 'Failed to load ticket details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ticketId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const statusMeta = getStatusMeta(ticket?.status);
  const prioritySlug = ticket?.priorityObj?.slug || ticket?.priority || 'standard';
  const priorityLabel = ticket?.priorityObj?.name || ticket?.priorityLabel || titleCase(prioritySlug);
  const priorityStyle = getPriorityStyle(prioritySlug);

  const pricing = ticket?.pricing || null;
  const progressList = ticket?.progress || [];
  const historyList = ticket?.history || [];
  const vendor = ticket?.vendor || ticket?.assignedVendor || null;
  const telecaller = ticket?.telecaller || ticket?.assignedTelecaller || null;
  const customer = ticket?.customer || null;
  const location = ticket?.location || null;

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Details
          </Text>
          <View style={styles.backBtnPlaceholder} />
        </View>
      </View>

      {loading && !ticket ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#20304C" />
          <Text style={styles.loadingText}>Loading ticket details...</Text>
        </View>
      ) : error && !ticket ? (
        <View style={styles.centered}>
          <Icon name="error-outline" size={48} color="#EF4444" />
          <Text style={styles.errorTitle}>Could not load ticket</Text>
          <Text style={styles.errorSub}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchDetail(false)}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchDetail(true)}
              colors={['#20304C']}
              tintColor="#20304C"
            />
          }
        >
          {/* Main Ticket Banner */}
          <View style={styles.mainCard}>
            <View style={styles.ticketNumberRow}>
              <Text style={styles.ticketNumber}>{ticket?.ticketNumber || `NRI-${ticket?.id}`}</Text>
              <View style={styles.pillsRow}>
                {!!prioritySlug && (
                  <View style={[styles.priorityPill, { backgroundColor: priorityStyle.bg }]}>
                    <Text style={[styles.priorityText, { color: priorityStyle.text }]}>
                      {priorityLabel}
                    </Text>
                  </View>
                )}

                {/* Interactive Status Pill with Icon */}
                <TouchableOpacity
                  style={[
                    styles.statusPillTouchable,
                    { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setStatusModalVisible(true)}
                >
                  <Icon name={statusMeta.icon} size={14} color={statusMeta.text} style={styles.statusIconMargin} />
                  <Text style={[styles.statusText, { color: statusMeta.text }]}>
                    {ticket?.statusLabel || titleCase(ticket?.status || 'New')}
                  </Text>
                  <Icon name="info-outline" size={12} color={statusMeta.text} style={styles.statusInfoIcon} />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.serviceName}>{ticket?.serviceName || ticket?.service?.name || 'Service Request'}</Text>
            {(ticket?.categoryName || ticket?.category?.name || ticket?.serviceCategoryName) && (
              <View style={styles.categoryBadge}>
                <Icon name="label" size={13} color="#64748B" />
                <Text style={styles.categoryName}>
                  {ticket?.categoryName || ticket?.category?.name || ticket?.serviceCategoryName}
                </Text>
              </View>
            )}

            <View style={styles.bannerDates}>
              <View style={styles.bannerDateItem}>
                <Icon name="schedule" size={13} color="#94A3B8" />
                <Text style={styles.bannerDateText}>Created: {formatDateTime(ticket?.createdAt)}</Text>
              </View>
              {ticket?.preferredDate && (
                <View style={styles.bannerDateItem}>
                  <Icon name="event" size={13} color="#94A3B8" />
                  <Text style={styles.bannerDateText}>Preferred: {formatDateTime(ticket.preferredDate)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Pricing Breakdown Card */}
          {pricing && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Icon name="receipt" size={18} color="#059669" />
                <Text style={styles.sectionTitle}>Pricing Breakdown</Text>
              </View>

              <View style={styles.pricingList}>
                <View style={styles.pricingRow}>
                  <Text style={styles.pricingLabel}>Customer Base Price</Text>
                  <Text style={styles.pricingValue}>₹{Number(pricing.customer_price || 0).toLocaleString('en-IN')}</Text>
                </View>

                {Number(pricing.express_surcharge || 0) > 0 && (
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Express Surcharge</Text>
                    <Text style={styles.pricingValue}>₹{Number(pricing.express_surcharge).toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {Number(pricing.gst_amount || 0) > 0 && (
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>GST ({pricing.gst_rate || 18}%)</Text>
                    <Text style={styles.pricingValue}>₹{Number(pricing.gst_amount).toLocaleString('en-IN')}</Text>
                  </View>
                )}

                {Number(pricing.pending_extra_charge || 0) > 0 && (
                  <View style={styles.pricingRow}>
                    <Text style={styles.pricingLabel}>Pending Extra Charges</Text>
                    <Text style={styles.pricingValue}>₹{Number(pricing.pending_extra_charge).toLocaleString('en-IN')}</Text>
                  </View>
                )}

                <View style={styles.pricingTotalRow}>
                  <Text style={styles.pricingTotalLabel}>Total Amount (Paid / Due)</Text>
                  <Text style={styles.pricingTotalValue}>₹{Number(pricing.total || ticket?.totalAmountInr || 0).toLocaleString('en-IN')}</Text>
                </View>

                {pricing.vendor_cost != null && (
                  <View style={styles.vendorCostRow}>
                    <Text style={styles.vendorCostLabel}>Vendor Cost / Payout</Text>
                    <Text style={styles.vendorCostValue}>₹{Number(pricing.vendor_cost).toLocaleString('en-IN')}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Customer & Location Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Icon name="person" size={18} color="#2563EB" />
              <Text style={styles.sectionTitle}>Customer & Location</Text>
            </View>

            <View style={styles.cardBody}>
              <InfoRow
                icon="account-circle"
                label="Customer Name"
                value={customer?.name || ticket?.customerName}
              />
              <InfoRow
                icon="email"
                label="Email Address"
                value={customer?.email || ticket?.customerEmail}
                actionIcon="mail-outline"
                onAction={() => handleEmail(customer?.email || ticket?.customerEmail)}
              />
              <InfoRow
                icon="phone"
                label="Phone Number"
                value={customer?.phone || ticket?.customerPhone}
                actionIcon="phone-in-talk"
                onAction={() => handleCall(customer?.phone || ticket?.customerPhone)}
              />
              {ticket?.familyMember?.name && (
                <InfoRow
                  icon="family-restroom"
                  label="Beneficiary / Family Member"
                  value={ticket.familyMember.name}
                />
              )}
              {ticket?.address && (
                <InfoRow
                  icon="home"
                  label="Service Address"
                  value={ticket.address}
                />
              )}
              {(location?.city?.name || ticket?.cityName || location?.state?.name || ticket?.stateName) && (
                <InfoRow
                  icon="place"
                  label="City & State"
                  value={[
                    ticket?.taluka,
                    location?.city?.name || ticket?.cityName,
                    location?.state?.name || ticket?.stateName,
                    ticket?.pincode ? `PIN: ${ticket.pincode}` : null,
                  ].filter(Boolean).join(', ')}
                />
              )}
              {ticket?.customerNotes && (
                <InfoRow
                  icon="notes"
                  label="Customer Notes"
                  value={ticket.customerNotes}
                />
              )}
            </View>
          </View>

          {/* Staff & Vendor Assignments */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Icon name="badge" size={18} color="#7C3AED" />
              <Text style={styles.sectionTitle}>Assigned Team & Vendor</Text>
            </View>

            <View style={styles.cardBody}>
              {/* Vendor Info */}
              <View style={styles.assignmentBlock}>
                <View style={styles.assignmentHeader}>
                  <View style={styles.assignmentIconWrap}>
                    <Icon name="engineering" size={18} color="#2563EB" />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={styles.assignmentRole}>Assigned Vendor</Text>
                    <Text style={styles.assignmentName}>
                      {vendor?.business_name || vendor?.name || 'Unassigned'}
                    </Text>
                  </View>
                  {vendor?.rating != null && (
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={13} color="#D97706" />
                      <Text style={styles.ratingText}>{Number(vendor.rating).toFixed(1)}</Text>
                    </View>
                  )}
                </View>

                {vendor?.phone && (
                  <TouchableOpacity
                    style={styles.quickContactRow}
                    onPress={() => handleCall(vendor.phone)}
                  >
                    <Icon name="call" size={14} color="#64748B" />
                    <Text style={styles.quickContactText}>{vendor.phone}</Text>
                  </TouchableOpacity>
                )}
                {vendor?.email && (
                  <TouchableOpacity
                    style={styles.quickContactRow}
                    onPress={() => handleEmail(vendor.email)}
                  >
                    <Icon name="email" size={14} color="#64748B" />
                    <Text style={styles.quickContactText}>{vendor.email}</Text>
                  </TouchableOpacity>
                )}
                {ticket?.vendorAssignedAt && (
                  <Text style={styles.assignedAtText}>
                    Assigned: {formatDateTime(ticket.vendorAssignedAt)}
                  </Text>
                )}
              </View>

              {/* Telecaller Info */}
              {telecaller && (
                <View style={styles.assignmentBlock}>
                  <View style={styles.assignmentHeader}>
                    <View style={styles.assignmentIconWrap}>
                      <Icon name="support-agent" size={18} color="#059669" />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.assignmentRole}>Assigned Telecaller</Text>
                      <Text style={styles.assignmentName}>{telecaller.name || 'Telecaller'}</Text>
                    </View>
                  </View>
                  {telecaller.phone && (
                    <TouchableOpacity
                      style={styles.quickContactRow}
                      onPress={() => handleCall(telecaller.phone)}
                    >
                      <Icon name="call" size={14} color="#64748B" />
                      <Text style={styles.quickContactText}>{telecaller.phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* RM Info */}
              {ticket?.assignedRm && (
                <View style={styles.assignmentBlock}>
                  <View style={styles.assignmentHeader}>
                    <View style={styles.assignmentIconWrap}>
                      <Icon name="person-pin" size={18} color="#EA580C" />
                    </View>
                    <View style={styles.flex1}>
                      <Text style={styles.assignmentRole}>Relationship Manager</Text>
                      <Text style={styles.assignmentName}>{ticket.assignedRm.name || 'RM'}</Text>
                    </View>
                  </View>
                  {ticket.assignedRm.phone && (
                    <TouchableOpacity
                      style={styles.quickContactRow}
                      onPress={() => handleCall(ticket.assignedRm.phone)}
                    >
                      <Icon name="call" size={14} color="#64748B" />
                      <Text style={styles.quickContactText}>{ticket.assignedRm.phone}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Visual Progress Stepper */}
          {progressList.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Icon name="timeline" size={18} color="#2563EB" />
                <Text style={styles.sectionTitle}>Progress Status</Text>
              </View>

              <View style={styles.stepperWrap}>
                {progressList.map((step, idx) => {
                  const isDone = step.state === 'done';
                  const isCurrent = step.state === 'current';
                  const isLast = idx === progressList.length - 1;

                  return (
                    <View key={step.key || String(idx)} style={styles.stepItem}>
                      <View style={styles.stepIndicatorCol}>
                        <View
                          style={[
                            styles.stepDot,
                            isDone && styles.stepDotDone,
                            isCurrent && styles.stepDotCurrent,
                          ]}
                        >
                          {isDone ? (
                            <Icon name="check" size={12} color="#FFFFFF" />
                          ) : (
                            <View style={[styles.stepInnerDot, isCurrent && styles.stepInnerDotCurrent]} />
                          )}
                        </View>
                        {!isLast && (
                          <View
                            style={[
                              styles.stepLine,
                              isDone && styles.stepLineDone,
                            ]}
                          />
                        )}
                      </View>

                      <View style={styles.stepBody}>
                        <View style={styles.stepHeader}>
                          <Text
                            style={[
                              styles.stepLabel,
                              (isDone || isCurrent) && styles.stepLabelActive,
                            ]}
                          >
                            {step.label}
                          </Text>
                          {step.at && (
                            <Text style={styles.stepDate}>{formatDateTime(step.at)}</Text>
                          )}
                        </View>
                        {step.by && (
                          <Text style={styles.stepBy}>Updated by: {step.by}</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Activity / History Log */}
          {historyList.length > 0 && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionTitleRow}>
                <Icon name="history" size={18} color="#64748B" />
                <Text style={styles.sectionTitle}>Activity & Transitions</Text>
              </View>

              <View style={styles.historyList}>
                {historyList.map((h, i) => (
                  <View key={String(i)} style={styles.historyItem}>
                    <View style={styles.historyHeader}>
                      <View style={styles.historyPill}>
                        <Text style={styles.historyPillText}>{h.to_label || titleCase(h.to)}</Text>
                      </View>
                      <Text style={styles.historyDate}>{formatDateTime(h.at)}</Text>
                    </View>
                    {!!h.note && <Text style={styles.historyNote}>{h.note}</Text>}
                    {!!h.by && <Text style={styles.historyBy}>By: {h.by}</Text>}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Support Ticket Chat Badge */}
          {ticket?.chat?.support_ticket_id && (
            <View style={styles.chatCard}>
              <Icon name="chat" size={20} color="#20304C" />
              <View style={styles.flex1}>
                <Text style={styles.chatTitle}>Support Thread #{ticket.chat.support_ticket_id}</Text>
                <Text style={styles.chatSub}>
                  {ticket.chat.closed ? 'Ticket conversation closed' : 'Active customer support thread'}
                </Text>
              </View>
              {ticket.chat.unread > 0 && (
                <View style={styles.chatBadge}>
                  <Text style={styles.chatBadgeText}>{ticket.chat.unread} unread</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* Status Details Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setStatusModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Icon name="info" size={22} color="#20304C" />
                <Text style={styles.modalTitle}>Ticket Status</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={() => setStatusModalVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Current Status Pill */}
            <View style={styles.modalStatusRow}>
              <View
                style={[
                  styles.modalStatusPill,
                  { backgroundColor: statusMeta.bg, borderColor: statusMeta.border },
                ]}
              >
                <Icon name={statusMeta.icon} size={18} color={statusMeta.text} style={styles.statusIconMargin} />
                <Text style={[styles.modalStatusText, { color: statusMeta.text }]}>
                  {ticket?.statusLabel || titleCase(ticket?.status || 'New')}
                </Text>
              </View>
            </View>

            {/* Status Description */}
            <View style={styles.modalDescBox}>
              <Text style={styles.modalDescText}>{statusMeta.description}</Text>
            </View>

            {/* Details Table */}
            <View style={styles.modalDetailsList}>
              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Ticket Number</Text>
                <Text style={styles.modalDetailValue}>{ticket?.ticketNumber || `NRI-${ticket?.id}`}</Text>
              </View>
              {ticket?.statusForCustomer && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Customer Sees</Text>
                  <Text style={styles.modalDetailValue}>{ticket.statusForCustomer}</Text>
                </View>
              )}
              {ticket?.vendorAssignedAt && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Assigned On</Text>
                  <Text style={styles.modalDetailValue}>{formatDateTime(ticket.vendorAssignedAt)}</Text>
                </View>
              )}
              {vendor?.business_name && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Vendor</Text>
                  <Text style={styles.modalDetailValue}>{vendor.business_name}</Text>
                </View>
              )}
              {ticket?.createdAt && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Created On</Text>
                  <Text style={styles.modalDetailValue}>{formatDateTime(ticket.createdAt)}</Text>
                </View>
              )}
            </View>

            {/* Dismiss Button */}
            <TouchableOpacity
              style={styles.modalActionBtn}
              onPress={() => setStatusModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.modalActionBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#20304C',
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    flex: 1,
    fontSize: 19,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    includeFontPadding: false,
    textAlign: 'center',
    textAlignVertical: 'center',
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  errorSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#20304C',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },

  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 14,
  },

  mainCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  ticketNumberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketNumber: {
    fontSize: 16,
    fontFamily: typography.h2.fontFamily,
    fontWeight: '800',
    color: '#20304C',
  },
  pillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  statusPillTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  statusIconMargin: {
    marginRight: 2,
  },
  statusInfoIcon: {
    marginLeft: 2,
    opacity: 0.8,
  },
  statusText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  serviceName: {
    fontSize: 17,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
    marginBottom: 6,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  categoryName: {
    fontSize: 12.5,
    color: '#64748B',
    fontWeight: '500',
  },
  bannerDates: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  bannerDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerDateText: {
    fontSize: 11.5,
    color: '#94A3B8',
  },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#475569',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  sectionTitle: {
    fontSize: 14.5,
    fontFamily: typography.h4.fontFamily,
    color: '#0F172A',
    fontWeight: '700',
  },
  cardBody: {
    gap: 12,
  },

  pricingList: {
    gap: 8,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  pricingValue: {
    fontSize: 13.5,
    fontWeight: '600',
    color: '#1E293B',
  },
  pricingTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  pricingTotalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  pricingTotalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#16A34A',
  },
  vendorCostRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  vendorCostLabel: {
    fontSize: 12,
    color: '#94A3B8',
  },
  vendorCostValue: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#475569',
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11.5,
    color: '#64748B',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13.5,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#0F172A',
    fontWeight: '600',
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },

  assignmentBlock: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  assignmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  assignmentIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  assignmentRole: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  assignmentName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  quickContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 42,
  },
  quickContactText: {
    fontSize: 12.5,
    color: '#2563EB',
    fontWeight: '500',
  },
  assignedAtText: {
    fontSize: 11,
    color: '#94A3B8',
    marginLeft: 42,
    marginTop: 2,
  },

  stepperWrap: {
    gap: 0,
  },
  stepItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  stepIndicatorCol: {
    alignItems: 'center',
    width: 28,
  },
  stepDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotDone: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  stepDotCurrent: {
    borderColor: '#2563EB',
  },
  stepInnerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  stepInnerDotCurrent: {
    backgroundColor: '#2563EB',
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  stepLineDone: {
    backgroundColor: '#16A34A',
  },
  stepBody: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 14,
  },
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  stepLabelActive: {
    color: '#0F172A',
    fontWeight: '700',
  },
  stepDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  stepBy: {
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 2,
  },

  historyList: {
    gap: 10,
  },
  historyItem: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyPill: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  historyPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  historyDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  historyNote: {
    fontSize: 12.5,
    color: '#1E293B',
    marginTop: 2,
  },
  historyBy: {
    fontSize: 11,
    color: '#64748B',
    fontStyle: 'italic',
  },

  chatCard: {
    backgroundColor: '#EEF2F6',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  chatTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#20304C',
  },
  chatSub: {
    fontSize: 11.5,
    color: '#64748B',
  },
  chatBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  chatBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16.5,
    fontWeight: '800',
    color: '#20304C',
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalStatusRow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  modalStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  modalStatusText: {
    fontSize: 14,
    fontWeight: '800',
  },
  modalDescBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  modalDescText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
    textAlign: 'center',
  },
  modalDetailsList: {
    gap: 8,
    paddingTop: 4,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalDetailLabel: {
    fontSize: 12.5,
    color: '#64748B',
  },
  modalDetailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0F172A',
  },
  modalActionBtn: {
    backgroundColor: '#20304C',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  modalActionBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },

  flex1: {
    flex: 1,
  },
  backIcon: {
    marginLeft: 4,
  },
});

export default TicketDetail;
