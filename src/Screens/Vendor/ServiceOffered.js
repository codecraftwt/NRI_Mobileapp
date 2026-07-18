import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { typography } from '../../theme/typography';

const ALL_SERVICES = [
  'Annual India Visit Planning',
  'Cleaning',
  'Custom Task',
  'Education & Admission Assistance',
  'Emergency Services',
  'Farm Management',
  'Financial Services',
  'Gift Delivery',
  'Government Documentation',
  'Home Repair',
  'Insurance Services',
  'Legal Services',
  'Medical Assistance',
  'Parent Care',
  'Pet Care',
  'Property Management',
  'Religious & Astrology Services',
  'Return to India Planning',
  'Transportation',
  'Travel Assistance',
  'Vehicle Services',
];

const INITIAL_SELECTED = new Set(['Home Repair', 'Cleaning', 'Parent Care', 'Medical Assistance', 'Property Management']);

function getServiceIcon(name) {
  switch (name) {
    case 'Home Repair': return 'home-repair-service';
    case 'Cleaning': return 'cleaning-services';
    case 'Medical Assistance': return 'medical-services';
    case 'Legal Services': return 'gavel';
    case 'Financial Services': return 'account-balance';
    case 'Transportation': return 'directions-car';
    case 'Travel Assistance': return 'flight';
    case 'Property Management': return 'apartment';
    case 'Pet Care': return 'pets';
    case 'Parent Care': return 'elderly';
    case 'Education & Admission Assistance': return 'school';
    case 'Emergency Services': return 'emergency';
    case 'Government Documentation': return 'description';
    case 'Insurance Services': return 'security';
    case 'Vehicle Services': return 'build';
    case 'Farm Management': return 'agriculture';
    case 'Gift Delivery': return 'card-giftcard';
    case 'Religious & Astrology Services': return 'self-improvement';
    case 'Annual India Visit Planning': return 'beach-access';
    case 'Return to India Planning': return 'flight-land';
    case 'Custom Task': return 'tune';
    default: return 'miscellaneous-services';
  }
}

function ServiceOffered({ navigation }) {
  const [selected, setSelected] = useState(INITIAL_SELECTED);

  const toggleService = (service) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(service)) {
        next.delete(service);
      } else {
        next.add(service);
      }
      return next;
    });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Services Offered" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.countCard}>
          <View>
            <Text style={styles.countText}>{selected.size} of {ALL_SERVICES.length}</Text>
            <Text style={styles.countSubtext}>Services selected</Text>
          </View>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{selected.size}</Text>
          </View>
        </View>

        <View style={styles.servicesCard}>
          {ALL_SERVICES.map((service, index) => {
            const isLast = index === ALL_SERVICES.length - 1;
            const isSelected = selected.has(service);
            return (
              <TouchableOpacity
                key={service}
                activeOpacity={0.7}
                onPress={() => toggleService(service)}
                style={[styles.serviceRow, isLast && styles.serviceRowLast]}
              >
                <View style={[styles.serviceIconBox, isSelected && styles.serviceIconBoxActive]}>
                  <Icon name={getServiceIcon(service)} size={20} color={isSelected ? '#FFFFFF' : '#1E3A8A'} />
                </View>
                <Text style={[styles.serviceName, isSelected && styles.serviceNameActive]}>{service}</Text>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Icon name="check" size={16} color="#FFFFFF" />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16, gap: 16 },

  countCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  countText: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  countSubtext: { fontSize: 13, color: '#64748B', marginTop: 2 },
  countBadge: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#D94625',
    justifyContent: 'center', alignItems: 'center',
  },
  countBadgeText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  servicesCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  serviceRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingVertical: 15, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  serviceRowLast: { borderBottomWidth: 0 },
  serviceIconBox: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: '#F1F5F9',
    justifyContent: 'center', alignItems: 'center',
  },
  serviceIconBoxActive: { backgroundColor: '#D94625' },
  serviceName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#64748B' },
  serviceNameActive: { color: '#0F172A' },
  checkbox: {
    width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#E2E8F0',
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxActive: { borderColor: '#D94625', backgroundColor: '#D94625' },
});

export default ServiceOffered;
