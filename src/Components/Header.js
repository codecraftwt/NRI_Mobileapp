import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

function Header({ navigation, title, showBack }) {
  return (
    <View style={styles.container}>
      {showBack ? (
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
      ) : (
        <View style={styles.brandContainer}>
          <Icon name="radio-button-checked" size={20} color="#007AFF" />
          <Text style={styles.brandText}>NRI Circle</Text>
        </View>
      )}
      <Text style={styles.title}>{title}</Text>
      <TouchableOpacity style={styles.sosBtn}>
        <Icon name="warning" size={20} color="#EF4444" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  brandText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: 'bold', color: '#333' },
  sosBtn: { padding: 4 },
});

export default Header;
