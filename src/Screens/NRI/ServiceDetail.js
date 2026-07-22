import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useServiceGroups } from '../../Hooks/useServiceGroups';
import { typography } from '../../theme';

// Pricing must display in USD (customer_price), not the ₹ display_price.
const formatUsd = (pricing) => {
  if (!pricing) return '';
  if (pricing.isQuoted) return 'On quote';
  const amount = `$${Number(pricing.customerPrice ?? 0).toFixed(2)}`;
  return pricing.unit ? `${amount}/${pricing.unit}` : amount;
};

function ServiceDetail({ route, navigation }) {
  const { category } = route.params;
  const [activeTab, setActiveTab] = useState('oneTime'); // 'oneTime' or 'recurring'
  // Each tab keeps its own selection — a service that exists in BOTH the
  // one-time and recurring lists must not appear selected in the other tab.
  const [oneTimeIds, setOneTimeIds] = useState([]);
  const [recurringIds, setRecurringIds] = useState([]);

  // One-time (allows_single_use) and recurring (allows_recurring) services.
  const { oneTime, recurring, loading } = useServiceGroups(category.name, '');

  const services = activeTab === 'oneTime' ? oneTime : recurring;
  const selectedIds = activeTab === 'oneTime' ? oneTimeIds : recurringIds;

  const toggleService = (id) => {
    const setIds = activeTab === 'oneTime' ? setOneTimeIds : setRecurringIds;
    setIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  };

  const handleBook = () => {
    if (activeTab === 'recurring') {
      navigation.navigate('CreateTicket', {
        initialCategory: category.name,
        requestType: 'recurring',
        initialSubscriptionServiceIds: recurringIds,
      });
      return;
    }
    // Every service picked in the One-Time list is a full service, priced as
    // the base service + extra_services — NOT as add-ons. Sending the extras
    // as add-ons made the quote ignore them, so only the first service's rate
    // showed under Estimated Charges.
    navigation.navigate('CreateTicket', {
      initialCategory: category.name,
      initialBaseServiceIds: oneTimeIds,
      initialAddons: [],
    });
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title={category.name} showBack />

      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={[styles.headerIconBox, { backgroundColor: category.color + '15' }]}>
          <Icon name={category.icon} size={22} color={category.color} />
        </View>
        <Text style={styles.heroDesc}>{category.desc}</Text>

        <TouchableOpacity
          style={[styles.bookBtn, selectedIds.length === 0 && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={selectedIds.length === 0}
        >
          <Text style={styles.bookBtnText}>
            {selectedIds.length > 0 ? `Book ${selectedIds.length} Service${selectedIds.length > 1 ? 's' : ''}` : 'Book This Service'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <View style={styles.tabsWrapper}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'oneTime' && styles.activeTab]}
            onPress={() => setActiveTab('oneTime')}
          >
            <Text style={[styles.tabText, activeTab === 'oneTime' && styles.activeTabText]}>One-Time Request</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'recurring' && styles.activeTab]}
            onPress={() => setActiveTab('recurring')}
          >
            <Text style={[styles.tabText, activeTab === 'recurring' && styles.activeTabText]}>Recurring</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* List */}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#D94625" style={{ marginTop: 40 }} />
        ) : services.length === 0 ? (
          <Text style={styles.emptyText}>
            {activeTab === 'oneTime' ? 'No one-time services available.' : 'No recurring plans available.'}
          </Text>
        ) : (
          services.map(s => {
            const isSelected = selectedIds.includes(s.id);
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.serviceCard, isSelected && styles.serviceCardSelected]}
                onPress={() => toggleService(s.id)}
                activeOpacity={0.7}
              >
                <View style={styles.serviceCardLeft}>
                  <Text style={styles.serviceCardTitle}>{s.name}</Text>
                  <Text style={styles.serviceCardSub} numberOfLines={2}>
                    {s.description || s.pricing?.turnaroundLabel || 'Standard turnaround'}
                  </Text>
                </View>
                <View style={styles.serviceCardRight}>
                  <Text style={styles.serviceCardPrice}>{formatUsd(s.pricing)}</Text>
                  <View style={[styles.addBtn, isSelected && styles.addedBtn]}>
                    <Text style={[styles.addBtnText, isSelected && styles.addedBtnText]}>
                      {isSelected ? '✓ Added' : '+ Add'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7', // Matches the cream background
  },
  heroSection: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    paddingRight: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: typography.h2.fontFamily,
    color: '#1E293B',
    flex: 1,
  },
  headerIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroContent: {
    marginTop: 4,
  },
  heroDesc: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
    lineHeight: 20,
  },
  bookBtn: {
    backgroundColor: '#D94625',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  bookBtnDisabled: {
    backgroundColor: '#CBD5E1', // slate-300
  },
  bookBtnText: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#FFFFFF',
  },
  tabsContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  tabsWrapper: {
    flexDirection: 'row',
    backgroundColor: '#F3EFE9', // Light beige
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontFamily: typography.labelLarge.fontFamily,
    color: '#94A3B8',
  },
  activeTabText: {
    color: '#D94625',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
    paddingTop: 10,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    color: '#94A3B8',
    marginTop: 40,
    fontSize: 14,
  },
  serviceCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  serviceCardSelected: {
    borderColor: '#D94625',
  },
  serviceCardLeft: {
    flex: 1,
    paddingRight: 16,
  },
  serviceCardTitle: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#1E293B',
    marginBottom: 4,
  },
  serviceCardSub: {
    fontSize: 13,
    color: '#94A3B8',
  },
  serviceCardRight: {
    alignItems: 'flex-end',
  },
  serviceCardPrice: {
    fontSize: 16,
    fontFamily: typography.h4.fontFamily,
    color: '#D94625',
    marginBottom: 8,
  },
  addBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D9462540',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 80,
    alignItems: 'center',
  },
  addedBtn: {
    backgroundColor: '#F6FFED',
    borderColor: '#F6FFED',
  },
  addBtnText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#D94625',
  },
  addedBtnText: {
    color: '#059669',
  },
  includedPill: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  includedPillText: {
    fontSize: 12,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#059669',
  }
});

export default ServiceDetail;
