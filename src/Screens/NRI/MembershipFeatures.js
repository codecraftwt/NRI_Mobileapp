import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
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
      <Header navigation={navigation} title={`${planName || 'Plan'} Features`} showBack />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerBox}>
          <Text style={styles.headerTitle}>
            What's included in <Text style={{ color: colors.primary }}>{planName || 'Plan'}</Text>?
          </Text>
          <Text style={styles.headerSubtitle}>Here is everything you get with your active membership plan.</Text>
        </View>

        <View style={styles.featuresContainer}>
          {features.map((feature, idx) => {
            const iconName = FEATURE_ICONS[feature.slug] || 'check-circle';
            return (
              <View key={feature.id ?? idx} style={styles.featureCard}>
                <View style={styles.iconBox}>
                  <Icon name={iconName} size={22} color={colors.primary} />
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
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40 },
  
  headerBox: {
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  headerTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },

  featuresContainer: {
    gap: 16,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  featureTextCol: {
    flex: 1,
  },
  featureName: {
    ...typography.labelMedium,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  featureValue: {
    ...typography.labelLarge,
    color: colors.textPrimary,
  },
});

export default MembershipFeatures;
