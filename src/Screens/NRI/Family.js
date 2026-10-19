import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { removeFamilyMember } from '../../Redux/slices/familySlice';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';
import { useToast } from '../../context/ToastContext';
import { typography } from '../../theme/typography';

function initialsFor(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// Fallback only — the backend now returns relationship_label (mapped to
// m.relationshipLabel) directly; this just covers a cached/older response
// that doesn't have it yet.
function relationLabel(relationship) {
  if (!relationship) return '';
  return relationship.charAt(0).toUpperCase() + relationship.slice(1);
}

function Family({ navigation }) {
  const dispatch = useDispatch();
  const { members, loading, failed, retry } = useFamilyMembers();
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await retry();
    setRefreshing(false);
  };

  // `retry` is a new function reference every render (the hook doesn't
  // memoize it) — putting it in this deps array recreated the callback each
  // render, and since retry() itself triggers a re-render, that became an
  // infinite refetch loop (the screen never stopped "loading"). Empty deps:
  // fetch once per focus, not once per render.
  useFocusEffect(
    useCallback(() => {
      retry();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleDelete = (member) => {
    showAlert(
      'Delete Member',
      `Are you sure you want to remove ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFamilyMember(member.id))
              .unwrap()
              .then(() => {
                showToast(`${member.name} removed successfully`);
              })
              .catch((error) => {
                showAlert('Failed', error?.message || 'Could not remove this family member.');
              });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="My Family" showBack />

      {/* Fixed at the top so it's always reachable, even with a long member list. */}
      <TouchableOpacity
        style={styles.addBtn}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('AddFamilyMember')}
      >
        <Icon name="person-add" size={18} color="#FFFFFF" />
        <Text style={styles.addBtnText}>Add Family Member</Text>
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#D94625']} tintColor="#D94625" />}
      >

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#D94625" />
            <Text style={styles.loadingText}>Loading family members…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load family members. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {members.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Icon name="group" size={64} color="#94A3B8" />
            <Text style={styles.emptyText}>No family members yet</Text>
            <Text style={styles.emptySubText}>Add your first family member to get started.</Text>
          </View>
        ) : (
          members.map(m => (
            <View key={m.id} style={styles.memberCard}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>{initialsFor(m.name)}</Text>
              </View>

              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>

                <View style={styles.memberSubRow}>
                  <View style={styles.relationPill}>
                    <Text style={styles.relationPillText}>{m.relationshipLabel || relationLabel(m.relationship)}</Text>
                  </View>
                </View>

                {!!(m.phone || m.cityName || m.stateName) && (
                  <View style={styles.metaRow}>
                    <Icon name="call" size={13} color="#64748B" />
                    <Text style={styles.memberMeta} numberOfLines={1}>
                      {[m.phone, [m.cityName, m.stateName].filter(Boolean).join(', ')].filter(Boolean).join(' • ')}
                    </Text>
                  </View>
                )}
                
                {!!m.healthNotes && (
                  <View style={styles.metaRow}>
                    <Icon name="favorite-border" size={13} color="#D97706" />
                    <Text style={styles.memberHealth} numberOfLines={2}>{m.healthNotes}</Text>
                  </View>
                )}
              </View>

              <View style={styles.actionCol}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('AddFamilyMember', { memberId: m.id })}>
                  <Icon name="edit" size={18} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(m)}>
                  <Icon name="delete-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { fontSize: 15, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#DC2626' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  emptySubText: { fontSize: 14, color: '#94A3B8' },

  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFF1E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', color: '#D94625' },

  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', color: '#0F172A' },
  memberSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  relationPill: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 3 },
  relationPillText: { fontSize: 11.5, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', color: '#64748B' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  memberMeta: { fontSize: 13, color: '#64748B', flexShrink: 1 },
  memberHealth: { fontSize: 13, color: '#D97706', flexShrink: 1 },

  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionBtnDanger: {
    backgroundColor: '#FEF2F2',
  },

  addBtn: {
    flexDirection: 'row',
    backgroundColor: '#D94625',
    borderRadius: 18,
    paddingVertical: 15,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 4,
    shadowColor: '#D94625',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  addBtnText: { fontSize: 15, fontFamily: typography.labelMedium.fontFamily, fontWeight: '700', color: '#FFFFFF' },
});

export default Family;
