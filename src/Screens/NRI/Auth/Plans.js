import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

function Plans({ navigation }) {
  const plans = [
    {
      id: 'Essential',
      price: '₹9,999',
      period: 'per year',
      popular: false,
      features: [
        { icon: 'location-city', label: 'Property Inspection: 1/quarter' },
        { icon: 'room-service', label: 'Service Requests: 5' },
        { icon: 'report-problem', label: 'Emergency Support: Standard 4 hrs' }
      ],
      btnText: 'Choose Essential',
      btnStyle: 'outline',
      theme: 'light'
    },
    {
      id: 'Family',
      price: '₹24,999',
      period: 'per year',
      popular: true,
      features: [
        { icon: 'favorite', label: 'Parent Care Visits: 2' },
        { icon: 'location-city', label: 'Property Inspection: 1/2 months' },
        { icon: 'room-service', label: 'Service Requests: 10' },
        { icon: 'report-problem', label: 'Emergency Support: Standard 4 hrs' }
      ],
      btnText: 'Choose Family',
      btnStyle: 'filled-orange',
      theme: 'dark'
    },
    {
      id: 'Premium',
      price: '₹49,999',
      period: 'per year',
      popular: false,
      features: [
        { icon: 'favorite', label: 'Parent Care Visits: 4' },
        { icon: 'location-city', label: 'Property Inspection: Monthly' },
        { icon: 'room-service', label: 'Service Requests: 25' },
        { icon: 'report-problem', label: 'Emergency Support: Priority 2 hrs' }
      ],
      btnText: 'Choose Premium',
      btnStyle: 'outline',
      theme: 'light'
    },
    {
      id: 'Elite',
      price: '₹99,999',
      period: 'per year',
      popular: false,
      features: [
        { icon: 'favorite', label: 'Parent Care Visits: 8' },
        { icon: 'location-city', label: 'Property Inspection: Bi-weekly' },
        { icon: 'room-service', label: 'Service Requests: Unlimited' },
        { icon: 'report-problem', label: 'Emergency Support: VIP 1 hr' }
      ],
      btnText: 'Choose Elite',
      btnStyle: 'outline',
      theme: 'light'
    }
  ];

  const handleSelectPlan = (plan) => {
    navigation.navigate('Payment', { plan });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#1E3A8A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Membership Plans</Text>
        <Text style={styles.headerSubtitle}>
          Choose the plan that matches your family and property needs
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {plans.map((plan) => {
          const isDark = plan.theme === 'dark';
          return (
            <View 
              key={plan.id} 
              style={[
                styles.planCard, 
                isDark ? styles.planCardDark : styles.planCardLight
              ]}
            >
              {plan.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <Text style={[styles.planName, isDark ? styles.textWhite : styles.textDark]}>
                {plan.id}
              </Text>
              
              <View style={styles.priceRow}>
                <Text style={[styles.planPrice, isDark ? styles.textWhite : styles.textBlue]}>
                  {plan.price}
                </Text>
                <Text style={[styles.planPeriod, isDark ? styles.textGrayLight : styles.textGrayDark]}>
                  {plan.period}
                </Text>
              </View>

              <View style={styles.featuresList}>
                {plan.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Icon 
                      name={feature.icon} 
                      size={18} 
                      color={isDark ? '#F59E0B' : '#007AFF'} // Orange for dark theme, Blue for light theme
                      style={styles.featureIcon} 
                    />
                    <Text style={[styles.featureText, isDark ? styles.textWhite : styles.textDark]}>
                      {feature.label}
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[
                  styles.selectBtn,
                  plan.btnStyle === 'filled-orange' ? styles.btnOrange : styles.btnBorderBlue
                ]}
                onPress={() => handleSelectPlan(plan)}
              >
                <Text 
                  style={[
                    styles.selectBtnText,
                    plan.btnStyle === 'filled-orange' ? styles.textWhite : styles.textBlue
                  ]}
                >
                  {plan.btnText}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    alignItems: 'center',
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1E3A8A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 20,
  },
  planCard: {
    borderRadius: 16,
    padding: 24,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  planCardLight: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  planCardDark: {
    backgroundColor: '#0F172A', // Dark navy matching the screenshot
    borderWidth: 2,
    borderColor: '#FF7C1A', // Border color matching popular plan
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    alignSelf: 'center',
    backgroundColor: '#FF7C1A', // Orange popular badge
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  popularBadgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Outfit',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 8,
    marginBottom: 20,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  planPeriod: {
    fontSize: 13,
    marginLeft: 6,
  },
  featuresList: {
    marginBottom: 24,
    gap: 12,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    marginRight: 10,
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'Roboto',
  },
  selectBtn: {
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  btnOrange: {
    backgroundColor: '#FF7C1A',
    borderColor: '#FF7C1A',
  },
  btnBorderBlue: {
    backgroundColor: 'transparent',
    borderColor: '#007AFF',
  },
  selectBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  textWhite: {
    color: 'white',
  },
  textDark: {
    color: '#1E293B',
  },
  textBlue: {
    color: '#007AFF',
  },
  textGrayLight: {
    color: '#94A3B8',
  },
  textGrayDark: {
    color: '#64748B',
  },
});

export default Plans;
