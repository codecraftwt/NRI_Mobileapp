import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import StepIndicator from '../../../Components/StepIndicator';
import OnboardingTopBar from '../../../Components/OnboardingTopBar';
import { ONBOARDING_STEPS } from '../../../Constants/onboardingCatalog';
import { updateProfile, setOnboarded } from '../../../Redux/slices/userSlice';

const NEXT_STEPS = [
  { icon: 'person-add', title: 'Add your family & property details', desc: "Tell us who and what we're looking after so vendors can be matched." },
  { icon: 'chat-bubble-outline', title: 'Meet your Relationship Manager', desc: "They'll message you on WhatsApp within 24 hours to get started." },
  { icon: 'phone-iphone', title: 'Track everything from your dashboard', desc: 'Follow visits, photos, and reports live as they happen.' },
];

function OnboardingWelcome({ route, navigation }) {
  const { plan } = route.params || {};
  const dispatch = useDispatch();

  useEffect(() => {
    dispatch(updateProfile({
      rm: { name: 'Rahul RM', email: 'rm@nricircle.com', phone: '+91 99887 76655', avatar: 'RA' },
    }));
    dispatch(setOnboarded(true));
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <OnboardingTopBar navigation={navigation} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <StepIndicator steps={ONBOARDING_STEPS} currentStep={5} />

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
              <Icon name={step.icon} size={20} color="#007AFF" />
              <View style={{ flex: 1 }}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}

          <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.replace('AppHome')}>
            <Text style={styles.ctaText}>Go to my Dashboard</Text>
            <Icon name="arrow-forward" size={18} color="white" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF3FA' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24, alignItems: 'center', marginTop: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  checkCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#E6F7EF', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  activeBadge: { backgroundColor: '#E6F7EF', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 16 },
  activeBadgeText: { fontSize: 10.5, color: '#10B981', fontWeight: '700', letterSpacing: 0.5 },
  title: { fontSize: 21, fontWeight: 'bold', color: '#0F172A', textAlign: 'center', lineHeight: 27 },
  desc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 19, marginTop: 12, marginBottom: 20 },
  stepRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: '#F0F6FF', borderRadius: 12, padding: 14, marginBottom: 10, alignSelf: 'stretch' },
  stepTitle: { fontSize: 13.5, fontWeight: '700', color: '#1E293B' },
  stepDesc: { fontSize: 12, color: '#64748B', marginTop: 3, lineHeight: 17 },
  ctaBtn: { flexDirection: 'row', backgroundColor: '#FF7C1A', height: 52, borderRadius: 26, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 12, alignSelf: 'stretch' },
  ctaText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});

export default OnboardingWelcome;
