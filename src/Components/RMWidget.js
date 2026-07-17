import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Linking } from 'react-native';
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
        </View>
      </View>
      
      <View style={styles.actions}>
        <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${rm.phone || '+910000000000'}`)}>
          <Icon name="phone" size={16} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.waBtn} onPress={() => Linking.openURL(`whatsapp://send?phone=${rm.phone || '+910000000000'}`)}>
          <Icon name="chat" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { 
    backgroundColor: 'rgba(255, 255, 255, 0.1)', 
    borderRadius: 20, 
    padding: 16, 
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
    gap: 12,
    marginRight: 12,
  },
  avatar: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    backgroundColor: '#F59E0B', 
    justifyContent: 'center', 
    alignItems: 'center',
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
    fontSize: 10,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  name: { 
    fontSize: 16, 
    fontFamily: typography.h2.fontFamily, 
    color: '#FFFFFF' 
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: { 
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waBtn: { 
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#22C55E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default RMWidget;
