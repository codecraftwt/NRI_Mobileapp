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

const AVATAR_COLORS = ['#16A34A', '#1E3A8A', '#D97706', '#DC2626', '#8B5CF6', '#06B6D4'];
function avatarColorFor(name) {
  const idx = (name || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

function initialsFor(name) {
  return (name || '')
    .trim()
    .split(/\s+/)
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#1E3A8A" />
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
              <View style={[styles.memberAvatar, { backgroundColor: avatarColorFor(m.name) }]}>
                <Text style={styles.memberAvatarText}>{initialsFor(m.name)}</Text>
              </View>
              
              <View style={styles.memberInfo}>
                <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                
                <View style={styles.memberSubRow}>
                  <Text style={styles.relationType}>{relationLabel(m.relationship)}</Text>
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
                  <Icon name="edit" size={18} color="#1E3A8A" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.actionBtnDanger]} onPress={() => handleDelete(m)}>
                  <Icon name="delete-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addBtn}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('AddFamilyMember')}
        >
          <View style={styles.addIconWrap}>
            <Icon name="person-add" size={22} color="#1E3A8A" />
          </View>
          <Text style={styles.addBtnText}>Add Family Member</Text>
        </TouchableOpacity>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 20 },
  loadingText: { fontSize: 15, color: '#64748B' },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { fontSize: 14, fontWeight: '600', color: '#DC2626' },

  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  emptySubText: { fontSize: 15, color: '#94A3B8' },

  memberCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
    borderColor: '#E0E7FF',
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  memberAvatarText: { fontSize: 18, fontWeight: '700', color: '#FFFFFF' },
  
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  memberSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  relationType: { fontSize: 13, color: '#64748B' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  memberMeta: { fontSize: 13, color: '#64748B', flexShrink: 1 },
  memberHealth: { fontSize: 13, color: '#D97706', flexShrink: 1 },

  actionCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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

  addBtn: {
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
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#1E3A8A' },
});

export default Family;
