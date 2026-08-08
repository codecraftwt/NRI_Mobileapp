import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';
import { useVendorProfile, useVendorRates } from '../../Hooks/useVendorProfile';
import { getServices } from '../../Api/catalogApi';

const formatRate = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// A stable key for an area from its state/city names — shared by the area list
// and the rate index so a service's rate can be looked up per area.
const areaKeyOf = (state, city) => `${state || ''}|${city || ''}`;

// Distinct coverage areas ({ key, label, state, city }) for the vendor — from
// the profile's geo coverage, plus any areas that only appear in the rate list.
function getServiceAreas(profile, serviceRates) {
  const seen = new Set();
  const areas = [];
  const push = (state, city) => {
    const key = areaKeyOf(state, city);
    const label = [city, state].filter(Boolean).join(', ');
    if (!label || seen.has(key)) return;
    seen.add(key);
    areas.push({ key, label, state, city });
  };
  (profile?.geoCoverage || []).forEach(g => push(g.state?.name, g.city?.name));
  serviceRates.forEach(r => push(r.state?.name, r.city?.name));
  return areas;
}

// `${serviceId}::${areaKey}` -> the admin-set rate for that service in that area.
function indexRatesByServiceArea(serviceRates) {
  const map = new Map();
  serviceRates.forEach((r) => {
    if (r.service?.id == null) return;
    map.set(`${r.service.id}::${areaKeyOf(r.state?.name, r.city?.name)}`, r);
  });
  return map;
}

function reqStatusColors(status) {
  switch ((status || '').toLowerCase()) {
    case 'approved':
    case 'accepted': return { bg: '#DCFCE7', text: '#16A34A' };
    case 'rejected':
    case 'declined': return { bg: '#FEE2E2', text: '#DC2626' };
    default: return { bg: '#FEF3C7', text: '#D97706' }; // pending / in review
  }
}

function ServiceOffered({ navigation }) {
  const { profile, loading } = useVendorProfile();
  const { rates, loading: loadingRates } = useVendorRates();

  // Open a location, then a category under it. Services for a category are
  // fetched from the catalog the first time it's opened (cached by category id).
  const [openAreas, setOpenAreas] = useState({});
  const [openCats, setOpenCats] = useState({});
  const [servicesByCat, setServicesByCat] = useState({});

  const toggleArea = (areaKey) => setOpenAreas(prev => ({ ...prev, [areaKey]: !prev[areaKey] }));

  const toggleCat = (areaKey, categoryId) => {
    const composite = `${areaKey}::${categoryId}`;
    setOpenCats(prev => ({ ...prev, [composite]: !prev[composite] }));
    if (!openCats[composite] && !servicesByCat[categoryId]) {
      setServicesByCat(prev => ({ ...prev, [categoryId]: { loading: true, services: [] } }));
      getServices({ categoryId })
        .then(services => setServicesByCat(prev => ({ ...prev, [categoryId]: { loading: false, services } })))
        .catch(() => setServicesByCat(prev => ({ ...prev, [categoryId]: { loading: false, services: [], error: true } })));
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
  const categories = profile?.services || [];
  const serviceAreas = getServiceAreas(profile, serviceRates);
  const rateIndex = indexRatesByServiceArea(serviceRates);

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Services Offered" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.headingRow}>
          <Text style={styles.heading}>Service Areas & Rates</Text>
          <View style={styles.lockRow}>
            <Icon name="lock" size={12} color="#94A3B8" />
            <Text style={styles.lockText}>Admin set</Text>
          </View>
        </View>

        {serviceAreas.length === 0 ? (
          <View style={styles.emptyCard}><Text style={styles.emptyText}>No service areas yet.</Text></View>
        ) : (
          serviceAreas.map((area) => {
            const areaOpen = !!openAreas[area.key];
            return (
              <View key={area.key} style={[styles.areaCard, areaOpen && styles.areaCardOpen]}>
                <TouchableOpacity style={styles.areaHeader} onPress={() => toggleArea(area.key)} activeOpacity={0.7}>
                  <View style={styles.areaBadge}>
                    <Icon name="location-on" size={18} color="#2563EB" />
                  </View>
                  <Text style={styles.areaTitle} numberOfLines={1}>{area.label}</Text>
                  <Icon name={areaOpen ? 'expand-less' : 'expand-more'} size={24} color="#94A3B8" />
                </TouchableOpacity>

                {areaOpen && (
                  <View style={styles.areaBody}>
                    {categories.length === 0 ? (
                      <Text style={styles.emptyText}>No categories assigned yet.</Text>
                    ) : (
                      categories.map((cat, ci) => {
                        const composite = `${area.key}::${cat.id}`;
                        const catOpen = !!openCats[composite];
                        const entry = servicesByCat[cat.id];
                        const services = entry?.services || [];
                        return (
                          <View key={composite} style={[styles.catGroup, ci > 0 && styles.catDivider]}>
                            <TouchableOpacity style={styles.catHeader} onPress={() => toggleCat(area.key, cat.id)} activeOpacity={0.7}>
                              <Icon name="local-offer" size={15} color="#2563EB" style={{ transform: [{ rotate: '90deg' }] }} />
                              <Text style={styles.catName} numberOfLines={2}>{cat.name}</Text>
                              <Icon name={catOpen ? 'remove' : 'add'} size={18} color="#94A3B8" />
                            </TouchableOpacity>

                            {catOpen && (
                              <View style={styles.svcList}>
                                {entry?.loading ? (
                                  <ActivityIndicator size="small" color="#D94625" style={{ marginVertical: 14 }} />
                                ) : entry?.error ? (
                                  <Text style={styles.mutedRow}>Couldn't load services. Try again.</Text>
                                ) : services.length === 0 ? (
                                  <Text style={styles.mutedRow}>No services in this category.</Text>
                                ) : (
                                  services.map((s, i) => {
                                    const r = rateIndex.get(`${s.id}::${area.key}`);
                                    return (
                                      <View key={s.id ?? i} style={[styles.svcRow, i > 0 && styles.svcDivider]}>
                                        <Text style={styles.svcName}>{s.name}</Text>
                                        {r ? (
                                          <Text style={styles.priceLine}>
                                            <Text style={styles.priceValue}>{formatRate(r.rate)}</Text>
                                            <Text style={styles.priceUnit}> one-time</Text>
                                            {r.recurringRate != null && (
                                              <>
                                                <Text style={styles.priceUnit}>  ·  </Text>
                                                <Text style={styles.priceValue}>{formatRate(r.recurringRate)}/mo</Text>
                                                <Text style={styles.priceUnit}> recurring</Text>
                                              </>
                                            )}
                                          </Text>
                                        ) : (
                                          <Text style={styles.priceMuted}>{loadingRates ? 'Loading rate…' : 'Rate not set'}</Text>
                                        )}
                                      </View>
                                    );
                                  })
                                )}
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        {/* Rate change requests (read-only status) */}
        {changeRequests.length > 0 && (
          <View style={styles.reqCard}>
            <Text style={styles.heading}>Rate Change Requests</Text>
            {changeRequests.map((req, i) => {
              const sc = reqStatusColors(req.status);
              return (
                <View key={req.id ?? i} style={[styles.reqRow, i < changeRequests.length - 1 && styles.svcDivider]}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={styles.reqMsg} numberOfLines={2}>{req.message || 'Rate change request'}</Text>
                    {!!req.adminNotes && <Text style={styles.reqNotes}>{req.adminNotes}</Text>}
                  </View>
                  <View style={[styles.reqStatusPill, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.reqStatusText, { color: sc.text }]}>{titleCase(req.status)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.footerNote}>Rates are admin set. Rate-change requests are handled on the web — contact your admin.</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 },

  headingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  heading: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  lockRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  lockText: { fontSize: 11, color: '#94A3B8' },

  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 24, marginTop: 12, borderWidth: 1, borderColor: '#F1F5F9' },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 12 },

  // Area — soft rounded card
  areaCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#EEF2F6',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  areaCardOpen: { borderColor: '#DBE4FF' },
  areaHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  areaBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  areaTitle: { flex: 1, fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  areaBody: { paddingHorizontal: 14, paddingBottom: 6 },

  // Category — lightweight, divider-separated (no nested box)
  catGroup: { paddingVertical: 2 },
  catDivider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 },
  catName: { flex: 1, fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#2563EB' },

  // Services — clean rows with an inline price line
  svcList: { paddingBottom: 8, paddingLeft: 25 },
  svcRow: { paddingVertical: 11 },
  svcDivider: { borderTopWidth: 1, borderTopColor: '#F5F7FA' },
  svcName: { fontSize: 14, color: '#1E293B', lineHeight: 19 },
  priceLine: { marginTop: 5 },
  priceValue: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  priceUnit: { fontSize: 12, color: '#94A3B8' },
  priceMuted: { fontSize: 12, color: '#CBD5E1', marginTop: 5, fontStyle: 'italic' },
  mutedRow: { fontSize: 13, color: '#94A3B8', paddingVertical: 12 },

  // Rate change requests
  reqCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 18, marginTop: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  reqRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  reqMsg: { fontSize: 13, color: '#334155', lineHeight: 18 },
  reqNotes: { fontSize: 12, color: '#94A3B8', marginTop: 3 },
  reqStatusPill: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  reqStatusText: { fontSize: 11, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },

  footerNote: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 17, paddingHorizontal: 8, marginTop: 18 },
});

export default ServiceOffered;
