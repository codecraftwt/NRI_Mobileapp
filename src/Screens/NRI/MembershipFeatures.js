import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const FEATURE_ICONS = {
  'parent-care-visits': 'favorite',
  'medicine-reminder': 'healing',
  'property-inspection': 'home-work',
  'document-assistance': 'description',
  'legal-consultation': 'gavel',
  'service-requests': 'assignment',
  'dedicated-rm': 'support-agent',
  'whatsapp-support': 'chat',
  'app-access': 'phone-android',
  'emergency-support': 'warning',
  'family-members-covered': 'people',
  'coupon-credits': 'local-offer',
  'referral-rewards': 'card-giftcard',
  'auto-renewal-discount': 'autorenew',
  'annual-reports': 'insert-drive-file',
  'express-waiver': 'flash-on',
  'priority-support': 'headset-mic',
};

function MembershipFeatures({ navigation, route }) {
  const { planName, features = [] } = route?.params || {};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>{planName || 'Plan'} Features</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>
            What's included in <Text style={{ color: '#A64416' }}>{planName || 'Plan'}</Text>?
          </Text>
          <Text style={styles.headerSubtitle}>Here is everything you get with your active membership plan.</Text>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, idx) => {
            const iconName = FEATURE_ICONS[feature.slug] || 'check-circle';
            return (
              <View key={feature.id ?? idx} style={styles.featureCard}>
                <View style={styles.iconBox}>
                  <Icon name={iconName} size={22} color="#F97316" />
                </View>
                <View style={styles.featureTextCol}>
                  <Text style={styles.featureName}>{feature.name}</Text>
                  <Text style={styles.featureValue}>{feature.value}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 16,
    backgroundColor: '#20304C',
    gap: 16,
  },
  topTitle: {
    fontSize: 20,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  scrollContent: { padding: 24, paddingBottom: 40 },
  
  headerBox: {
    marginBottom: 28,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: typography.h2.fontFamily,
    color: '#0F172A',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    fontFamily: typography.body.fontFamily || typography.regular?.fontFamily,
    color: '#64748B',
    lineHeight: 22,
  },

  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextCol: {
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#64748B',
    marginBottom: 4,
  },
  featureValue: {
    fontSize: 16,
    fontFamily: typography.labelLarge.fontFamily || typography.h4.fontFamily,
    color: '#0F172A',
  },
});

export default MembershipFeatures;
