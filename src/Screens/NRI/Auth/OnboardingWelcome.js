import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import PendingRecurringBundleModal from '../../../Components/PendingRecurringBundleModal';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, setOnboarded } from '../../../Redux/slices/userSlice';
import { markOnboardingComplete, onboardingUserKey } from '../../../Redux/slices/onboardingSlice';
import { lightColors as baseColors, typography, spacing, radius } from '../../../theme';

const C = {
  ...baseColors,
  primary: '#20304C', // Dark blue
  accent: '#A64416',  // Chocolate
};
const colors = C;

const { width: W, height: H } = Dimensions.get('window');

const NEXT_STEPS = [
  { icon: 'person-add', title: 'Add your family & property details', desc: "Tell us who and what we're looking after so vendors can be matched." },
  { icon: 'chat-bubble-outline', title: 'Meet your Relationship Manager', desc: "They'll message you on WhatsApp within 24 hours to get started." },
  { icon: 'phone-iphone', title: 'Track everything from your dashboard', desc: 'Follow visits, photos, and reports live as they happen.' },
];

function OnboardingWelcome({ route, navigation }) {
  const { plan, hasServiceRequests, pendingRecurringBundle } = route.params || {};
  const dispatch = useDispatch();
  const [bundlePaid, setBundlePaid] = useState(false);
  const [showBundleModal, setShowBundleModal] = useState(false);

  // Always land on the Dashboard/Home tab — it's also where the pending
  // recurring bundle prompt persists (see PendingRecurringBundleModal above),
  // so a customer who skips it here still sees it right after entering the app.
  const enterApp = () => {
    navigation.replace('AppHome');
  };
  // Select a STABLE primitive key, not the whole user object — the effect
  // below mutates the user (updateProfile/setOnboarded), so depending on the
  // object would re-run it every render and hit "Maximum update depth".
  const userId = useSelector(s => onboardingUserKey(s.user.user));

  useEffect(() => {
    dispatch(updateProfile({
      rm: { name: 'Rahul RM', email: 'rm@nricircle.com', phone: '+91 99887 76655', avatar: 'RA' },
    }));
    dispatch(setOnboarded(true));
    // Persist completion so it survives logout — this is what stops a
    // re-login from resuming the wizard once onboarding is genuinely done.
    if (userId != null) dispatch(markOnboardingComplete(userId));
  }, [dispatch, userId]);

  return (
    <View style={styles.container}>
      <View style={styles.bgShape1} />
      <View style={styles.bgShape2} />
      <View style={styles.bgShape3} />
      <OnboardingTopBar navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={3} />

        <View style={styles.card}>
          <View style={styles.checkCircle}>
            <Icon name="check" size={32} color="#10B981" />
          </View>
          <View style={styles.activeBadge}>
            <Text style={styles.activeBadgeText}>MEMBERSHIP ACTIVE</Text>
          </View>
          <Text style={styles.title}>You're all set, welcome to NRI Circle 🎉</Text>
          <Text style={styles.desc}>
            Your {plan?.name || 'Family'} membership is active. Your dedicated Relationship Manager will reach out on WhatsApp within 24 hours to introduce themselves and confirm your family's details.
          </Text>

          {NEXT_STEPS.map(step => (
            <View key={step.title} style={styles.stepRow}>
              <Icon name={step.icon} size={20} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.ctaBtn} onPress={enterApp}>
            <Text style={styles.ctaText}>Go to my Dashboard</Text>
            <Icon name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PendingRecurringBundleModal
        visible={showBundleModal}
        bundle={pendingRecurringBundle}
        onClose={() => setShowBundleModal(false)}
        onSuccess={() => { setShowBundleModal(false); setBundlePaid(true); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF', position: 'relative', overflow: 'hidden' },
  // Dynamic Background Layers matching Auth screen
  bgShape1: { position: 'absolute', top: -H * 0.15, right: -W * 0.3, width: W * 1.5, height: H * 0.5, backgroundColor: C.primary + '10', borderRadius: 80, transform: [{ rotate: '-25deg' }] },
  bgShape2: { position: 'absolute', bottom: -H * 0.2, left: -W * 0.4, width: W * 1.5, height: H * 0.4, backgroundColor: C.accent + '10', borderRadius: 60, transform: [{ rotate: '-35deg' }] },
  bgShape3: { position: 'absolute', top: '35%', left: -W * 0.1, width: W * 1.2, height: H * 0.05, backgroundColor: C.primary + '05', borderRadius: 20, transform: [{ rotate: '15deg' }] },
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: 40, paddingTop: spacing.md },
  card: { backgroundColor: 'white', borderRadius: radius.xl, padding: spacing.lg, alignItems: 'center', marginTop: 12, shadowColor: colors.primaryLight, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.1, shadowRadius: 15, elevation: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.8)' },
  checkCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E6F7EF', alignItems: 'center', justifyContent: 'center', marginBottom: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 3 },
  activeBadge: { backgroundColor: '#10B981', borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 6, marginBottom: 16, shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 2 },
  activeBadgeText: { fontSize: 11, color: 'white', fontFamily: 'Montserrat-Bold', letterSpacing: 0.5 },
  title: { fontSize: 26, fontFamily: 'Montserrat-Bold', color: '#1A1A1A', textAlign: 'center', lineHeight: 32 },
  desc: { fontSize: 14, fontFamily: 'Poppins-Regular', color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginTop: 12, marginBottom: 24 },
  pendingBundleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBEB',
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 16,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#FEF3C7',
  },
  pendingBundleIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF3C7', justifyContent: 'center', alignItems: 'center' },
  pendingBundleTitle: { fontSize: 13.5, fontFamily: 'Montserrat-SemiBold', color: '#92400E' },
  pendingBundleMeta: { fontSize: 11.5, color: '#B45309', marginTop: 3, lineHeight: 16 },
  pendingBundleBtn: { backgroundColor: C.accent, borderRadius: radius.full, paddingHorizontal: 16, paddingVertical: 8 },
  pendingBundleBtnText: { fontSize: 12.5, fontFamily: 'Montserrat-Bold', color: '#FFFFFF' },
  stepRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', backgroundColor: C.primary + '08', borderRadius: radius.lg, padding: 16, marginBottom: 12, alignSelf: 'stretch', borderWidth: 1, borderColor: C.primary + '20' },
  stepTitle: { fontSize: 14, fontFamily: 'Montserrat-SemiBold', color: '#1E293B' },
  stepDesc: { fontSize: 12, fontFamily: 'Poppins-Regular', color: '#64748B', marginTop: 4, lineHeight: 18 },
  ctaBtn: { width: '100%', height: 56, backgroundColor: colors.accent, borderRadius: radius.full, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 20, shadowColor: colors.accent, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, elevation: 5 },
  ctaText: { color: 'white', fontSize: 16, fontFamily: 'Montserrat-Bold' },
});

export default OnboardingWelcome;
