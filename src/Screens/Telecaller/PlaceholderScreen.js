import React from 'react';
import { StyleSheet, Text, View, SafeAreaView } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as C } from '../../theme/colors';
import { spacing, typography } from '../../theme';

// Shared body for every not-yet-built Telecaller menu screen — swap for a
// real screen per item as each one is implemented.
function createPlaceholderScreen({ title, icon, tabRoot = false, subtitle = 'Coming soon.' }) {
  function PlaceholderScreen({ navigation }) {
    return (
      <SafeAreaView style={styles.container}>
        <Header navigation={navigation} title={title} showBack={!tabRoot} isTabRoot={tabRoot} />
        <View style={styles.body}>
          <Icon name={icon} size={56} color={C.primary} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
      </SafeAreaView>
    );
  }
  return PlaceholderScreen;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.background,
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    ...typography.h2,
    color: C.textPrimary,
    marginTop: spacing.md,
  },
  subtitle: {
    ...typography.body,
    color: C.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});

export default createPlaceholderScreen;
