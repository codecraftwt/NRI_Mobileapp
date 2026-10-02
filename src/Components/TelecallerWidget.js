import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Linking,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../theme/typography';
import { lightColors as colors } from '../theme/colors';
import { toAbsoluteUrl } from '../Api/client';

function formatRelativeTime(dateStr) {
  if (!dateStr) return 'recently';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return 'just now';

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 60) return 'just now';
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  return `${diffDays} days ago`;
}

function getInitials(name) {
  if (!name) return 'TC';
  const parts = name.trim().split(/[\s@._-]+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function TelecallerWidget({
  telecaller,
  pendingCallback,
  options = { topics: [], preferredTimes: [] },
  loading = false,
  failed = false,
  onRetry,
  onSubmitCallback,
  submitting = false,
  user,
  navigation,
}) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  // Dropdown selector modal states
  const [pickerType, setPickerType] = useState(null); // 'topic' | 'time' | null

  useEffect(() => {
    if (user?.phone || user?.mobile) {
      setPhone(user.phone || user.mobile || '');
    }
  }, [user]);

  const openModal = () => {
    if (pendingCallback) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    // Default topic to first if not selected
    if (!selectedTopic && options?.topics?.length > 0) {
      setSelectedTopic(options.topics[0].value);
    }
    // Default preferred time to anytime or first
    if (!selectedTime && options?.preferredTimes?.length > 0) {
      const anytimeOpt = options.preferredTimes.find(t => t.value === 'anytime' || t.label.toLowerCase().includes('any'));
      setSelectedTime(anytimeOpt ? anytimeOpt.value : options.preferredTimes[0].value);
    }
    setPhone(user?.phone || user?.mobile || '');
    setMessage('');
    setModalVisible(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setModalVisible(false);
    setErrorMessage(null);
    setPickerType(null);
  };

  const handleCall = (phoneNumber) => {
    if (!phoneNumber) return;
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {});
  };

  const handleWhatsApp = (waNumber) => {
    if (!waNumber) return;
    const cleanNumber = waNumber.replace(/[^0-9]/g, '');
    Linking.openURL(`https://wa.me/${cleanNumber}`).catch(() => {});
  };

  const handleSubmit = async () => {
    if (!selectedTopic) {
      setErrorMessage('Please select a topic.');
      return;
    }

    setErrorMessage(null);
    const payload = {
      topic: selectedTopic,
      preferred_time: selectedTime || undefined,
      phone: phone.trim() || undefined,
      message: message.trim() || undefined,
    };

    if (onSubmitCallback) {
      const res = await onSubmitCallback(payload);
      if (res?.success) {
        setSuccessMessage('Callback request submitted successfully!');
        setTimeout(() => {
          closeModal();
          setSuccessMessage(null);
        }, 1200);
      } else {
        setErrorMessage(res?.message || 'Failed to request callback. Please try again.');
      }
    }
  };

  const selectedTopicLabel = options?.topics?.find(t => t.value === selectedTopic)?.label || 'Select a topic';
  const selectedTimeLabel = options?.preferredTimes?.find(t => t.value === selectedTime)?.label || 'Select preferred time';

  // Loading indicator for widget if no telecaller & no error
  if (loading && !telecaller && !pendingCallback) {
    return (
      <View style={styles.card}>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#93C5FD" />
          <Text style={styles.loadingText}>Loading care coordinator...</Text>
        </View>
      </View>
    );
  }

  // Fallback if no telecaller covers customer's area
  if (!telecaller) {
    return (
      <View style={styles.card}>
        <View style={styles.leftSection}>
          <View style={[styles.avatar, { backgroundColor: '#3B82F6' }]}>
            <Icon name="support-agent" size={18} color="#FFFFFF" />
          </View>
          <View style={styles.info}>
            <Text style={styles.title}>CUSTOMER SUPPORT</Text>
            <Text style={styles.name}>NRI Circle Support</Text>
            <Text style={styles.supportSubText} numberOfLines={1}>
              No dedicated telecaller in your area
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.supportActionBtn}
          onPress={() => {
            if (navigation) navigation.navigate('GeneralSupport');
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.supportActionBtnText}>Contact Support</Text>
          <Icon name="chevron-right" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    );
  }

  const avatarUrl = telecaller.photoUrl ? toAbsoluteUrl(telecaller.photoUrl) : null;
  const isCallbackPending = Boolean(pendingCallback);

  return (
    <View style={styles.wrapper}>
      {/* Telecaller Main Card */}
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.leftSection}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(telecaller.name)}</Text>
              </View>
            )}
            <View style={styles.info}>
              <View style={styles.labelRow}>
                <Text style={styles.title}>YOUR CARE COORDINATOR</Text>
                <View style={styles.verifiedBadge}>
                  <Icon name="check-circle" size={12} color="#10B981" />
                </View>
              </View>
              <Text style={styles.name} numberOfLines={1}>
                {telecaller.name}
              </Text>
              {!!telecaller.availableHours && (
                <View style={styles.hoursRow}>
                  <View style={styles.onlineDot} />
                  <Icon name="schedule" size={11} color="#94A3B8" style={{ marginRight: 3 }} />
                  <Text style={styles.hoursText} numberOfLines={1}>
                    {telecaller.availableHours}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Quick Direct Actions (Call / WhatsApp / Chat) */}
          <View style={styles.quickContactIcons}>
            {!!telecaller.phone && (
              <TouchableOpacity
                style={styles.contactCircleBtn}
                onPress={() => handleCall(telecaller.phone)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Icon name="phone" size={14} color="#38BDF8" />
              </TouchableOpacity>
            )}
            {!!telecaller.whatsappNumber && (
              <TouchableOpacity
                style={[styles.contactCircleBtn, styles.waCircleBtn]}
                onPress={() => handleWhatsApp(telecaller.whatsappNumber)}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                activeOpacity={0.7}
              >
                <Icon name="chat" size={13} color="#4ADE80" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.contactCircleBtn, styles.chatCircleBtn]}
              onPress={() => {
                if (navigation) {
                  navigation.navigate('NewSupportTicket', { category: 'telecaller' });
                }
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Icon name="headset-mic" size={13} color="#A78BFA" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Button: Call Me Back */}
        <View style={styles.cardActionRow}>
          <TouchableOpacity
            style={[
              styles.callMeBackBtn,
              isCallbackPending && styles.callMeBackBtnDisabled,
            ]}
            onPress={openModal}
            disabled={isCallbackPending}
            activeOpacity={0.8}
          >
            <Icon
              name={isCallbackPending ? 'schedule' : 'phone-callback'}
              size={14}
              color={isCallbackPending ? '#94A3B8' : '#FFFFFF'}
            />
            <Text
              style={[
                styles.callMeBackBtnText,
                isCallbackPending && styles.callMeBackBtnTextDisabled,
              ]}
            >
              {isCallbackPending ? 'Callback In Progress' : 'Call me back'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Callback Banner */}
        {isCallbackPending && (
          <View style={styles.pendingCallbackBanner}>
            <Icon name="phone-in-talk" size={13} color="#60A5FA" />
            <Text style={styles.pendingBannerTitle} numberOfLines={1}>
              Callback requested {formatRelativeTime(pendingCallback.requestedAt)}
            </Text>
            <View style={styles.pendingStatusPill}>
              <Text style={styles.pendingStatusText}>
                {pendingCallback.status || 'Pending'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Call Me Back Form Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <View style={styles.modalIconCircle}>
                  <Icon name="phone-callback" size={20} color="#2563EB" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Request a Callback</Text>
                  <Text style={styles.modalSubtitle}>
                    {telecaller.name ? `From ${telecaller.name}` : 'Our care coordinator will call you'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.modalCloseBtn}
                onPress={closeModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Error Banner */}
              {!!errorMessage && (
                <View style={styles.modalAlertError}>
                  <Icon name="error-outline" size={18} color="#DC2626" />
                  <Text style={styles.modalAlertErrorText}>{errorMessage}</Text>
                </View>
              )}

              {/* Success Banner */}
              {!!successMessage && (
                <View style={styles.modalAlertSuccess}>
                  <Icon name="check-circle" size={18} color="#059669" />
                  <Text style={styles.modalAlertSuccessText}>{successMessage}</Text>
                </View>
              )}

              {/* Topic Selector */}
              <Text style={styles.fieldLabel}>Topic *</Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setPickerType('topic')}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.selectButtonText,
                    !selectedTopic && styles.placeholderText,
                  ]}
                  numberOfLines={1}
                >
                  {selectedTopicLabel}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#64748B" />
              </TouchableOpacity>

              {/* Preferred Time Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Preferred Time
              </Text>
              <TouchableOpacity
                style={styles.selectButton}
                onPress={() => setPickerType('time')}
                activeOpacity={0.7}
              >
                <Text style={styles.selectButtonText} numberOfLines={1}>
                  {selectedTimeLabel}
                </Text>
                <Icon name="arrow-drop-down" size={24} color="#64748B" />
              </TouchableOpacity>

              {/* Phone Input */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Phone Number
              </Text>
              <View style={styles.inputContainer}>
                <Icon name="phone" size={18} color="#94A3B8" style={{ marginRight: 8 }} />
                <TextInput
                  style={styles.textInput}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="+91 98765 43210"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              {/* Notes / Message Input */}
              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>
                Message (Optional)
              </Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Share any specific details or queries..."
                placeholderTextColor="#94A3B8"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={closeModal}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    (!selectedTopic || submitting) && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={!selectedTopic || submitting}
                  activeOpacity={0.8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Icon name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.submitButtonText}>Request Call</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Option Picker Modal (Topic / Preferred Time) */}
      <Modal
        visible={pickerType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerType(null)}
      >
        <TouchableOpacity
          style={styles.pickerBackdrop}
          activeOpacity={1}
          onPress={() => setPickerType(null)}
        >
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerType === 'topic' ? 'Select Topic' : 'Select Preferred Time'}
              </Text>
              <TouchableOpacity onPress={() => setPickerType(null)}>
                <Icon name="close" size={22} color="#475569" />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 320 }}>
              {(pickerType === 'topic' ? options?.topics : options?.preferredTimes)?.map((item) => {
                const isSelected =
                  pickerType === 'topic'
                    ? selectedTopic === item.value
                    : selectedTime === item.value;

                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      if (pickerType === 'topic') {
                        setSelectedTopic(item.value);
                      } else {
                        setSelectedTime(item.value);
                      }
                      setPickerType(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        isSelected && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                    {isSelected && (
                      <Icon name="check" size={20} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#0D9488',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E293B',
  },
  avatarText: {
    fontSize: 13,
    fontFamily: typography.h2?.fontFamily,
    color: '#FFFFFF',
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 8,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  verifiedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  name: {
    fontSize: 14,
    fontFamily: typography.h2?.fontFamily,
    color: '#FFFFFF',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  onlineDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  hoursText: {
    fontSize: 10,
    color: '#CBD5E1',
    flexShrink: 1,
  },
  supportSubText: {
    fontSize: 11,
    color: '#CBD5E1',
    marginTop: 2,
  },
  quickContactIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactCircleBtn: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  waCircleBtn: {
    backgroundColor: 'rgba(74, 222, 128, 0.18)',
    borderColor: 'rgba(74, 222, 128, 0.3)',
  },
  chatCircleBtn: {
    backgroundColor: 'rgba(167, 139, 250, 0.18)',
    borderColor: 'rgba(167, 139, 250, 0.3)',
  },
  cardActionRow: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  callMeBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#2563EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  callMeBackBtnDisabled: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  callMeBackBtnText: {
    fontSize: 11,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#FFFFFF',
  },
  callMeBackBtnTextDisabled: {
    color: '#94A3B8',
  },
  supportActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  supportActionBtnText: {
    fontSize: 12,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#FFFFFF',
  },
  pendingCallbackBanner: {
    marginTop: 7,
    backgroundColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(96, 165, 250, 0.4)',
  },
  pendingBannerTitle: {
    fontSize: 11,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#93C5FD',
    flex: 1,
  },
  pendingStatusPill: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  pendingStatusText: {
    fontSize: 10,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#FCD34D',
    textTransform: 'capitalize',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#94A3B8',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: typography.h3?.fontFamily || typography.h2?.fontFamily || typography.labelMedium?.fontFamily,
    color: '#0F172A',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalScrollContent: {
    padding: 20,
  },
  modalAlertError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  modalAlertErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
  },
  modalAlertSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  modalAlertSuccessText: {
    flex: 1,
    fontSize: 12,
    color: '#059669',
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#334155',
    marginBottom: 6,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectButtonText: {
    fontSize: 14,
    color: '#1E293B',
    flex: 1,
  },
  placeholderText: {
    color: '#94A3B8',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 10,
  },
  textArea: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 70,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#475569',
  },
  submitButton: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#93C5FD',
  },
  submitButtonText: {
    fontSize: 14,
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#FFFFFF',
  },

  // Option Picker Sheet Styles
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 8,
  },
  pickerTitle: {
    fontSize: 16,
    fontFamily: typography.h3?.fontFamily || typography.h2?.fontFamily || typography.labelMedium?.fontFamily,
    color: '#0F172A',
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  pickerOptionSelected: {
    backgroundColor: '#EFF6FF',
  },
  pickerOptionText: {
    fontSize: 14,
    color: '#334155',
  },
  pickerOptionTextSelected: {
    fontFamily: typography.labelMedium?.fontFamily,
    color: '#2563EB',
  },
});
