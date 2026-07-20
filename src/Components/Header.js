import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing } from '../theme/spacing';

function Header({ navigation, title, showBack, isTabRoot }) {
  const isDashboard = !showBack && !isTabRoot && !title;

  if (isDashboard) {
    return (
      <View style={styles.mainContainer}>
        <StatusBar backgroundColor={'#20304C'} barStyle="light-content" translucent={false} />

        <View style={styles.profileContainer}>
          <View style={styles.avatarMain}>
            <Icon name="person" size={24} color={'#20304C'} />
          </View>
          <View>
            <Text style={styles.greetingMain}>Welcome back,</Text>
            <Text style={styles.brandTextMain} numberOfLines={1}>NRI Circle Member</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconBtnMain}>
          <Icon name="notifications-none" size={24} color="#FFFFFF" />
          <View style={styles.badgeMain} />
        </TouchableOpacity>
      </View>
    );
  }

  // Standard Header for inner screens or Tab Roots
  return (
    <View style={styles.container}>
      <StatusBar backgroundColor={'#20304C'} barStyle="light-content" translucent={false} />
      {showBack ? (
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-back-ios" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      ) : (
        <View style={{ width: 44 }} />
      )}
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={{ width: 44 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#20304C',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'android' ? 50 : 54, // Same as Services.js
    paddingBottom: spacing.md,
    borderBottomWidth: 0,
    shadowColor: '#20304C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { flex: 1, ...typography.h4, color: '#FFFFFF', textAlign: 'center' },

  // Clean Modern Colored Header
  mainContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#20304C', // Merges perfectly with status bar
    paddingHorizontal: spacing.lg,
    paddingTop: 56, // Clear the status bar
    paddingBottom: spacing.md,
    borderBottomWidth: 0,
    shadowColor: '#20304C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    marginRight: 10,
  },
  avatarMain: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  greetingMain: {
    ...typography.tiny,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 2,
  },
  brandTextMain: {
    fontSize: 16,
    fontFamily: typography.h2.fontFamily,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  iconBtnMain: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeMain: {
    position: 'absolute',
    top: 10,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
    borderWidth: 1,
    borderColor: '#20304C',
  }
});

export default Header;
