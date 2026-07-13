import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS, PLAN_SUPPORT_FEATURE_SLUGS, PLAN_CARD_FEATURE_SLUGS } from '../../../Constants/onboardingCatalog';
import { usePlans } from '../../../Hooks/usePlans';
import { usePlanDetail } from '../../../Hooks/usePlanDetail';

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
    navigation.navigate('OnboardingAddons', { profile, plan: { id: plan.id, name: plan.name, price: plan.price } });
  };

  const handleContactSales = () => {
    // TODO: submit lead to sales API
    Alert.alert('Contact Sales', 'Our corporate sales team will reach out to discuss custom pricing for your organization.');
  };

  return (
    <View style={styles.container}>
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
  container: { flex: 1, backgroundColor: '#EFF3FA' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8 },
  eyebrow: { fontSize: 10.5, color: '#007AFF', fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 21, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', marginTop: 8 },
  subtitle: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 8 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 20 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },
  planCard: { borderRadius: 16, padding: 20, position: 'relative', backgroundColor: 'white', borderWidth: 1, borderColor: '#E5E7EB', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 2, marginTop: 6 },
  planCardDark: { backgroundColor: '#0F172A', borderWidth: 2, borderColor: '#FF7C1A' },
  popularBadge: { position: 'absolute', top: -10, alignSelf: 'center', backgroundColor: '#FF7C1A', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  popularBadgeText: { color: 'white', fontSize: 9, fontWeight: 'bold', letterSpacing: 0.5 },
  planName: { fontSize: 18, fontWeight: 'bold', color: '#1E293B' },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 6, marginBottom: 14 },
  planPrice: { fontSize: 26, fontWeight: 'bold' },
  planPeriod: { fontSize: 12, marginLeft: 6, color: '#64748B' },
  featuresList: { marginBottom: 14, gap: 9 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureDot: { width: 5, height: 5, borderRadius: 2.5 },
  featureText: { fontSize: 13, color: '#334155' },
  detailsLink: { fontSize: 12.5, color: '#007AFF', fontWeight: '700', marginBottom: 14 },
  selectBtn: { height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  btnOrange: { backgroundColor: '#FF7C1A', borderColor: '#FF7C1A' },
  btnBorderBlue: { backgroundColor: 'transparent', borderColor: '#007AFF' },
  selectBtnText: { fontSize: 14, fontWeight: 'bold' },
  textWhite: { color: 'white' },
  textDark: { color: '#1E293B' },
  textBlue: { color: '#007AFF' },
  textGrayLight: { color: '#94A3B8' },
  corporateLabel: { fontSize: 13, color: '#007AFF', fontWeight: '700' },
  corporatePrice: { fontSize: 20, fontWeight: 'bold', color: '#1E293B', marginTop: 6 },
  corporatePriceNote: { fontSize: 12, color: '#64748B', marginBottom: 14 },

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
