import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, TextInput, BackHandler } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';
import { useVendorProfile, useVendorRates } from '../../Hooks/Vendor/useVendorProfile';
import { getServiceGroups } from '../../Api/catalogApi';

const formatRate = (v) => (v == null ? '—' : `₹${Number(v).toLocaleString('en-IN')}`);
const titleCase = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

// A stable key for an area from its state/city names — shared by the area list
// and the rate index so a service's rate can be looked up per area.
const areaKeyOf = (state, city) => `${state || ''}|${city || ''}`;

// Icon / accent / short description per category name (mirrors the customer
// catalog so the vendor's category cards read the same as service-ss-1).
const categoryDetails = {
  'Parent Care': { icon: 'favorite-border', color: '#D94625', desc: 'Scheduled visits, wellness reports & escort services' },
  'Parent & Elder Care': { icon: 'favorite-border', color: '#D94625', desc: 'Scheduled visits, wellness reports & escort services' },
  'Property Management': { icon: 'domain', color: '#1E3A8A', desc: 'Inspections, tenant management & maintenance' },
  'Property Care': { icon: 'domain', color: '#1E3A8A', desc: 'Inspections, tenant management & maintenance' },
  'Government Documentation': { icon: 'account-balance', color: '#92400E', desc: '7/12, PAN, Aadhaar, Passport, OCI & more' },
  'Govt. Documents': { icon: 'account-balance', color: '#92400E', desc: '7/12, PAN, Aadhaar, Passport, OCI & more' },
  'Legal Services': { icon: 'gavel', color: '#047857', desc: 'Will drafting, NRI tax, FEMA & investments' },
  'Legal & Finance': { icon: 'gavel', color: '#047857', desc: 'Will drafting, NRI tax, FEMA & investments' },
  'Travel & Transport': { icon: 'airport-shuttle', color: '#4338CA', desc: 'Airport pickup, car rental & India visit planning' },
  'Travel Assistance': { icon: 'flight', color: '#8B5CF6', desc: 'Flight bookings, visa assistance & more' },
  'Transportation': { icon: 'directions-car', color: '#F59E0B', desc: 'Airport pickups, local car rentals' },
  'Home Repair': { icon: 'build', color: '#B45309', desc: 'Repairs, renovations, AC service & cleaning' },
  'Home Maintenance': { icon: 'build', color: '#B45309', desc: 'Repairs, renovations, AC service & cleaning' },
  'Medical Assistance': { icon: 'medical-services', color: '#EF4444', desc: 'Medical emergency, doctor appointments' },
  'Financial Services': { icon: 'trending-up', color: '#3B82F6', desc: 'MF, FD, NPS, real estate & demat setup' },
  'Insurance Services': { icon: 'shield', color: '#10B981', desc: 'Health, life, property insurance assistance' },
  'Farm Management': { icon: 'grass', color: '#10B981', desc: 'Farm inspections, crop reports & mandi rates' },
  'Education': { icon: 'school', color: '#8B5CF6', desc: 'School admissions, tuitions & college guidance' },
  'Gifts & Events': { icon: 'card-giftcard', color: '#EC4899', desc: 'Birthdays, festivals, pujas & celebrations' },
  'Gift Delivery': { icon: 'card-giftcard', color: '#EC4899', desc: 'Send cakes, flowers & custom gifts' },
  'Cleaning': { icon: 'cleaning-services', color: '#3B82F6', desc: 'Deep cleaning, maid services, pest control' },
  'Pet Care': { icon: 'pets', color: '#10B981', desc: 'Pet boarding, vet visits & grooming' },
  'Emergency (24x7)': { icon: 'error-outline', color: '#EF4444', desc: 'Medical, property & legal emergency response' },
  'Emergency Services': { icon: 'error-outline', color: '#EF4444', desc: '24x7 medical & legal emergencies' },
  'Vehicle Care': { icon: 'car-repair', color: '#64748B', desc: 'RC renewal, PUC, insurance & servicing' },
  'Vehicle Services': { icon: 'car-repair', color: '#64748B', desc: 'Servicing, RC renewal & insurance' },
  'Religious & Astrology Services': { icon: 'stars', color: '#F59E0B', desc: 'Puja arrangements, astrology & rituals' },
  'Return to India Planning': { icon: 'flight-land', color: '#10B981', desc: 'Relocation, housing & school planning' },
  'Annual India Visit Planning': { icon: 'card-travel', color: '#EC4899', desc: 'Itinerary planning, stay & transport' },
  'Education & Admission Assistance': { icon: 'school', color: '#8B5CF6', desc: 'School/college admissions & guidance' },
  'Custom Task': { icon: 'assignment', color: '#3B82F6', desc: 'Need something else? Let us know' },
};
const detailsFor = (name) =>
  categoryDetails[name] || { icon: 'category', color: '#64748B', desc: 'Explore this service category' };

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

  // Drill-down: locations -> categories -> services. `null` at each level means
  // that level's picker is showing. Services per category are fetched once and
  // cached by category id.
  const [selectedArea, setSelectedArea] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [servicesByCat, setServicesByCat] = useState({});
  const [serviceTab, setServiceTab] = useState('onetime'); // 'onetime' | 'recurring'
  const [search, setSearch] = useState('');

  // Fetch a category's services split into one-time (allows_single_use) and
  // recurring (allows_recurring) buckets — the two tabs on the service screen.
  const loadServices = useCallback((categoryId) => {
    setServicesByCat(prev => {
      if (prev[categoryId]) return prev; // already loaded / loading
      getServiceGroups({ categoryId })
        .then(({ oneTime, recurring }) => setServicesByCat(p => ({ ...p, [categoryId]: { loading: false, oneTime, recurring } })))
        .catch(() => setServicesByCat(p => ({ ...p, [categoryId]: { loading: false, oneTime: [], recurring: [], error: true } })));
      return { ...prev, [categoryId]: { loading: true, oneTime: [], recurring: [] } };
    });
  }, []);

  const openArea = (area) => { setSelectedArea(area); setSearch(''); };
  const openCategory = (cat) => { setSelectedCategory(cat); setServiceTab('onetime'); loadServices(cat.id); };
  const backToAreas = () => { setSelectedArea(null); setSearch(''); };
  const backToCategories = () => setSelectedCategory(null);

  // Android hardware back walks up one drill-down level before leaving the screen.
  useEffect(() => {
    const onBack = () => {
      if (selectedCategory) { backToCategories(); return true; }
      if (selectedArea) { backToAreas(); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [selectedArea, selectedCategory]);

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
  const serviceAreas = getServiceAreas(profile, serviceRates);
  const rateIndex = indexRatesByServiceArea(serviceRates);
  const categories = (profile?.services || []).map(c => ({ ...c, ...detailsFor(c.name) }));

  // ---------------------------------------------------------------- LEVEL 3
  // Services under the selected category, in the selected area (service-ss-2).
  if (selectedArea && selectedCategory) {
    const entry = servicesByCat[selectedCategory.id];
    const isRecurring = serviceTab === 'recurring';
    const list = isRecurring ? (entry?.recurring || []) : (entry?.oneTime || []);
    const accent = selectedCategory.color || '#D94625';

    return (
      <View style={styles.container}>
        <Header navigation={navigation} title={selectedCategory.name} showBack onBack={backToCategories} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          {/* Hero — category identity + area (no booking CTA) */}
          <View style={[styles.hero, { backgroundColor: accent + '12' }]}>
            <View style={[styles.heroIconBox, { backgroundColor: accent + '22' }]}>
              <Icon name={selectedCategory.icon} size={26} color={accent} />
            </View>
            <Text style={styles.heroTitle}>{selectedCategory.name}</Text>
            {!!selectedCategory.desc && <Text style={styles.heroDesc}>{selectedCategory.desc}</Text>}
            <View style={styles.heroLocRow}>
              <Icon name="place" size={14} color={accent} />
              <Text style={[styles.heroLocText, { color: accent }]} numberOfLines={1}>{selectedArea.label}</Text>
            </View>
          </View>

          {/* One-Time / Recurring tabs */}
          <View style={styles.tabBar}>
            {[{ key: 'onetime', label: 'One-Time' }, { key: 'recurring', label: 'Recurring' }].map(t => {
              const active = serviceTab === t.key;
              return (
                <TouchableOpacity key={t.key} style={[styles.tab, active && styles.tabActive]} activeOpacity={0.8} onPress={() => setServiceTab(t.key)}>
                  <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Service rows — one-time & recurring rates (admin set) */}
          {entry?.loading ? (
            <ActivityIndicator size="small" color="#D94625" style={{ marginVertical: 28 }} />
          ) : entry?.error ? (
            <Text style={styles.mutedRow}>Couldn't load services. Go back and try again.</Text>
          ) : list.length === 0 ? (
            <Text style={styles.mutedRow}>No {isRecurring ? 'recurring' : 'one-time'} services in this category.</Text>
          ) : (
            list.map((s) => {
              const r = rateIndex.get(`${s.id}::${selectedArea.key}`);
              const turnaround = s.pricing?.turnaroundLabel || 'Standard turnaround';
              const rate = isRecurring ? r?.recurringRate : r?.rate;
              return (
                <View key={s.id} style={styles.svcCard}>
                  <View style={styles.svcInfo}>
                    <Text style={styles.svcName} numberOfLines={2}>{s.name}</Text>
                    <Text style={styles.svcTurn}>{turnaround}</Text>
                  </View>
                  <View style={styles.svcPriceCol}>
                    {loadingRates ? (
                      <Text style={styles.priceMuted}>Loading…</Text>
                    ) : rate != null ? (
                      <>
                        <Text style={styles.rateValue}>{formatRate(rate)}</Text>
                        <Text style={styles.rateUnit}>{isRecurring ? 'per month' : 'one-time'}</Text>
                      </>
                    ) : (
                      <Text style={styles.priceMuted}>Rate not set</Text>
                    )}
                  </View>
                </View>
              );
            })
          )}

          <Text style={styles.footerNote}>More services available on request. Rates are admin set.</Text>
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------- LEVEL 2
  // Category list for the selected area (service-ss-1).
  if (selectedArea) {
    const q = search.toLowerCase().trim();
    const visible = categories.filter(c => c.name.toLowerCase().includes(q));
    return (
      <View style={styles.container}>
        <Header navigation={navigation} title="Select a Category" showBack onBack={backToAreas} />
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

          <View style={styles.areaChip}>
            <Icon name="location-on" size={16} color="#2563EB" />
            <Text style={styles.areaChipText} numberOfLines={1}>{selectedArea.label}</Text>
          </View>

          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#64748B" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search services..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {visible.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>{categories.length === 0 ? 'No categories assigned yet.' : 'No categories match your search.'}</Text>
            </View>
          ) : (
            <View style={styles.catList}>
              {visible.map(cat => (
                <TouchableOpacity key={cat.id} style={styles.catCard} activeOpacity={0.7} onPress={() => openCategory(cat)}>
                  <View style={[styles.catIcon, { backgroundColor: cat.color + '15' }]}>
                    <Icon name={cat.icon} size={24} color={cat.color} />
                  </View>
                  <View style={styles.catInfo}>
                    <Text style={styles.catName} numberOfLines={1}>{cat.name}</Text>
                    <Text style={styles.catDesc} numberOfLines={1}>{cat.desc}</Text>
                  </View>
                  <Icon name="chevron-right" size={20} color="#94A3B8" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ---------------------------------------------------------------- LEVEL 1
  // Location selection (kept as-is) — tapping a location drills into categories.
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
          serviceAreas.map((area) => (
            <TouchableOpacity key={area.key} style={styles.areaCard} activeOpacity={0.7} onPress={() => openArea(area)}>
              <View style={styles.areaBadge}>
                <Icon name="location-on" size={18} color="#2563EB" />
              </View>
              <Text style={styles.areaTitle} numberOfLines={1}>{area.label}</Text>
              <Icon name="chevron-right" size={24} color="#94A3B8" />
            </TouchableOpacity>
          ))
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

  // Area — soft rounded card (kept from the original location UI)
  areaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14,
    backgroundColor: '#FFFFFF', borderRadius: 16, marginTop: 12,
    borderWidth: 1, borderColor: '#EEF2F6',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  areaBadge: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#EEF2FF',
    alignItems: 'center', justifyContent: 'center',
  },
  areaTitle: { flex: 1, fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  // Selected-area chip on the category screen
  areaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: '#EEF2FF', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7, marginBottom: 16,
  },
  areaChipText: { fontSize: 13, color: '#2563EB', fontFamily: typography.labelMedium.fontFamily, maxWidth: 260 },

  // Search bar (service-ss-1)
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16,
    paddingHorizontal: 16, height: 52, gap: 12, marginBottom: 20,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#0F172A', height: '100%' },

  // Category cards (service-ss-1)
  catList: { gap: 16 },
  catCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    alignItems: 'center', gap: 16, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 16, elevation: 3,
  },
  catIcon: { width: 52, height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  catInfo: { flex: 1, justifyContent: 'center', gap: 4 },
  catName: { fontSize: 16, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  catDesc: { fontSize: 13, color: '#64748B' },

  // Category hero (service-ss-2, minus the booking CTA)
  hero: { borderRadius: 20, padding: 20, marginBottom: 20 },
  heroIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroTitle: { fontSize: 22, fontFamily: typography.h2.fontFamily, color: '#0F172A', letterSpacing: -0.5 },
  heroDesc: { fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 19 },
  heroLocRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  heroLocText: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily },

  // Add-On / Base tabs
  tabBar: { flexDirection: 'row', backgroundColor: '#EFEAE2', borderRadius: 14, padding: 4, marginBottom: 18 },
  tab: { flex: 1, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#64748B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6, elevation: 2 },
  tabText: { fontSize: 13, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  tabTextActive: { color: '#D94625' },

  // Service rows (service-ss-2)
  svcCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16,
    padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  svcInfo: { flex: 1, paddingRight: 12 },
  svcName: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#1E293B', lineHeight: 20 },
  svcTurn: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  svcPriceCol: { alignItems: 'flex-end' },
  rateValue: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#D94625' },
  rateUnit: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  priceMuted: { fontSize: 12, color: '#CBD5E1', fontStyle: 'italic' },
  mutedRow: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingVertical: 24 },

  // Divider used inside the rate-requests card
  svcDivider: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },

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
