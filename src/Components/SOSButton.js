import React from 'react';
import { StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

function SOSButton() {
  const handleSOS = () => {
    Alert.alert(
      'Emergency SOS',
      'An emergency alert will be sent to your Relationship Manager and our Operations Team immediately. Do you wish to proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: () => Alert.alert('SOS Sent', 'Your RM and Operations Team have been notified. You will receive a call shortly.') },
      ]
    );
  };

  return (
    <TouchableOpacity style={styles.container} onPress={handleSOS} activeOpacity={0.8}>
      <Icon name="warning" size={20} color="white" />
      <Text style={styles.text}>SOS</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#EF4444',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    gap: 2,
  },
  text: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});

export default SOSButton;
