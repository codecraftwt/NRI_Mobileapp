import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { lightColors as colors, typography, spacing, radius } from '../theme';

const OPTIONS = [
  { value: 'USD', label: 'USD', symbol: '$' },
  { value: 'INR', label: 'INR', symbol: '₹' },
];

// $ / ₹ selector for the payment step. Only applies to Stripe/Razorpay —
// callers are responsible for filtering PayPal out of their gateway list
// when currency is INR (see useCurrencyGateways). Selected option renders as
// a filled pill; the other is plain colored text alongside it.
export default function CurrencyToggle({ value, onChange, style }) {
  return (
    <View style={[styles.row, style]}>
      {OPTIONS.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[styles.option, active && styles.optionActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{opt.symbol} {opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  option: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radius.full,
  },
  optionActive: {
    backgroundColor: colors.primary,
  },
  label: {
    ...typography.labelMedium,
    color: colors.primary,
  },
  labelActive: {
    color: colors.onPrimary,
    fontFamily: typography.labelLarge.fontFamily,
  },
});
