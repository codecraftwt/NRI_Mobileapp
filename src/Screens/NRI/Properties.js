import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { removeProperty } from '../../Redux/slices/propertiesSlice';
import { useProperties } from '../../Hooks/useProperties';

const TYPE_LABELS = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

function Properties({ navigation }) {
  const dispatch = useDispatch();
  const { properties, loading, failed, retry } = useProperties();

  const handleDelete = (property) => {
    Alert.alert(
      'Delete Property',
      `Are you sure you want to remove ${property.nickname}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(removeProperty(property.id)).unwrap().catch((error) => {
              Alert.alert('Failed', error?.message || 'Could not remove this property.');
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Properties" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
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
                <View style={styles.propertyIcon}>
                  <Icon name={p.type === 'farm' ? 'grass' : 'location-city'} size={20} color="white" />
                </View>
                <View style={styles.propertyInfo}>
                  <Text style={styles.propertyName}>{p.nickname}</Text>
                  <Text style={styles.propertyType}>{TYPE_LABELS[p.type] || p.type}</Text>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => navigation.navigate('AddProperty', { propertyId: p.id })}
                  activeOpacity={0.7}
                >
                  <Icon name="edit" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.actionIconBtnDanger]}
                  onPress={() => handleDelete(p)}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.metaRow}>
                <Icon name="location-on" size={13} color="#94A3B8" />
                <Text style={styles.propertyAddress} numberOfLines={1}>
                  {[p.address, [p.cityName, p.stateName].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {!!p.tenantName && (
                <View style={styles.metaRow}>
                  <Icon name="person" size={13} color="#FF9800" />
                  <Text style={styles.tenantText}>Tenant: {p.tenantName}</Text>
                </View>
              )}
              {p.utilityAccounts.length > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="bolt" size={13} color="#007AFF" />
                  <Text style={styles.utilityText} numberOfLines={1}>
                    {p.utilityAccounts.map(u => `${u.type}: ${u.account}`).join('  ·  ')}
                  </Text>
                </View>
              )}
              {p.attachments.length > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="attach-file" size={13} color="#8B5CF6" />
                  <Text style={styles.utilityText}>{p.attachments.length} attachment{p.attachments.length === 1 ? '' : 's'}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addCard} onPress={() => navigation.navigate('AddProperty')} activeOpacity={0.8}>
          <Icon name="add-location" size={24} color="#007AFF" />
          <Text style={styles.addCardText}>Add Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },

  backToCustomerBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backToCustomerText: { fontSize: 13, color: '#374151', fontWeight: '600' },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { fontSize: 13, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 12.5, color: '#EF4444', fontWeight: '600' },

  propertyCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  propertyIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#F59E0B', justifyContent: 'center', alignItems: 'center' },
  propertyInfo: { flex: 1 },
  propertyName: { fontSize: 15, fontWeight: 'bold', color: '#1E293B' },
  propertyType: { fontSize: 12, color: '#64748B', marginTop: 2 },

  cardActions: { flexDirection: 'row', gap: 6 },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBtnDanger: {
    backgroundColor: '#FFF0F0',
  },

  cardBody: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  propertyAddress: { fontSize: 12.5, color: '#64748B', flexShrink: 1 },
  tenantText: { fontSize: 12.5, color: '#FF9800', fontWeight: '500' },
  utilityText: { fontSize: 12, color: '#64748B', flexShrink: 1 },

  addCard: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 20, justifyContent: 'center', alignItems: 'center', gap: 8, borderWidth: 2, borderColor: '#FFF3E0', borderStyle: 'dashed' },
  addCardText: { color: '#F59E0B', fontSize: 15, fontWeight: '600' },
});

export default Properties;
