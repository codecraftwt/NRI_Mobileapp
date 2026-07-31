import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Modal } from 'react-native';
import { WebView } from 'react-native-webview';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { typography, spacing, radius, STATUS_BAR_HEIGHT } from '../../theme';
import { removeProperty } from '../../Redux/slices/propertiesSlice';
import { useProperties } from '../../Hooks/useProperties';
import { useToast } from '../../context/ToastContext';

const TYPE_LABELS = { flat: 'Flat', house: 'House', farm: 'Farm / Agricultural Land', commercial: 'Commercial', plot: 'Plot' };

function InfoRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{String(value)}</Text>
    </View>
  );
}

function Properties({ navigation }) {
  const dispatch = useDispatch();
  const { properties, loading, failed, retry } = useProperties();
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();

  const [viewProperty, setViewProperty] = useState(null);
  const [viewerDoc, setViewerDoc] = useState(null); // in-app document/photo viewer
  const [refreshing, setRefreshing] = useState(false);

  // Open an attachment inside the app (WebView). PDFs go through a viewer
  // wrapper so Android's WebView renders them; images load directly.
  const openAttachment = (a) => {
    if (!a.url) { showAlert('Not Available', 'This attachment has no viewable file.'); return; }
    const isPhoto = a.type === 'photo' || /\.(png|jpe?g|gif|webp)$/i.test(a.url);
    const viewerUrl = isPhoto ? a.url : `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(a.url)}`;
    setViewerDoc({ name: a.label || (isPhoto ? 'Photo' : 'Document'), url: viewerUrl });
  };
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

        {!loading && !failed && properties.length === 0 && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIconBox}>
              <Icon name="location-city" size={36} color="#1E3A8A" />
            </View>
            <Text style={styles.emptyTitle}>No properties yet</Text>
            <Text style={styles.emptyText}>Add your first property to track inspections, tenants, utilities and documents — all in one place.</Text>
          </View>
        )}

        {properties.map(p => (
          <TouchableOpacity key={p.id} style={styles.propertyCard} activeOpacity={0.9} onPress={() => setViewProperty(p)}>
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
          </TouchableOpacity>
        ))}

      </ScrollView>

      {/* Floating Add Property button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => navigation.navigate('AddProperty')}>
        <Icon name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Property details */}
      <Modal visible={!!viewProperty} transparent animationType="slide" onRequestClose={() => setViewProperty(null)}>
        <View style={styles.detailOverlay}>
          <View style={styles.detailSheet}>
            <View style={styles.detailHandle} />
            {!!viewProperty && (
              <>
                <View style={styles.detailHeader}>
                  <View style={[styles.propertyIcon, { backgroundColor: viewProperty.type === 'farm' ? '#D1FAE5' : '#FFEDD5' }]}>
                    <Icon name={viewProperty.type === 'farm' ? 'grass' : 'location-city'} size={24} color={viewProperty.type === 'farm' ? '#059669' : '#F97316'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{viewProperty.nickname}</Text>
                    <Text style={styles.detailType}>{TYPE_LABELS[viewProperty.type] || viewProperty.type}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setViewProperty(null)} style={styles.detailClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 12 }}>
                  <InfoRow label="Address" value={viewProperty.address} />
                  <InfoRow label="City / State" value={[viewProperty.cityName, viewProperty.stateName].filter(Boolean).join(', ')} />
                  <InfoRow label="Pincode" value={viewProperty.pincode} />
                  <InfoRow label="Area (sqft)" value={viewProperty.areaSqft} />
                  <InfoRow label="Bedrooms" value={viewProperty.numBedrooms} />
                  <InfoRow label="Tenant" value={viewProperty.tenantName} />
                  <InfoRow label="Tenant Phone" value={viewProperty.tenantPhone} />

                  {viewProperty.utilityAccounts.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Utility Accounts</Text>
                      {viewProperty.utilityAccounts.map((u, i) => (
                        <View key={i} style={styles.infoRow}>
                          <Text style={styles.infoLabel}>{u.type}</Text>
                          <Text style={styles.infoValue}>{u.account}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {!!viewProperty.notes && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Notes</Text>
                      <Text style={styles.detailNotes}>{viewProperty.notes}</Text>
                    </View>
                  )}

                  {viewProperty.attachments.length > 0 && (
                    <View style={styles.detailSection}>
                      <Text style={styles.detailSectionTitle}>Photos & Documents</Text>
                      {viewProperty.attachments.map(a => (
                        <TouchableOpacity
                          key={a.id}
                          style={styles.attachViewRow}
                          activeOpacity={0.7}
                          onPress={() => openAttachment(a)}
                        >
                          <Icon name={a.type === 'photo' ? 'image' : 'description'} size={18} color="#1E3A8A" />
                          <Text style={styles.attachViewLabel} numberOfLines={1}>{a.label || (a.type === 'photo' ? 'Photo' : 'Document')}</Text>
                          <Icon name="visibility" size={18} color="#1E3A8A" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={styles.detailEditBtn}
                    onPress={() => { const id = viewProperty.id; setViewProperty(null); navigation.navigate('AddProperty', { propertyId: id }); }}
                  >
                    <Icon name="edit" size={18} color="#FFFFFF" />
                    <Text style={styles.detailEditBtnText}>Edit Property</Text>
                  </TouchableOpacity>
                </ScrollView>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* In-app attachment viewer */}
      <Modal visible={!!viewerDoc} animationType="slide" onRequestClose={() => setViewerDoc(null)}>
        <View style={styles.viewerContainer}>
          <View style={styles.viewerHeader}>
            <Text style={styles.viewerTitle} numberOfLines={1}>{viewerDoc?.name}</Text>
            <TouchableOpacity onPress={() => setViewerDoc(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={styles.viewerClose}>
              <Icon name="close" size={22} color="#0F172A" />
            </TouchableOpacity>
          </View>
          {!!viewerDoc && (
            <WebView
              source={{ uri: viewerDoc.url }}
              style={{ flex: 1 }}
              startInLoadingState
              renderLoading={() => <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#1E3A8A" />}
            />
          )}
        </View>
      </Modal>

      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 100, gap: 16, zIndex: 2 },

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

  emptyCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, borderWidth: 1, borderColor: '#E0E7FF',
    paddingVertical: 48, paddingHorizontal: 24, alignItems: 'center',
    shadowColor: '#1E3A8A', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 24, elevation: 4,
  },
  emptyIconBox: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EEF2FF', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#64748B', textAlign: 'center', lineHeight: 22 },

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

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1E3A8A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  infoLabel: { fontSize: 13, color: '#64748B', fontWeight: '600' },
  infoValue: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600', textAlign: 'right' },

  detailOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  detailSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '85%', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 28 },
  detailHandle: { width: 44, height: 5, borderRadius: 3, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', marginBottom: 8 },
  detailName: { fontSize: 18, fontWeight: '800', color: '#0F172A' },
  detailType: { fontSize: 13, color: '#64748B', marginTop: 3 },
  detailClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
  detailSection: { marginTop: 16 },
  detailSectionTitle: { fontSize: 12, fontWeight: '800', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  detailNotes: { fontSize: 14, color: '#334155', lineHeight: 21, paddingVertical: 6 },
  attachViewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  attachViewLabel: { flex: 1, fontSize: 14, color: '#0F172A', fontWeight: '600' },
  detailEditBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1E3A8A', borderRadius: 14, paddingVertical: 15, marginTop: 24 },
  detailEditBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },

  viewerContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  viewerHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: STATUS_BAR_HEIGHT, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  viewerTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#0F172A' },
  viewerClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
});

export default Properties;
