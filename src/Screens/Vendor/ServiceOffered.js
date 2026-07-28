import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography } from '../../theme/typography';
import { useVendorProfile, useVendorRates } from '../../Hooks/useVendorProfile';
import { useServiceCategories } from '../../Hooks/useServiceCategories';

const formatRate = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

function ServiceOffered({ navigation }) {
  const { profile, loading, actionLoading, updateProfile } = useVendorProfile();
  const { categories, loading: loadingCategories } = useServiceCategories();
  const { rates, loading: loadingRates } = useVendorRates();
  const { showAlert, alertProps } = useAppAlert();

  // Offered category ids, seeded from the profile's services.
  const [selected, setSelected] = useState(null); // Set | null (until loaded)
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (profile?.services && selected === null) {
      setSelected(new Set(profile.services.map(s => s.id)));
    }
  }, [profile, selected]);

  const selectedSet = selected || new Set();
  const offered = categories.filter(c => selectedSet.has(c.id));
  const available = categories.filter(c => !selectedSet.has(c.id));

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev || []);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    try {
      await updateProfile({ category_ids: [...selectedSet] }).unwrap();
      showAlert('Saved', 'Your offered services have been updated.');
    } catch (e) {
      showAlert('Update Failed', e?.message || 'Could not save. Please try again.');
    }
  };

  if (loading && !profile) {
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Services Offered" showBack />
        <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
      </View>
    );
  }

  const serviceRates = rates?.serviceRates || [];
  const changeRequests = rates?.rateChangeRequests || [];

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Services Offered" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Offered categories (editable) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Services you offer</Text>
          <Text style={styles.cardSub}>The categories you provide. Admin sets the rate for each.</Text>

          {loadingCategories ? (
            <ActivityIndicator size="small" color="#D94625" style={{ marginVertical: 16 }} />
          ) : (
            <>
              {offered.length === 0 ? (
                <Text style={styles.emptyText}>No services added yet.</Text>
              ) : (
                offered.map((c, i) => (
                  <View key={c.id} style={[styles.catRow, i < offered.length - 1 && styles.catRowBorder]}>
                    <Text style={styles.catNameOn}>{c.name}</Text>
                    <TouchableOpacity style={styles.removeBtn} onPress={() => toggle(c.id)} activeOpacity={0.7}>
                      <Icon name="close" size={14} color="#DC2626" />
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}

              {/* Add a service */}
              <TouchableOpacity style={styles.addToggle} onPress={() => setShowAdd(v => !v)} activeOpacity={0.7} disabled={available.length === 0}>
                <Icon name="add" size={18} color={available.length === 0 ? '#CBD5E1' : '#D94625'} />
                <Text style={[styles.addToggleText, available.length === 0 && { color: '#CBD5E1' }]}>
                  {available.length === 0 ? 'All services added' : 'Add a service'}
                </Text>
                {available.length > 0 && <Icon name={showAdd ? 'expand-less' : 'expand-more'} size={20} color="#94A3B8" />}
              </TouchableOpacity>
              {showAdd && available.map((c) => (
                <TouchableOpacity key={c.id} style={styles.addRow} onPress={() => { toggle(c.id); }} activeOpacity={0.7}>
                  <Text style={styles.addRowText}>{c.name}</Text>
                  <Icon name="add-circle-outline" size={20} color="#16A34A" />
                </TouchableOpacity>
              ))}
            </>
          )}

          <TouchableOpacity style={[styles.saveBtn, actionLoading && styles.saveBtnDisabled]} onPress={handleSave} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Save Services</Text>}
          </TouchableOpacity>
        </View>

        {/* Rates (read-only, admin set) */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Your Rates</Text>
            <Icon name="lock" size={16} color="#94A3B8" />
          </View>
          {loadingRates ? (
            <ActivityIndicator size="small" color="#D94625" style={{ marginVertical: 16 }} />
          ) : serviceRates.length === 0 ? (
            <Text style={styles.emptyText}>No rates set yet.</Text>
          ) : (
            serviceRates.map((r, i) => (
              <View key={r.id ?? i} style={[styles.rateRow, i < serviceRates.length - 1 && styles.catRowBorder]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.rateService}>{r.service?.name || '—'}</Text>
                  <Text style={styles.rateLoc}>{[r.city?.name, r.state?.name].filter(Boolean).join(', ')}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.ratePrice}>{formatRate(r.rate)}</Text>
                  {r.recurringRate != null && <Text style={styles.rateRecurring}>{formatRate(r.recurringRate)}/mo</Text>}
                </View>
              </View>
            ))
          )}
          <Text style={styles.note}>Rate-change requests are handled on the web. Contact your admin.</Text>
        </View>

        {/* Rate change requests (read-only status) */}
        {changeRequests.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Rate Change Requests</Text>
            {changeRequests.map((req, i) => (
              <View key={req.id ?? i} style={[styles.reqRow, i < changeRequests.length - 1 && styles.catRowBorder]}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={styles.reqMsg} numberOfLines={2}>{req.message || 'Rate change request'}</Text>
                  {!!req.adminNotes && <Text style={styles.reqNotes}>{req.adminNotes}</Text>}
                </View>
                <View style={styles.reqStatusPill}>
                  <Text style={styles.reqStatusText}>{titleCase(req.status)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16, gap: 16 },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  cardSub: { fontSize: 13, color: '#64748B', marginTop: 4, marginBottom: 8 },

  catRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  catRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  catNameOn: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A', paddingRight: 12 },

  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FEF2F2', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  removeBtnText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626' },

  addToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 14, marginTop: 4 },
  addToggleText: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#D94625' },
  addRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, paddingHorizontal: 14, backgroundColor: '#F8FAFC', borderRadius: 10, marginBottom: 8,
  },
  addRowText: { flex: 1, fontSize: 14, color: '#334155', paddingRight: 12 },

  saveBtn: { backgroundColor: '#D94625', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#FFFFFF' },

  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  rateService: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  rateLoc: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  ratePrice: { fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  rateRecurring: { fontSize: 12, color: '#64748B', marginTop: 2 },
  note: { fontSize: 12, color: '#94A3B8', marginTop: 12 },

  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  reqMsg: { fontSize: 13, color: '#334155' },
  reqNotes: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  reqStatusPill: { backgroundColor: '#F1F5F9', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  reqStatusText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, color: '#475569' },
});

export default ServiceOffered;
