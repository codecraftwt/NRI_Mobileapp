import React, { useState, useMemo } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { useAddonPackages } from '../../../Hooks/useAddonPackages';
import { lightColors as colors, typography, spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

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
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
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
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: '#E0F2FE' + '60', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: '#FFEDD5' + '60', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: '#0ea5e9' + '10', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md },
  eyebrow: { fontSize: 12, color: colors.primary, fontFamily: 'Montserrat-Bold', letterSpacing: 1, textAlign: 'center', marginTop: 8 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8, marginBottom: 24, paddingHorizontal: spacing.md },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, height: 56, marginBottom: 16, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  searchInput: { flex: 1, fontSize: 15, fontFamily: 'Poppins-Regular', color: '#1E293B', height: '100%' },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  itemListWrap: { backgroundColor: 'white', borderRadius: radius.xl, paddingHorizontal: spacing.md, marginBottom: 16, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  itemCheckbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: '#CBD5E1', justifyContent: 'center', alignItems: 'center' },
  itemCheckboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemName: { fontSize: 15, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  itemDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#94A3B8', marginTop: 4, lineHeight: 18 },
  itemPrice: { fontSize: 15, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  summaryCard: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  summaryHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTitle: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  summaryBadge: { backgroundColor: colors.primaryLight + '20', borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 4 },
  summaryBadgeText: { fontSize: 11, color: colors.primary, fontFamily: 'Montserrat-Bold' },
  membershipChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F8FAFC', borderRadius: radius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: 12 },
  membershipDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
  membershipChipText: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: '#334155' },
  emptyText: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#94A3B8', textAlign: 'center', paddingVertical: 16 },
  selectedRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F1F5F9', marginTop: 8 },
  selectedName: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#334155', flex: 1, marginRight: 8 },
  selectedPrice: { fontSize: 14, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  couponLabel: { fontSize: 11, color: '#94A3B8', fontFamily: 'Montserrat-Bold', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 },
  couponRow: { flexDirection: 'row', gap: 8 },
  couponInput: { flex: 1, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: radius.lg, paddingHorizontal: 16, height: 48, color: '#1E293B', fontSize: 14, fontFamily: 'Poppins-Regular' },
  applyBtn: { borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, paddingHorizontal: 20, justifyContent: 'center' },
  applyBtnText: { color: colors.primary, fontFamily: 'Montserrat-Bold', fontSize: 14 },
  viewCouponsLink: { fontSize: 13, color: colors.primary, fontFamily: 'Montserrat-SemiBold', marginTop: 10 },
  summaryDivider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 20, marginBottom: 16 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  totalValue: { fontSize: 20, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  ctaBtn: { width: '100%', height: 56, backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 24, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  ctaText: { color: 'white', fontSize: 16, fontFamily: 'Montserrat-Bold' },
  skipRow: { alignItems: 'center', marginTop: 20 },
  skipText: { fontSize: 13, fontFamily: 'Montserrat-SemiBold', color: '#64748B' },
});

export default OnboardingAddons;
