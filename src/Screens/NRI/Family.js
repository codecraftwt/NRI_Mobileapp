import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { removeFamilyMember } from '../../Redux/slices/familySlice';
import { useFamilyMembers } from '../../Hooks/useFamilyMembers';

const AVATAR_COLORS = [colors.success, colors.primary, colors.warning, colors.error, '#8B5CF6', '#06B6D4'];
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
      >

        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color={colors.primary} />
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
                  <Icon name="edit" size={18} color={colors.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionIconBtn, styles.actionIconBtnDanger]}
                  onPress={() => handleDelete(m)}
                  activeOpacity={0.7}
                >
                  <Icon name="delete" size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.cardBody}>
              {!!(m.phone || m.cityName || m.stateName) && (
                <View style={styles.metaRow}>
                  <Icon name="call" size={14} color={colors.textSecondary} />
                  <Text style={styles.memberMeta} numberOfLines={1}>
                    {[m.phone, [m.cityName, m.stateName].filter(Boolean).join(', ')].filter(Boolean).join('  ·  ')}
                  </Text>
                </View>
              )}
              {!!m.healthNotes && (
                <View style={styles.metaRow}>
                  <Icon name="favorite-border" size={14} color={colors.warning} />
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
            <Icon name="person-add" size={20} color={colors.primary} />
          </View>
          <Text style={styles.addCardText}>Add Family Member</Text>
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
  backToCustomerText: { ...typography.labelMedium, color: colors.textPrimary },

  loadingBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  loadingText: { ...typography.body, color: colors.textSecondary },
  retryBox: { alignItems: 'center', paddingVertical: 12 },
  retryText: { ...typography.labelMedium, color: colors.error },

  memberCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
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
  memberAvatar: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  memberAvatarText: { ...typography.h4, color: colors.surface },
  memberInfo: { flex: 1, gap: 4 },
  memberName: { ...typography.labelLarge, color: colors.textPrimary },
  relationPill: { backgroundColor: colors.primaryLight + '20', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  relationPillText: { ...typography.tiny, fontFamily: typography.labelMedium.fontFamily, color: colors.primary },

  cardActions: { flexDirection: 'row', gap: 8 },
  actionIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIconBtnDanger: {
    backgroundColor: colors.errorBackground,
  },

  cardBody: { gap: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceSecondary },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  memberMeta: { ...typography.small, color: colors.textSecondary, flexShrink: 1 },
  memberHealth: { ...typography.small, color: colors.warning, flexShrink: 1 },

  addCard: {
    flexDirection: 'row',
    backgroundColor: colors.primaryLight + '10',
    borderRadius: 16,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  addIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primaryLight + '30',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addCardText: { ...typography.labelMedium, color: colors.primary },
});

export default Family;
