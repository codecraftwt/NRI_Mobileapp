import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, TextInput, ActivityIndicator, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { setServiceLocation, clearServiceLocation } from '../Redux/slices/serviceLocationSlice';
import { useStates } from '../Hooks/useStates';
import { usePostalCodeLookup } from '../Hooks/usePostalCodeLookup';

// Location is chosen by PIN code: the customer types a 6-digit pincode, we look
// it up (/geo/postal-codes) and resolve the state + city from the geo chain,
// then persist { stateName, cityName, cityId } to the serviceLocation slice so
// every services list/detail refetches for that city. State name isn't in the
// payload (only city.state_id) — it's resolved from the cached states list.
export default function LocationPickerModal({ visible, onClose, onSaved, title = 'Select Location', subtitle = 'Enter your PIN code to find your city.' }) {
  const dispatch = useDispatch();
  const saved = useSelector(s => s.serviceLocation);
  const { states } = useStates();
  const { results, loading, failed, lookup } = usePostalCodeLookup();

  const [pin, setPin] = useState('');
  // The lookup result we've locked onto for the currently-entered pincode.
  const match = results && results[0];
  const isForCurrentPin = !!match && String(match.code) === pin.trim();

  const resolvedStateName = isForCurrentPin
    ? (match.stateName || states.find(s => s.id === match.stateId)?.name || null)
    : null;
  const resolvedCityName = isForCurrentPin ? match.cityName : null;
  const resolvedCityId = isForCurrentPin ? match.cityId : null;
  const canSave = !!(resolvedStateName && resolvedCityName && resolvedCityId);

  // Reset when the sheet opens; prefill with the last-saved pincode if we kept one.
  useEffect(() => {
    if (visible) setPin(saved?.pincode || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Auto-look up as soon as a full 6-digit pincode is entered.
  useEffect(() => {
    const code = pin.trim();
    if (code.length === 6) lookup(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  const notFound = isForCurrentPin === false && pin.trim().length === 6 && !loading
    && ((results && results.length === 0) || failed);

  const handleSave = () => {
    if (!canSave) return;
    const loc = {
      stateName: resolvedStateName,
      cityName: resolvedCityName,
      cityId: resolvedCityId,
      pincode: pin.trim(),
    };
    dispatch(setServiceLocation(loc));
    onClose?.();
    onSaved?.(loc);
  };

  // Clear the entered pincode and any saved location — services then show for
  // all areas ("starting from") again.
  const canClear = !!pin.trim() || !!saved?.cityId;
  const handleClear = () => {
    setPin('');
    dispatch(clearServiceLocation());
    onSaved?.(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
            </View>
            {canClear && (
              <TouchableOpacity onPress={handleClear} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ marginRight: 14 }}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>

          <Text style={styles.fieldLabel}>PIN Code</Text>
          <View style={styles.pinBox}>
            <Icon name="pin-drop" size={20} color="#94A3B8" />
            <TextInput
              style={styles.pinInput}
              placeholder="e.g. 416002"
              placeholderTextColor="#94A3B8"
              keyboardType="number-pad"
              maxLength={6}
              value={pin}
              onChangeText={(t) => setPin(t.replace(/[^0-9]/g, ''))}
              autoFocus
            />
            {loading && <ActivityIndicator size="small" color={colors.primary} />}
          </View>

          {/* Resolved location preview */}
          {canSave && (
            <View style={styles.resultCard}>
              <Icon name="place" size={20} color="#D94625" />
              <View style={{ flex: 1 }}>
                {!!match.areaName && <Text style={styles.resultArea}>{match.areaName}</Text>}
                <Text style={styles.resultCity}>{resolvedCityName}, {resolvedStateName}</Text>
                {!!match.talukaName && <Text style={styles.resultSub}>Taluka: {match.talukaName}</Text>}
              </View>
              <Icon name="check-circle" size={20} color="#10B981" />
            </View>
          )}

          {notFound && (
            <Text style={styles.errorText}>
              We couldn't find that PIN code. Please check and try again.
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!canSave}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>Save Location</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  sheet: { backgroundColor: '#FFFFFF', borderRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  header: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  subtitle: { fontSize: 13, color: '#64748B', marginTop: 2 },
  clearText: { fontSize: 14, color: '#D94625', fontFamily: typography.h4.fontFamily },

  fieldLabel: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B', marginBottom: 6 },
  pinBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 14, height: 52,
  },
  pinInput: { flex: 1, fontSize: 16, letterSpacing: 2, color: '#0F172A', padding: 0 },

  resultCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16,
    backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FED7AA', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  resultArea: { fontSize: 12, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  resultCity: { fontSize: 15, color: '#0F172A', fontFamily: typography.h4.fontFamily, marginTop: 1 },
  resultSub: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  errorText: { fontSize: 13, color: '#EF4444', marginTop: 14 },

  saveBtn: { backgroundColor: '#D94625', borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { backgroundColor: '#CBD5E1' },
  saveBtnText: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#FFFFFF' },
});
