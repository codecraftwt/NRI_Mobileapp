import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { useAddonPackages } from '../../../Hooks/useAddonPackages';

function OnboardingAddons({ route, navigation }) {
  const { profile, plan } = route.params || {};
  const wallet = useSelector(state => state.wallet);
  const { packages, loading, failed, retry } = useAddonPackages();

  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);

  const filteredPackages = useMemo(() => {
    if (!search.trim()) return packages;
    const q = search.trim().toLowerCase();
    return packages.filter(p => p.name.toLowerCase().includes(q) || (p.description || '').toLowerCase().includes(q));
  }, [packages, search]);

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const selectedItems = packages.filter(p => selectedIds.includes(p.id));
  const subtotal = selectedItems.reduce((sum, i) => sum + i.priceMonthly, 0);
  const addonsTotal = Math.max(0, subtotal - couponDiscount);

  const handleApplyCoupon = () => {
    const matched = wallet.coupons.find(c => c.code.toUpperCase() === couponCode.trim().toUpperCase());
    if (!matched) {
      Alert.alert('Invalid Coupon', 'The coupon code entered is invalid or expired.');
      return;
    }
    const value = matched.discountType === 'percentage' ? Math.round(subtotal * (matched.discountValue / 100)) : matched.discountValue;
    setCouponDiscount(value);
    Alert.alert('Coupon Applied', `Code ${matched.code} applied successfully.`);
  };

  const handleViewCoupons = () => {
    Alert.alert('Available Coupons', wallet.coupons.map(c => `${c.code} — ${c.description}`).join('\n'));
  };

  const goToPayment = (chosenAddons) => {
    navigation.navigate('OnboardingPayment', {
      profile, plan,
      selectedAddons: chosenAddons,
      addonsSubtotal: chosenAddons.reduce((s, i) => s + i.priceMonthly, 0),
      addonsTotal: Math.max(0, chosenAddons.reduce((s, i) => s + i.priceMonthly, 0) - couponDiscount),
    });
  };

  return (
    <View style={styles.container}>
      <OnboardingTopBar navigation={navigation} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={3} />

        <Text style={styles.eyebrow}>STEP 3 · ADD-ONS</Text>
        <Text style={styles.title}>Enhance your membership</Text>
        <Text style={styles.subtitle}>Add optional monthly services to your plan now, or skip and book them anytime later. You only pay for what you pick.</Text>

        <View style={styles.searchBox}>
          <Icon name="search" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search add-ons — e.g. parent care, property, legal..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading add-on packages…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load add-ons. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        <View style={styles.itemListWrap}>
          {filteredPackages.map(item => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <TouchableOpacity key={item.id} style={styles.itemRow} onPress={() => toggleSelect(item.id)} activeOpacity={0.7}>
                <View style={[styles.itemCheckbox, isSelected && styles.itemCheckboxChecked]}>
                  {isSelected && <Icon name="check" size={13} color="white" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {!!item.description && <Text style={styles.itemDesc}>{item.description}</Text>}
                </View>
                <Text style={styles.itemPrice}>₹{item.priceMonthly.toLocaleString('en-IN')}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.summaryHeaderRow}>
            <Text style={styles.summaryTitle}>Your add-ons</Text>
            <View style={styles.summaryBadge}>
              <Text style={styles.summaryBadgeText}>{selectedIds.length} selected</Text>
            </View>
          </View>

          <View style={styles.membershipChip}>
            <View style={styles.membershipDot} />
            <Text style={styles.membershipChipText}>{plan?.name} membership · ₹{(plan?.price || 0).toLocaleString('en-IN')}/yr</Text>
          </View>

          {selectedItems.length === 0 ? (
            <Text style={styles.emptyText}>No add-ons selected yet — browse and select what you need.</Text>
          ) : (
            selectedItems.map(item => (
              <View key={item.id} style={styles.selectedRow}>
                <Text style={styles.selectedName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.selectedPrice}>₹{item.priceMonthly.toLocaleString('en-IN')}</Text>
              </View>
            ))
          )}

          <Text style={styles.couponLabel}>ADD-ON COUPON</Text>
          <View style={styles.couponRow}>
            <TextInput style={styles.couponInput} placeholder="E.G. CARE499" placeholderTextColor="#94A3B8" autoCapitalize="characters" value={couponCode} onChangeText={setCouponCode} />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCoupon}>
              <Text style={styles.applyBtnText}>Apply</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleViewCoupons}>
            <Text style={styles.viewCouponsLink}>View available coupons</Text>
          </TouchableOpacity>

          <View style={styles.summaryDivider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Add-ons total /month</Text>
            <Text style={styles.totalValue}>₹{addonsTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>

          <TouchableOpacity style={styles.ctaBtn} onPress={() => goToPayment(selectedItems)}>
            <Text style={styles.ctaText}>Continue to payment</Text>
            <Icon name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.skipRow} onPress={() => goToPayment([])}>
            <Text style={styles.skipText}>Skip — I'll add services later</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF3FA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  eyebrow: { fontSize: 11, color: '#007AFF', fontWeight: '700', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 8, marginBottom: 16 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'white', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 10, paddingHorizontal: 12, height: 46, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 13, color: '#1E293B', height: '100%' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  itemListWrap: { backgroundColor: 'white', borderRadius: 12, paddingHorizontal: 14, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  itemCheckboxChecked: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1E293B' },
  itemDesc: { fontSize: 11, color: '#94A3B8', marginTop: 2, lineHeight: 15 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#1E293B' },
  summaryCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  summaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  summaryBadge: { backgroundColor: '#E5F1FF', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  summaryBadgeText: { fontSize: 11, color: '#007AFF', fontWeight: '700' },
  membershipChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F8FAFC', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, marginTop: 12 },
  membershipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  membershipChipText: { fontSize: 12, color: '#334155', fontWeight: '600' },
  emptyText: { fontSize: 12.5, color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 4 },
  selectedName: { fontSize: 12.5, color: '#334155', flex: 1, marginRight: 8 },
  selectedPrice: { fontSize: 12.5, color: '#1E293B', fontWeight: '700' },
  couponLabel: { fontSize: 10.5, color: '#94A3B8', fontWeight: '700', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, paddingHorizontal: 12, height: 42, color: '#1E293B', fontSize: 13 },
  applyBtn: { borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center' },
  applyBtnText: { color: '#007AFF', fontWeight: '700', fontSize: 13 },
  viewCouponsLink: { fontSize: 12, color: '#007AFF', fontWeight: '600', marginTop: 8 },
  summaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 16, marginBottom: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  totalValue: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
  ctaBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 16 },
  ctaText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
  skipRow: { alignItems: 'center', marginTop: 14 },
  skipText: { fontSize: 12.5, color: '#64748B', fontWeight: '600' },
});

export default OnboardingAddons;
