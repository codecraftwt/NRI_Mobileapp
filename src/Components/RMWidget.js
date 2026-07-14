import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';
import { radius } from '../theme/radius';

function RMWidget({ rm }) {
  if (!rm) return null;
  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{rm.avatar || 'RM'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>Your Relationship Manager</Text>
          <Text style={styles.name}>{rm.name}</Text>
          <Text style={styles.email} numberOfLines={1}>{rm.email}</Text>
        </View>
      </View>
      
      {!!rm.phone && (
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${rm.phone}`)}>
          <Icon name="phone-in-talk" size={22} color={colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: radius['2xl'], 
    padding: spacing.md, 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.primaryLight,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
    marginBottom: spacing.xl,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: spacing.md,
  },
  avatar: { 
    width: 52, 
    height: 52, 
    borderRadius: 26, 
    backgroundColor: colors.accent, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },
  avatarText: { 
    fontSize: 16, 
    fontFamily: typography.h2.fontFamily, 
    color: '#FFFFFF' 
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: { 
    ...typography.tiny, 
    color: colors.primary, 
    fontFamily: typography.labelMedium.fontFamily,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: { 
    fontSize: 16, 
    fontFamily: typography.h2.fontFamily, 
    color: '#1A1A1A' 
  },
  email: { 
    ...typography.small, 
    color: '#64748B' 
  },
  callBtn: { 
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
});

export default RMWidget;
