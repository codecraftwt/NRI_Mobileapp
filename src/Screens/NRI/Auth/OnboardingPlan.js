import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS, PLAN_SUPPORT_FEATURE_SLUGS, PLAN_CARD_FEATURE_SLUGS } from '../../../Constants/onboardingCatalog';
import { usePlans } from '../../../Hooks/usePlans';
import { usePlanDetail } from '../../../Hooks/usePlanDetail';
import { lightColors as colors, typography, spacing, radius } from '../../../theme';

const { width: W, height: H } = Dimensions.get('window');

function cardFeatureLines(plan) {
  return PLAN_CARD_FEATURE_SLUGS
    .map(slug => plan.features.find(f => f.slug === slug))
    .filter(Boolean)
    .map(f => `${f.name}: ${f.value}`);
}

function splitFeatures(plan) {
  const support = plan.features.filter(f => PLAN_SUPPORT_FEATURE_SLUGS.includes(f.slug));
  const usage = plan.features.filter(f => !PLAN_SUPPORT_FEATURE_SLUGS.includes(f.slug));
  return { usage, support };
}

function PlanDetailSheet({ plan, visible, onClose, onChoose }) {
  const { detail, loading, fetchDetail } = usePlanDetail();

  useEffect(() => {
    if (visible && plan) {
      fetchDetail(plan.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, plan?.id]);

  if (!plan) return null;
  const activePlan = (detail && detail.id === plan.id) ? detail : plan;
  const { usage, support } = splitFeatures(activePlan);
  const dedicatedRm = activePlan.features.find(f => f.slug === 'dedicated-rm');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.detailSheet}>
          <View style={styles.detailHeaderRow}>
            <View>
              <Text style={styles.detailPlanName}>{activePlan.name}</Text>
              {!!dedicatedRm && (
                <View style={styles.rmTagRow}>
                  <Icon name="badge" size={12} color="#64748B" />
                  <Text style={styles.rmTagText}>{dedicatedRm.value.toUpperCase()}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={22} color="#64748B" />
            </TouchableOpacity>
          </View>

          {loading && !detail ? (
            <View style={styles.detailLoading}>
              <ActivityIndicator size="small" color="#007AFF" />
              <Text style={styles.detailLoadingText}>Loading plan details…</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.detailScroll}>
              <View style={styles.detailPriceRow}>
                <Text style={styles.detailPrice}>
                  {activePlan.isCustomPricing ? 'Custom Pricing' : `₹${activePlan.price.toLocaleString('en-IN')}`}
                </Text>
                {!activePlan.isCustomPricing && <Text style={styles.detailPricePeriod}>/year</Text>}
              </View>
              <Text style={styles.detailDesc}>{activePlan.description}</Text>

              <Text style={styles.detailSectionTitle}>WHAT YOU CAN USE</Text>
              {usage.map(item => (
                <View key={item.id} style={styles.detailBullet}>
                  <Text style={styles.detailBulletDot}>•</Text>
                  <Text style={styles.detailBulletLabel}>{item.name}: <Text style={styles.detailBulletValue}>{item.value}</Text></Text>
                </View>
              ))}

              <Text style={styles.detailSectionTitle}>SUPPORT</Text>
              {support.map(item => (
                <View key={item.id} style={styles.detailBullet}>
                  <Text style={styles.detailBulletDot}>•</Text>
                  <Text style={styles.detailBulletLabel}>{item.name}: <Text style={styles.detailBulletValue}>{item.value}</Text></Text>
                </View>
              ))}

              <View style={styles.detailNoteBox}>
                <Text style={styles.detailNoteText}>Core services are included. Optional add-ons are available to top up your plan after checkout.</Text>
              </View>
            </ScrollView>
          )}

          <TouchableOpacity style={styles.detailChooseBtn} onPress={() => onChoose(activePlan)}>
            <Text style={styles.detailChooseBtnText}>Choose {activePlan.name}</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

function OnboardingPlan({ route, navigation }) {
  const { profile } = route.params || {};
  const [detailPlan, setDetailPlan] = useState(null);
  const { regularPlans, corporatePlan, loading: loadingPlans, failed: plansFailed, retry: retryPlans } = usePlans();

  const handleChoose = (plan) => {
    setDetailPlan(null);
    // Verified live via GET /plans: each plan carries a
    // slug: 'auto-renewal-discount' feature with a value like "5%"/"8%" —
    // varies per plan tier, so it's threaded through to the payment step
    // instead of a hardcoded percentage.
    const autoRenewalDiscount = plan.features?.find(f => f.slug === 'auto-renewal-discount')?.value || null;
    navigation.navigate('OnboardingAddons', { profile, plan: { id: plan.id, name: plan.name, price: plan.price, autoRenewalDiscount } });
  };

  const handleContactSales = () => {
    // TODO: submit lead to sales API
    Alert.alert('Contact Sales', 'Our corporate sales team will reach out to discuss custom pricing for your organization.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
      <OnboardingTopBar navigation={navigation} onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={2} />

        <View style={styles.eyebrowRow}>
          <Icon name="verified" size={13} color="#007AFF" />
          <Text style={styles.eyebrow}>TRUSTED BY NRI FAMILIES ACROSS 28+ STATES</Text>
        </View>
        <Text style={styles.title}>Choose the plan that fits your family</Text>
        <Text style={styles.subtitle}>Every membership includes core services on the ground — add family, property & documents right after checkout.</Text>

        {loadingPlans && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading plans…</Text>
          </View>
        )}
        {plansFailed && (
          <TouchableOpacity style={styles.retryBox} onPress={retryPlans}>
            <Text style={styles.retryText}>Couldn't load plans. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {regularPlans.map(plan => (
          <View key={plan.id} style={[styles.planCard, plan.isPopular && styles.planCardDark]}>
            {plan.isPopular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
              </View>
            )}
            <Text style={[styles.planName, plan.isPopular && styles.textWhite]}>{plan.name}</Text>
            <View style={styles.priceRow}>
              <Text style={[styles.planPrice, plan.isPopular ? styles.textWhite : styles.textDark]}>₹{plan.price.toLocaleString('en-IN')}</Text>
              <Text style={[styles.planPeriod, plan.isPopular && styles.textGrayLight]}>per year</Text>
            </View>
            <View style={styles.featuresList}>
              {cardFeatureLines(plan).map(f => (
                <View key={f} style={styles.featureRow}>
                  <View style={[styles.featureDot, { backgroundColor: plan.isPopular ? '#FF7C1A' : '#007AFF' }]} />
                  <Text style={[styles.featureText, plan.isPopular && styles.textWhite]}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity onPress={() => setDetailPlan(plan)}>
              <Text style={[styles.detailsLink, plan.isPopular && { color: '#FF7C1A' }]}>View details & add-ons</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.selectBtn, plan.isPopular ? styles.btnOrange : styles.btnBorderBlue]}
              onPress={() => handleChoose(plan)}
            >
              <Text style={[styles.selectBtnText, plan.isPopular ? styles.textWhite : styles.textBlue]}>Choose {plan.name}</Text>
            </TouchableOpacity>
          </View>
        ))}

        {corporatePlan && (
          <View style={styles.planCard}>
            <Text style={styles.corporateLabel}>{corporatePlan.name}</Text>
            <Text style={styles.corporatePrice}>Custom Pricing</Text>
            <Text style={styles.corporatePriceNote}>negotiated annually</Text>
            <View style={styles.featuresList}>
              {cardFeatureLines(corporatePlan).map(f => (
                <View key={f} style={styles.featureRow}>
                  <View style={[styles.featureDot, { backgroundColor: '#007AFF' }]} />
                  <Text style={styles.featureText}>{f}</Text>
                </View>
              ))}
            </View>
            <TouchableOpacity style={[styles.selectBtn, styles.btnBorderBlue]} onPress={handleContactSales}>
              <Text style={[styles.selectBtnText, styles.textBlue]}>Contact Sales</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <PlanDetailSheet plan={detailPlan} visible={!!detailPlan} onClose={() => setDetailPlan(null)} onChoose={handleChoose} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: '#E0F2FE' + '60', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: '#FFEDD5' + '60', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: '#0ea5e9' + '10', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { paddingHorizontal: spacing.lg, paddingBottom: 40, paddingTop: spacing.md, gap: 16 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  eyebrow: { fontSize: 11, color: colors.primary, fontFamily: 'Montserrat-Bold', letterSpacing: 0.5 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 8 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  planCard: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.xl, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)', position: 'relative', marginTop: 6 },
  planCardDark: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#FF7C1A' },
  popularBadge: { position: 'absolute', top: -12, alignSelf: 'center', backgroundColor: '#FF7C1A', paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.sm, shadowColor: '#FF7C1A', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 3 },
  popularBadgeText: { color: 'white', fontSize: 10, fontFamily: 'Montserrat-Bold', letterSpacing: 0.5 },
  planName: { fontSize: 22, fontFamily: 'Montserrat-Bold', color: '#1E293B' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, marginBottom: 16 },
  planPrice: { fontSize: 32, fontFamily: 'Montserrat-Bold', letterSpacing: -0.5 },
  planPeriod: { fontSize: 13, fontFamily: 'Poppins-Regular', marginLeft: 6, color: '#64748B' },
  featuresList: { marginBottom: 20, gap: 10 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { fontSize: 14, fontFamily: 'Poppins-Regular', color: '#334155' },
  detailsLink: { fontSize: 13, color: '#007AFF', fontFamily: 'Montserrat-SemiBold', marginBottom: 16 },
  selectBtn: { width: '100%', height: 52, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  btnOrange: { backgroundColor: '#FF7C1A', borderColor: '#FF7C1A', shadowColor: '#FF7C1A', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 4 },
  btnBorderBlue: { backgroundColor: 'transparent', borderColor: '#007AFF' },
  selectBtnText: { fontSize: 15, fontFamily: 'Montserrat-Bold' },
  textWhite: { color: 'white' },
  textDark: { color: '#1E293B' },
  textBlue: { color: '#007AFF' },
  textGrayLight: { color: '#94A3B8' },
  corporateLabel: { fontSize: 14, color: '#007AFF', fontFamily: 'Montserrat-Bold' },
  corporatePrice: { fontSize: 24, fontFamily: 'Montserrat-Bold', color: '#1E293B', marginTop: 6 },
  corporatePriceNote: { fontSize: 13, fontFamily: 'Poppins-Regular', color: '#64748B', marginBottom: 16 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 },
  detailHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detailPlanName: { fontSize: 20, fontWeight: 'bold', color: '#0F172A' },
  rmTagRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  rmTagText: { fontSize: 10, color: '#64748B', fontWeight: '700', letterSpacing: 0.5 },
  detailLoading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 40 },
  detailLoadingText: { fontSize: 13, color: '#64748B' },
  detailScroll: { marginBottom: 12 },
  detailPriceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 4 },
  detailPrice: { fontSize: 26, fontWeight: 'bold', color: '#0F172A' },
  detailPricePeriod: { fontSize: 13, color: '#64748B', marginLeft: 4 },
  detailDesc: { fontSize: 13, color: '#64748B', marginTop: 6, marginBottom: 16, lineHeight: 19 },
  detailSectionTitle: { fontSize: 11, color: '#007AFF', fontWeight: '700', letterSpacing: 0.5, marginBottom: 10, marginTop: 6 },
  detailBullet: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  detailBulletDot: { fontSize: 14, color: '#007AFF', lineHeight: 18 },
  detailBulletLabel: { fontSize: 13, color: '#1E293B', fontWeight: '600', flex: 1 },
  detailBulletValue: { color: '#007AFF', fontWeight: '700' },
  detailNoteBox: { backgroundColor: '#F0F6FF', borderRadius: 10, padding: 12, marginTop: 8, marginBottom: 8 },
  detailNoteText: { fontSize: 12, color: '#334155', lineHeight: 17 },
  detailChooseBtn: { backgroundColor: '#FF7C1A', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  detailChooseBtnText: { color: 'white', fontSize: 15, fontWeight: 'bold' },
});

export default OnboardingPlan;
