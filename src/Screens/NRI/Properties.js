import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography, spacing, radius } from '../../theme';
import { removeProperty } from '../../Redux/slices/propertiesSlice';
import { useProperties } from '../../Hooks/useProperties';
import { useToast } from '../../context/ToastContext';

const TYPE_LABELS = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

function Properties({ navigation }) {
  const dispatch = useDispatch();
  const { properties, loading, failed, retry } = useProperties();
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (not memoized by the
  // hook) — keeping it out of these deps avoids an infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleDelete = (property) => {
    showAlert(
      'Delete Property',
      `Are you sure you want to remove ${property.nickname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(removeProperty(property.id))
              .unwrap()
              .then(() => {
                showToast(`${property.nickname} removed successfully`);
              })
              .catch((error) => {
                showAlert('Failed', error?.message || 'Could not remove this property.');
              });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Properties" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={styles.loadingText}>Loading properties…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load properties. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {properties.map(p => (
          <View key={p.id} style={styles.propertyCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.propertyIcon, { backgroundColor: p.type === 'farm' ? '#D1FAE5' : '#FFEDD5' }]}>
                  <Icon name={p.type === 'farm' ? 'grass' : 'location-city'} size={24} color={p.type === 'farm' ? '#059669' : '#F97316'} />
                </View>
                <View style={styles.propertyInfo}>
                  <Text style={styles.propertyName}>{p.nickname}</Text>
                  <Text style={styles.propertyType}>{TYPE_LABELS[p.type] || p.type}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => navigation.navigate('AddProperty', { propertyId: p.id })}
                  activeOpacity={0.7}
                >
                  <Icon name="edit" size={18} color="#1E3A8A" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.actionBtnDanger]}
                  onPress={() => handleDelete(p)}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.metaRow}>
                <Icon name="location-on" size={16} color="#64748B" />
                <Text style={styles.propertyAddress} numberOfLines={1}>
                  {[p.address, [p.cityName, p.stateName].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {!!p.tenantName && (
                <View style={styles.metaRow}>
                  <Icon name="person" size={16} color="#F97316" />
                  <Text style={styles.tenantText}>Tenant: {p.tenantName}</Text>
                </View>
              )}
              {p.utilityAccounts.length > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="bolt" size={16} color="#D94625" />
                  <Text style={styles.utilityText} numberOfLines={1}>
                    {p.utilityAccounts.map(u => `${u.type}: ${u.account}`).join('  ·  ')}
                  </Text>
                </View>
              )}
              {p.attachments.length > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="attach-file" size={16} color="#1E3A8A" />
                  <Text style={styles.utilityText}>{p.attachments.length} attachment{p.attachments.length === 1 ? '' : 's'}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addCard} onPress={() => navigation.navigate('AddProperty')} activeOpacity={0.8}>
          <View style={styles.addIconWrap}>
            <Icon name="add" size={22} color="#1E3A8A" />
          </View>
          <Text style={styles.addCardText}>Add Property</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16, zIndex: 2 },

  backToCustomerBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backToCustomerText: { fontSize: 13, color: '#0F172A', fontWeight: '600' },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { fontSize: 15, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },

  propertyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  propertyIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  propertyType: { fontSize: 14, color: '#64748B', marginTop: 4 },

  cardActions: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },

  cardBody: { gap: 12, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  propertyAddress: { fontSize: 14, color: '#475569', flexShrink: 1, lineHeight: 20 },
  tenantText: { fontSize: 14, color: '#F97316', fontWeight: '600' },
  utilityText: { fontSize: 14, color: '#475569', flexShrink: 1 },

  addCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
    borderWidth: 1.5,
    borderColor: '#1E3A8A',
    borderStyle: 'dashed',
  },
  addIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardText: { color: '#1E3A8A', fontSize: 15, fontWeight: '700' },
});

export default Properties;
