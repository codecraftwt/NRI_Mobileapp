import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { removeProperty } from '../../Redux/slices/propertiesSlice';
import { useProperties } from '../../Hooks/useProperties';

const TYPE_LABELS = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

function Properties({ navigation }) {
  const dispatch = useDispatch();
  const { properties, loading, failed, retry } = useProperties();

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
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
                  <Icon name={p.type === 'farm' ? 'grass' : 'location-city'} size={24} color={colors.accent} />
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
                  <Icon name="edit" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.actionIconBtnDanger]}
                  onPress={() => handleDelete(p)}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBody}>
              <View style={styles.metaRow}>
                <Icon name="location-on" size={16} color={colors.textSecondary} />
                <Text style={styles.propertyAddress} numberOfLines={1}>
                  {[p.address, [p.cityName, p.stateName].filter(Boolean).join(', ')].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {!!p.tenantName && (
                <View style={styles.metaRow}>
                  <Icon name="person" size={16} color={colors.accent} />
                  <Text style={styles.tenantText}>Tenant: {p.tenantName}</Text>
                </View>
              )}
              {p.utilityAccounts.length > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="bolt" size={16} color={colors.primary} />
                  <Text style={styles.utilityText} numberOfLines={1}>
                    {p.utilityAccounts.map(u => `${u.type}: ${u.account}`).join('  ·  ')}
                  </Text>
                </View>
              )}
              {p.attachments.length > 0 && (
                <View style={styles.metaRow}>
                  <Icon name="attach-file" size={16} color={colors.primaryDark} />
                  <Text style={styles.utilityText}>{p.attachments.length} attachment{p.attachments.length === 1 ? '' : 's'}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.addCard} onPress={() => navigation.navigate('AddProperty')} activeOpacity={0.8}>
          <Icon name="add" size={24} color={colors.onAccent} />
          <Text style={styles.addCardText}>Add Property</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 16 },

  backToCustomerBtn: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  backToCustomerText: { ...typography.small, color: colors.textPrimary, fontFamily: typography.labelMedium.fontFamily },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },

  propertyCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
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
    gap: 12,
    flex: 1,
  },
  propertyIcon: { width: 48, height: 48, borderRadius: 12, backgroundColor: colors.amberBackground, justifyContent: 'center', alignItems: 'center' },
  propertyInfo: { flex: 1 },
  propertyName: { ...typography.h4, color: colors.textPrimary },
  propertyType: { ...typography.small, color: colors.textSecondary, marginTop: 2 },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceHighlight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBtnDanger: {
    backgroundColor: '#FEE2E2',
  },

  cardBody: { gap: 8, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  propertyAddress: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },
  tenantText: { ...typography.body, color: colors.accent, fontFamily: typography.labelMedium.fontFamily },
  utilityText: { ...typography.body, color: colors.textSecondary, flexShrink: 1 },

  addCard: { 
    flexDirection: 'row', 
    backgroundColor: colors.accent, 
    borderRadius: 24, 
    padding: 16, 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 8,
    marginTop: 8 
  },
  addCardText: { color: colors.onAccent, ...typography.labelLarge },
});

export default Properties;
