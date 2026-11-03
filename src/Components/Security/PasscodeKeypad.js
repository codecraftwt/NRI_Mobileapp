import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

export default function PasscodeKeypad({
  onDigitPress,
  onBackspace,
  onBiometricPress,
  showBiometric = false,
  biometryType = 'Biometrics',
  disabled = false,
}) {
  const getBiometricIcon = () => {
    if (biometryType === 'FaceID') return 'face';
    return 'fingerprint';
  };

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['bio', '0', 'back'],
  ];

  return (
    <View style={styles.container}>
      {rows.map((row, rIndex) => (
        <View key={`row-${rIndex}`} style={styles.row}>
          {row.map((item, cIndex) => {
            if (item === 'bio') {
              if (!showBiometric) {
                return <View key="empty-bio" style={styles.keyPlaceholder} />;
              }
              return (
                <TouchableOpacity
                  key="bio-key"
                  style={[styles.key, styles.specialKey]}
                  onPress={onBiometricPress}
                  disabled={disabled}
                  activeOpacity={0.6}
                  accessibilityLabel="Use fingerprint or face recognition"
                >
                  <Icon name={getBiometricIcon()} size={32} color="#20304C" />
                </TouchableOpacity>
              );
            }

            if (item === 'back') {
              return (
                <TouchableOpacity
                  key="back-key"
                  style={[styles.key, styles.specialKey]}
                  onPress={onBackspace}
                  disabled={disabled}
                  activeOpacity={0.6}
                  accessibilityLabel="Backspace"
                >
                  <Icon name="backspace" size={26} color="#5A5C5D" />
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={`digit-${item}`}
                style={styles.key}
                onPress={() => onDigitPress(item)}
                disabled={disabled}
                activeOpacity={0.7}
              >
                <Text style={styles.digitText}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  key: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#20304C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  specialKey: {
    backgroundColor: '#F3F6F9',
    borderColor: 'transparent',
    elevation: 0,
    shadowOpacity: 0,
  },
  keyPlaceholder: {
    width: 72,
    height: 72,
  },
  digitText: {
    fontSize: 28,
    fontWeight: '600',
    color: '#20304C',
  },
});
