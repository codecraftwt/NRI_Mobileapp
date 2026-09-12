import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../theme/typography';

function RMWidget({ rm }) {
  if (!rm) return null;
  return (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{rm.avatar || 'RM'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.title}>YOUR RELATIONSHIP MANAGER</Text>
          <Text style={styles.name}>{rm.name}</Text>
          {!!rm.email && (
            <View style={styles.emailRow}>
              <Icon name="mail-outline" size={12} color="#CBD5E1" />
              <Text style={styles.email} numberOfLines={1}>{rm.email}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={styles.statusIcon}>
        <Icon name="verified-user" size={18} color="#FFFFFF" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
    marginRight: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F59E0B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 15,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF'
  },
  info: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 9,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  name: {
    fontSize: 15,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF'
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 1,
  },
  email: {
    fontSize: 11,
    color: '#CBD5E1',
    flexShrink: 1,
  },
  statusIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RMWidget;
