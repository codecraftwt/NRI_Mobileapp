import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, StatusBar, TouchableOpacity, TextInput, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';
import AppAlert, { useAppAlert } from '../../Components/AppAlert';
import { useToast } from '../../context/ToastContext';
import { useVendorWallet } from '../../Hooks/Vendor/useVendorWallet';

const formatInr = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

function modeIcon(value) {
  const v = String(value || '').toLowerCase();
  if (v === 'cash') return 'payments';
  if (v === 'upi') return 'qr-code-2';
  if (v.includes('bank')) return 'account-balance';
  return 'account-balance-wallet';
}

function getWithdrawalStatusStyle(status) {
  switch (String(status || '').toLowerCase()) {
    case 'approved': return { bg: '#DBEAFE', text: '#1D4ED8' };
    case 'paid': return { bg: '#D1FAE5', text: '#059669' };
    case 'rejected':
    case 'failed': return { bg: '#FEE2E2', text: '#DC2626' };
    case 'reversed': return { bg: '#FEE2E2', text: '#B91C1C' };
    default: return { bg: '#FEF3C7', text: '#D97706' }; // pending
  }
}

function getTransactionStyle(type) {
  return String(type || '').toLowerCase() === 'debit'
    ? { bg: '#FEE2E2', color: '#DC2626', icon: 'arrow-upward', sign: '-' }
    : { bg: '#D1FAE5', color: '#059669', icon: 'arrow-downward', sign: '+' };
}

// Both list sections start collapsed to a short preview so the screen doesn't
// open buried under a long history — "View All" reveals the rest.
const PREVIEW_COUNT = 3;

function Wallet({ navigation }) {
  const {
    balance, feePercent, withdrawalModes, payoutDetails, withdrawals, transactions, meta,
    loading, failed, error, retry,
    requestWithdrawal, withdrawing,
  } = useVendorWallet();
  const { showAlert, alertProps } = useAppAlert();
  const { showToast } = useToast();

  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState(null);

  // Payout-detail fields shown under the selected mode — prefilled from the
  // vendor's saved payout_details (if any) so they don't retype them, but
  // editable in case they want to withdraw to a different UPI ID/account.
  const [upiId, setUpiId] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankName, setBankName] = useState('');

  useEffect(() => {
    if (payoutDetails) {
      setUpiId(payoutDetails.upiId || '');
      setBankAccountName(payoutDetails.bankAccountName || '');
      setBankAccountNumber(payoutDetails.bankAccountNumber || '');
      setBankIfsc(payoutDetails.bankIfsc || '');
      setBankName(payoutDetails.bankName || '');
    }
  }, [payoutDetails]);

  const visibleWithdrawals = withdrawals.slice(0, PREVIEW_COUNT);
  const visibleTransactions = transactions.slice(0, PREVIEW_COUNT);

  const amountNum = parseFloat(amount) || 0;
  const feeAmount = amountNum * ((feePercent || 0) / 100);
  const payableAmount = Math.max(amountNum - feeAmount, 0);

  const isBankMode = String(mode || '').toLowerCase().includes('bank');
  const isUpiMode = String(mode || '').toLowerCase() === 'upi';
  const missingUpi = isUpiMode && !upiId.trim();
  const missingBank = isBankMode && (!bankAccountName.trim() || !bankAccountNumber.trim() || !bankIfsc.trim());

  const handleSubmit = async () => {
    if (amountNum <= 0) {
      showAlert('Amount Required', 'Please enter an amount to withdraw.');
      return;
    }
    if (amountNum > balance) {
      showAlert('Insufficient Balance', 'This amount exceeds your available wallet balance.');
      return;
    }
    if (!mode) {
      showAlert('Mode Required', 'Please select a withdrawal mode.');
      return;
    }
    if (missingUpi) {
      showAlert('UPI ID Required', 'Please enter the UPI ID to receive this payout.');
      return;
    }
    if (missingBank) {
      showAlert('Bank Details Required', 'Please fill in the account holder name, account number, and IFSC code.');
      return;
    }
    try {
      await requestWithdrawal({
        amount: amountNum,
        mode,
        upiId: isUpiMode ? upiId.trim() : undefined,
        bankAccountName: isBankMode ? bankAccountName.trim() : undefined,
        bankAccountNumber: isBankMode ? bankAccountNumber.trim() : undefined,
        bankIfsc: isBankMode ? bankIfsc.trim() : undefined,
        bankName: isBankMode ? bankName.trim() : undefined,
      }).unwrap();
      setAmount('');
      setMode(null);
      showToast('Withdrawal request submitted', 'success');
    } catch (e) {
      showAlert('Could Not Submit', e?.message || 'Something went wrong. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={retry} colors={['#D94625']} tintColor="#D94625" />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroWatermark}>
            <Icon name="account-balance-wallet" size={96} color="rgba(255,255,255,0.06)" />
          </View>
          <Text style={styles.heroLabel}>Available Balance</Text>
          <Text style={styles.heroValue}>{formatInr(balance)}</Text>
          <View style={styles.heroDivider} />
          <View style={styles.heroFeeRow}>
            <Icon name="percent" size={13} color="rgba(255,255,255,0.75)" />
            <Text style={styles.heroFeeText}>Withdrawal fee: {feePercent}%</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <View style={[styles.cardTitleIconBox, { backgroundColor: '#FEF1EC' }]}>
              <Icon name="send" size={16} color="#D94625" />
            </View>
            <Text style={styles.cardTitle}>Request Withdrawal</Text>
          </View>

          <Text style={styles.label}>Amount to withdraw (₹)</Text>
          <View style={styles.amountInputWrap}>
            <Text style={styles.amountPrefix}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>
          <Text style={styles.hint}>Available balance: {formatInr(balance)}</Text>

          <Text style={[styles.label, { marginTop: 20 }]}>Withdrawal mode</Text>
          <View style={styles.methodGrid}>
            {withdrawalModes.map((m) => {
              const active = mode === m.value;
              return (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.methodTile, active && styles.methodTileActive]}
                  activeOpacity={0.8}
                  onPress={() => setMode(m.value)}
                >
                  {active && (
                    <View style={styles.methodTileCheck}>
                      <Icon name="check-circle" size={16} color="#D94625" />
                    </View>
                  )}
                  <View style={[styles.methodIconBox, active && styles.methodIconBoxActive]}>
                    <Icon name={modeIcon(m.value)} size={20} color={active ? '#D94625' : '#4F46E5'} />
                  </View>
                  <Text style={[styles.methodTileText, active && styles.methodTileTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {isUpiMode && (
            <View style={styles.payoutFields}>
              <Text style={styles.label}>UPI ID</Text>
              <TextInput
                style={styles.input}
                value={upiId}
                onChangeText={setUpiId}
                placeholder="name@bank"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
              />
            </View>
          )}
          {isBankMode && (
            <View style={styles.payoutFields}>
              <Text style={styles.label}>Account Holder Name</Text>
              <TextInput
                style={styles.input}
                value={bankAccountName}
                onChangeText={setBankAccountName}
                placeholder="Account holder name"
                placeholderTextColor="#94A3B8"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Account Number</Text>
              <TextInput
                style={styles.input}
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
                placeholder="Account number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>IFSC Code</Text>
              <TextInput
                style={styles.input}
                value={bankIfsc}
                onChangeText={setBankIfsc}
                placeholder="IFSC code"
                placeholderTextColor="#94A3B8"
                autoCapitalize="characters"
              />

              <Text style={[styles.label, { marginTop: 14 }]}>Bank Name <Text style={styles.optionalText}>(optional)</Text></Text>
              <TextInput
                style={styles.input}
                value={bankName}
                onChangeText={setBankName}
                placeholder="Bank name"
                placeholderTextColor="#94A3B8"
              />
            </View>
          )}

          <View style={styles.feeBreakdown}>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Amount</Text>
              <Text style={styles.feeValue}>{formatInr(amountNum)}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={[styles.feeLabel, styles.feeLabelNegative]}>Fee ({feePercent}%)</Text>
              <Text style={[styles.feeValue, styles.feeLabelNegative]}>-{formatInr(feeAmount)}</Text>
            </View>
            <View style={styles.feeTotalBox}>
              <Text style={styles.feeTotalLabel}>You'll receive</Text>
              <Text style={styles.feeTotalValue}>{formatInr(payableAmount)}</Text>
            </View>
          </View>

          <TouchableOpacity style={[styles.submitBtn, withdrawing && styles.submitBtnDisabled]} onPress={handleSubmit} disabled={withdrawing} activeOpacity={0.85}>
            {withdrawing ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
              <>
                <Icon name="send" size={16} color="#FFFFFF" />
                <Text style={styles.submitBtnText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.cardTitleIconBox, { backgroundColor: '#FEF3E2' }]}>
              <Icon name="receipt-long" size={16} color="#B45309" />
            </View>
            <Text style={styles.sectionTitle}>My Withdrawal Requests</Text>
          </View>

          {loading && withdrawals.length === 0 ? (
            <View style={styles.stateBox}><ActivityIndicator size="large" color="#D94625" /></View>
          ) : failed ? (
            <TouchableOpacity style={styles.stateBox} onPress={retry} activeOpacity={0.7}>
              <Icon name="refresh" size={36} color="#DC2626" />
              <Text style={styles.stateText}>{error?.message || "Couldn't load withdrawal requests. Tap to retry."}</Text>
            </TouchableOpacity>
          ) : withdrawals.length === 0 ? (
            <View style={styles.stateBox}>
              <Icon name="receipt-long" size={44} color="#CBD5E1" />
              <Text style={styles.stateText}>No withdrawal requests yet.</Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {visibleWithdrawals.map((row) => {
                const st = getWithdrawalStatusStyle(row.status);
                return (
                  <View key={row.id} style={styles.requestCard}>
                    <View style={styles.requestCardTop}>
                      <View style={styles.requestModeIconBox}>
                        <Icon name={modeIcon(row.mode)} size={18} color="#4F46E5" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestAmount}>{formatInr(row.amount)}</Text>
                        <Text style={styles.requestMeta}>#{row.id} · {row.modeLabel} · {formatDate(row.createdAt)}</Text>
                      </View>
                      <View style={[styles.statusPill, { backgroundColor: st.bg }]}>
                        <View style={[styles.statusDot, { backgroundColor: st.text }]} />
                        <Text style={[styles.statusPillText, { color: st.text }]}>{row.statusLabel}</Text>
                      </View>
                    </View>

                    <View style={styles.requestBreakdown}>
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Fee</Text>
                        <Text style={styles.breakdownValueNegative}>-{formatInr(row.fee)}</Text>
                      </View>
                      <View style={styles.breakdownDivider} />
                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Payable</Text>
                        <Text style={styles.breakdownValuePositive}>{formatInr(row.payable)}</Text>
                      </View>
                    </View>

                    {!!row.rejectionReason && (
                      <View style={styles.rejectionBox}>
                        <Icon name="info-outline" size={14} color="#DC2626" />
                        <Text style={styles.rejectionReason}>{row.rejectionReason}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
              {withdrawals.length > PREVIEW_COUNT && (
                <TouchableOpacity style={styles.viewAllBtnStandalone} onPress={() => navigation.navigate('WithdrawalRequests')} activeOpacity={0.7}>
                  <Text style={styles.viewAllBtnText}>View All ({withdrawals.length})</Text>
                  <Icon name="chevron-right" size={18} color="#2563EB" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <View style={[styles.cardTitleIconBox, { backgroundColor: '#EEF2FF' }]}>
              <Icon name="history" size={16} color="#4F46E5" />
            </View>
            <Text style={styles.sectionTitle}>Wallet History</Text>
          </View>

          {loading && transactions.length === 0 ? (
            <View style={styles.stateBox}><ActivityIndicator size="large" color="#D94625" /></View>
          ) : failed ? (
            <TouchableOpacity style={styles.stateBox} onPress={retry} activeOpacity={0.7}>
              <Icon name="refresh" size={36} color="#DC2626" />
              <Text style={styles.stateText}>{error?.message || "Couldn't load wallet history. Tap to retry."}</Text>
            </TouchableOpacity>
          ) : transactions.length === 0 ? (
            <View style={styles.stateBox}>
              <Icon name="history" size={44} color="#CBD5E1" />
              <Text style={styles.stateText}>No wallet activity yet.</Text>
            </View>
          ) : (
            <View style={styles.cardBlock}>
              {visibleTransactions.map((txn, index) => {
                const st = getTransactionStyle(txn.type);
                return (
                  <View key={txn.id} style={[styles.txnRow, index < visibleTransactions.length - 1 && styles.borderBottom]}>
                    <View style={[styles.txnIconBox, { backgroundColor: st.bg }]}>
                      <Icon name={st.icon} size={16} color={st.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.txnDesc} numberOfLines={2}>{txn.description}</Text>
                      <Text style={styles.txnDate}>{formatDate(txn.createdAt)}</Text>
                    </View>
                    <Text style={[styles.txnAmount, { color: st.color }]}>{st.sign}{formatInr(txn.amount)}</Text>
                  </View>
                );
              })}
              {(transactions.length > PREVIEW_COUNT || meta.currentPage < meta.lastPage) && (
                <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('WalletHistory')} activeOpacity={0.7}>
                  <Text style={styles.viewAllBtnText}>View All ({meta.total || transactions.length})</Text>
                  <Icon name="chevron-right" size={18} color="#2563EB" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </ScrollView>
      <AppAlert {...alertProps} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: (Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 47) + 22, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 100, gap: 20 },

  heroCard: {
    backgroundColor: '#20304C', borderRadius: 24, padding: 22, overflow: 'hidden',
    shadowColor: '#20304C', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.25, shadowRadius: 16, elevation: 6,
  },
  heroWatermark: { position: 'absolute', right: -12, top: -12 },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  heroValue: { fontSize: 34, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', marginTop: 6, letterSpacing: -0.5 },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.12)', marginTop: 18, marginBottom: 12 },
  heroFeeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  heroFeeText: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '600' },

  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, gap: 4,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  cardTitleIconBox: { width: 30, height: 30, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },

  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  amountInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, backgroundColor: '#F8FAFC', paddingHorizontal: 16,
  },
  amountPrefix: { fontSize: 16, fontWeight: '700', color: '#94A3B8', marginRight: 4 },
  amountInput: { flex: 1, paddingVertical: 12, fontSize: 18, fontWeight: '700', color: '#0F172A' },
  hint: { fontSize: 12, color: '#94A3B8', marginTop: 6 },

  methodGrid: { flexDirection: 'row', gap: 10, marginTop: 4 },
  methodTile: {
    flex: 1, alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: '#E2E8F0',
    borderRadius: 16, paddingVertical: 16, backgroundColor: '#FBFBFE', position: 'relative',
  },
  methodTileActive: { borderColor: '#F5C4B0', backgroundColor: '#FEF7F5' },
  methodTileCheck: { position: 'absolute', top: 6, right: 6 },
  methodIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  methodIconBoxActive: { backgroundColor: '#FEE7DD' },
  methodTileText: { fontSize: 12, color: '#334155', fontFamily: typography.labelMedium.fontFamily, fontWeight: '700' },
  methodTileTextActive: { color: '#D94625' },

  payoutFields: { marginTop: 16 },
  optionalText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic', fontWeight: '400' },

  feeBreakdown: { backgroundColor: '#F8FAFC', borderRadius: 14, padding: 14, marginTop: 20, gap: 8 },
  feeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  feeLabel: { fontSize: 13, color: '#64748B' },
  feeValue: { fontSize: 13, fontWeight: '600', color: '#0F172A' },
  feeLabelNegative: { color: '#DC2626' },
  feeTotalBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#D1FAE5', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4,
  },
  feeTotalLabel: { fontSize: 13, fontWeight: '700', color: '#065F46' },
  feeTotalValue: { fontSize: 17, fontWeight: '800', color: '#059669' },

  submitBtn: {
    flexDirection: 'row', gap: 8, backgroundColor: '#D94625', borderRadius: 24, paddingVertical: 15,
    justifyContent: 'center', alignItems: 'center', marginTop: 18,
    shadowColor: '#D94625', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 10, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFFFFF' },

  sectionContainer: {},
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#1A1A1A' },

  stateBox: { paddingVertical: 48, alignItems: 'center', gap: 12 },
  stateText: { fontSize: 14, color: '#64748B', textAlign: 'center', paddingHorizontal: 20 },

  cardBlock: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  statusDot: { width: 5, height: 5, borderRadius: 2.5 },
  statusPillText: { fontSize: 10, fontFamily: typography.labelMedium.fontFamily, textTransform: 'capitalize' },

  requestCard: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 14, gap: 12,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2,
  },
  requestCardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestModeIconBox: { width: 38, height: 38, borderRadius: 12, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  requestAmount: { fontSize: 16, fontWeight: '800', color: '#0F172A' },
  requestMeta: { fontSize: 11, color: '#94A3B8', marginTop: 2 },

  requestBreakdown: { flexDirection: 'row', backgroundColor: '#F8FAFC', borderRadius: 12, paddingVertical: 10 },
  breakdownItem: { flex: 1, alignItems: 'center', gap: 2 },
  breakdownDivider: { width: 1, backgroundColor: '#E2E8F0' },
  breakdownLabel: { fontSize: 10, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.3 },
  breakdownValueNegative: { fontSize: 13, fontWeight: '700', color: '#DC2626' },
  breakdownValuePositive: { fontSize: 13, fontWeight: '700', color: '#059669' },

  rejectionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 6,
    backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10,
  },
  rejectionReason: { flex: 1, fontSize: 12, color: '#DC2626', lineHeight: 17 },

  viewAllBtnStandalone: {
    flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, backgroundColor: '#FFFFFF', borderRadius: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
  },

  footerLoader: { paddingVertical: 16, alignItems: 'center' },
  viewAllBtn: {
    flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center',
    paddingVertical: 12, marginTop: 4, borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  viewAllBtnText: { fontSize: 13, fontWeight: '700', color: '#2563EB' },

  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  txnIconBox: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnDesc: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  txnDate: { fontSize: 11, color: '#94A3B8', marginTop: 2 },
  txnAmount: { fontSize: 14, fontWeight: '800' },
});

export default Wallet;
