import React, { useState, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useReferrals } from '../../Hooks/useReferrals';
import { useWalletAccount } from '../../Hooks/useWalletAccount';

function ReferEarn({ navigation }) {
  const { referralCode, shareLink, totals, referred, rewards, leaderboard, loading, retry } = useReferrals();
  const { cashout, retry: retryWallet } = useWalletAccount();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([retry(), retryWallet()]);
    setRefreshing(false);
  };

  // `retry`/`retryWallet` are new function references every render (not
  // memoized by the hooks) — keeping them out of these deps avoids an
  // infinite refetch loop.
  useFocusEffect(
    useCallback(() => {
      retry();
      retryWallet();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const handleCopy = () => {
    // TODO: use a clipboard library to copy `referralCode`
    Alert.alert('Copied', `Referral code ${referralCode} copied to clipboard.`);
  };

  const handleShare = () => {
    Alert.alert('Share on WhatsApp', `Share your code ${referralCode} with friends and family!\n${shareLink || ''}`);
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} title="Refer & Earn" showBack />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor="#007AFF" />}
      >
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Your Referral Code</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#007AFF" style={{ marginVertical: 10 }} />
          ) : (
            <Text style={styles.codeValue}>{referralCode || '—'}</Text>
          )}
          <View style={styles.codeBtnRow}>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopy}>
              <Icon name="content-copy" size={16} color="#007AFF" />
              <Text style={styles.copyBtnText}>Copy Code</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
              <Icon name="chat" size={16} color="white" />
              <Text style={styles.shareBtnText}>Share on WhatsApp</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.codeHelp}>Share this code with friends and family. When they sign up and subscribe, you earn referral credits.</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Sign-ups</Text>
            <Text style={styles.statValue}>{totals.signups}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Earned</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>₹{totals.earned.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Pending Approval</Text>
            <Text style={[styles.statValue, { color: '#D97706' }]}>₹{totals.pending.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>People You Referred</Text>
          {referred.length === 0 ? (
            <Text style={styles.emptyText}>No referrals yet.</Text>
          ) : (
            referred.map((r, i) => (
              <View key={i} style={styles.referralRow}>
                <Text style={styles.referralName}>{r.name}</Text>
                <Text style={styles.referralMeta}>{r.plan || 'Member'} · Joined {r.joinedAt || '—'}</Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Reward History</Text>
          {rewards.length === 0 ? (
            <Text style={styles.emptyText}>No rewards yet.</Text>
          ) : (
            rewards.map((r, i) => (
              <View key={i} style={styles.rewardRow}>
                <View style={styles.rewardTopRow}>
                  <Text style={styles.rewardName}>{r.name}</Text>
                  <Text style={styles.rewardAmount}>₹{Number(r.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
                </View>
                <View style={styles.rewardBottomRow}>
                  <View style={[styles.rewardStatus, { backgroundColor: r.status === 'Paid' ? '#E6F7EF' : '#FEF3C7' }]}>
                    <Text style={[styles.rewardStatusText, { color: r.status === 'Paid' ? '#10B981' : '#D97706' }]}>{r.status}</Text>
                  </View>
                  <Text style={styles.rewardDate}>{r.date}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="emoji-events" size={18} color="#F59E0B" />
            <Text style={styles.sectionTitle}>Referral Leaderboard</Text>
          </View>
          {leaderboard.length === 0 ? (
            <Text style={styles.emptyText}>No leaderboard data yet.</Text>
          ) : (
            leaderboard.map((entry, i) => (
              <View key={i} style={styles.leaderboardRow}>
                <Text style={styles.leaderboardMedal}>{['🥇', '🥈', '🥉'][i] || '🏅'}</Text>
                <Text style={styles.leaderboardName}>{entry.isMe ? `${entry.name} (you)` : entry.name}</Text>
                <Text style={styles.leaderboardCount}>{entry.count} referral{entry.count === 1 ? '' : 's'}</Text>
              </View>
            ))
          )}
          <Text style={styles.leaderboardNote}>Top referrers earn bonus rewards every quarter.</Text>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <Icon name="account-balance" size={18} color="#374151" />
            <Text style={styles.sectionTitle}>Cash Out to Bank</Text>
            <View style={styles.eliteBadge}>
              <Text style={styles.eliteBadgeText}>Elite</Text>
            </View>
          </View>
          <Text style={styles.cashOutText}>
            Bank cash-out of referral credits is an <Text style={styles.bold}>Elite plan</Text> benefit. Other plans use credits on renewals and add-on purchases.
          </Text>
          {cashout && !cashout.isElite && (
            <TouchableOpacity onPress={() => navigation.navigate('Coupon & Credits Wallet')}>
              <Text style={styles.cashOutPlanNote}>Go to Wallet to view your credit balance.</Text>
            </TouchableOpacity>
          )}
          {cashout?.eligible && (
            <TouchableOpacity style={styles.cashOutBtn} onPress={() => navigation.navigate('Coupon & Credits Wallet')}>
              <Text style={styles.cashOutBtnText}>Request Cash Out</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' }, // Profile.js background
  scrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  codeCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    alignItems: 'center', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24, 
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  codeLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  codeValue: { 
    fontSize: 28, 
    fontWeight: '800', 
    color: '#0F172A', 
    letterSpacing: 4, 
    marginVertical: 16, 
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  codeBtnRow: { flexDirection: 'row', gap: 12, width: '100%', justifyContent: 'center' },
  copyBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#1E3A8A', borderRadius: 12, paddingVertical: 12 },
  copyBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  shareBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#16A34A', borderRadius: 12, paddingVertical: 12 },
  shareBtnText: { fontSize: 14, color: '#FFFFFF', fontWeight: '700' },
  codeHelp: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 20, lineHeight: 20 },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { 
    flex: 1, 
    backgroundColor: '#FFFFFF', 
    borderRadius: 20, 
    padding: 16, 
    alignItems: 'center', 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 12, 
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F5F9'
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginTop: 4 },
  statLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', textTransform: 'uppercase' },
  sectionCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: 24, 
    padding: 24, 
    shadowColor: '#1E3A8A', 
    shadowOffset: { width: 0, height: 8 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 24, 
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E0E7FF'
  },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  referralRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  referralName: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  referralMeta: { fontSize: 13, color: '#64748B', marginTop: 4 },
  rewardRow: { paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  rewardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardName: { fontSize: 15, fontWeight: '700', color: '#1E3A8A' },
  rewardAmount: { fontSize: 15, fontWeight: '800', color: '#0F172A' },
  rewardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  rewardStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  rewardStatusText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  rewardDate: { fontSize: 12, fontWeight: '500', color: '#94A3B8' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#EEF2FF', borderRadius: 12, padding: 14, marginBottom: 10 },
  leaderboardMedal: { fontSize: 20 },
  leaderboardName: { flex: 1, fontSize: 14, fontWeight: '700', color: '#1E293B' },
  leaderboardCount: { fontSize: 13, color: '#1E3A8A', fontWeight: '700' },
  leaderboardNote: { fontSize: 13, color: '#64748B', marginTop: 6, lineHeight: 20 },
  eliteBadge: { backgroundColor: '#0F172A', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, marginLeft: 'auto' },
  eliteBadgeText: { fontSize: 11, color: '#FFFFFF', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1 },
  cashOutText: { fontSize: 14, color: '#475569', lineHeight: 22, marginBottom: 4 },
  bold: { fontWeight: '800', color: '#0F172A' },
  cashOutPlanNote: { fontSize: 13, color: '#1E3A8A', fontWeight: '600', marginTop: 12 },
  cashOutBtn: { backgroundColor: '#1E3A8A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  cashOutBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  emptyText: { fontSize: 14, color: '#94A3B8', textAlign: 'center', paddingVertical: 16, fontWeight: '500' },
});

export default ReferEarn;
