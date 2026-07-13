import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { removeFamilyMember } from '../../Redux/slices/familySlice';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';

const AVATAR_COLORS = ['#10B981', '#007AFF', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
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

  const handleDelete = (member) => {
    Alert.alert(
      'Delete Member',
      `Are you sure you want to remove ${member.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            dispatch(removeFamilyMember(member.id)).unwrap().catch((error) => {
              Alert.alert('Failed', error?.message || 'Could not remove this family member.');
            });
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Family" />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <TouchableOpacity style={styles.backToCustomerBtn} onPress={() => navigation.navigate('Customer')} activeOpacity={0.7}>
          <Icon name="arrow-back" size={16} color="#374151" />
          <Text style={styles.backToCustomerText}>Back to Customer</Text>
        </TouchableOpacity>

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Loading family members…</Text>
          </View>
        )}
        {failed && (
          <TouchableOpacity style={styles.retryBox} onPress={retry}>
            <Text style={styles.retryText}>Couldn't load family members. Tap to retry.</Text>
          </TouchableOpacity>
        )}

        {members.map(m => (
          <View key={m.id} style={styles.memberCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderLeft}>
                <View style={[styles.memberAvatar, { backgroundColor: avatarColorFor(m.name) }]}>
                  <Text style={styles.memberAvatarText}>{initialsFor(m.name)}</Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName} numberOfLines={1}>{m.name}</Text>
                  <View style={styles.relationPill}>
                    <Text style={styles.relationPillText}>{relationLabel(m.relationship)}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.actionIconBtn}
                  onPress={() => navigation.navigate('AddFamilyMember', { memberId: m.id })}
                  activeOpacity={0.7}
                >
                  <Icon name="edit" size={18} color="#007AFF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.actionIconBtnDanger]}
                  onPress={() => handleDelete(m)}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBody}>
              {!!(m.phone || m.cityName || m.stateName) && (
                <View style={styles.metaRow}>
                  <Icon name="call" size={13} color="#94A3B8" />
                  <Text style={styles.memberMeta} numberOfLines={1}>
                    {[m.phone, [m.cityName, m.stateName].filter(Boolean).join(', ')].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
              )}
              {!!m.healthNotes && (
                <View style={styles.metaRow}>
                  <Icon name="favorite-border" size={13} color="#F59E0B" />
                  <Text style={styles.memberHealth} numberOfLines={2}>{m.healthNotes}</Text>
                </View>
              )}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={styles.addCard}
          onPress={() => navigation.navigate('AddFamilyMember')}
          activeOpacity={0.8}
        >
          <View style={styles.addIconWrap}>
            <Icon name="person-add" size={20} color="#007AFF" />
          </View>
          <Text style={styles.addCardText}>Add Family Member</Text>
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

  memberCard: {
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
  memberAvatar: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { fontSize: 15, fontWeight: 'bold', color: 'white' },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  relationPill: { backgroundColor: '#E5F1FF', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 2, alignSelf: 'flex-start' },
  relationPillText: { fontSize: 11, fontWeight: '700', color: '#007AFF' },

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
  memberMeta: { fontSize: 12.5, color: '#64748B', flexShrink: 1 },
  memberHealth: { fontSize: 12.5, color: '#78716C', flexShrink: 1 },

  addCard: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 18,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#DCEBFF',
    borderStyle: 'dashed',
  },
  addIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E5F1FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardText: { color: '#007AFF', fontSize: 15, fontWeight: '700' },
});

export default Family;
