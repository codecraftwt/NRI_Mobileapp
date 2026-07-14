import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { useReferrals } from '../../Hooks/useReferrals';
import { useWalletAccount } from '../../Hooks/useWalletAccount';

function ReferEarn({ navigation }) {
  const { referralCode, shareLink, totals, referred, rewards, leaderboard, loading } = useReferrals();
  const { cashout } = useWalletAccount();

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
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 12 },
  codeCard: { backgroundColor: 'white', borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  codeLabel: { fontSize: 13, color: '#666' },
  codeValue: { fontSize: 26, fontWeight: 'bold', color: '#333', letterSpacing: 2, marginVertical: 10, fontFamily: 'monospace' },
  codeBtnRow: { flexDirection: 'row', gap: 10 },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#007AFF', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  copyBtnText: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#25D366', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  shareBtnText: { fontSize: 13, color: 'white', fontWeight: '600' },
  codeHelp: { fontSize: 12, color: '#6B7280', textAlign: 'center', marginTop: 14, lineHeight: 17 },
  statsRow: { flexDirection: 'row', gap: 8 },
  statCard: { flex: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 2 },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  statLabel: { fontSize: 10, color: '#666' },
  sectionCard: { backgroundColor: 'white', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 3 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  referralRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  referralName: { fontSize: 14, fontWeight: '600', color: '#333' },
  referralMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  rewardRow: { paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  rewardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rewardName: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  rewardAmount: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  rewardBottomRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  rewardStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  rewardStatusText: { fontSize: 10, fontWeight: 'bold' },
  rewardDate: { fontSize: 11, color: '#999' },
  leaderboardRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#E5F1FF', borderRadius: 10, padding: 12, marginBottom: 8 },
  leaderboardMedal: { fontSize: 18 },
  leaderboardName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#333' },
  leaderboardCount: { fontSize: 12, color: '#333', fontWeight: '600' },
  leaderboardNote: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  eliteBadge: { backgroundColor: '#111827', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 'auto' },
  eliteBadgeText: { fontSize: 10, color: 'white', fontWeight: 'bold' },
  cashOutText: { fontSize: 13, color: '#374151', lineHeight: 19 },
  bold: { fontWeight: 'bold', color: '#111827' },
  cashOutPlanNote: { fontSize: 12, color: '#007AFF', marginTop: 8 },
  cashOutBtn: { backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  cashOutBtnText: { color: 'white', fontSize: 14, fontWeight: '600' },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
});

export default ReferEarn;
