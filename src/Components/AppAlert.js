import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { lightColors as colors } from '../theme/colors';
import { typography } from '../theme/typography';

// Drop-in styled replacement for the OS's default `Alert.alert(title, message,
// buttons)` — same call shape (buttons: [{ text, onPress, style }]) so
// screens can swap `Alert.alert(...)` for `showAlert(...)` with no other
// changes. `style: 'cancel' | 'destructive'` get their own look; anything
// else renders as the primary action.
export function useAppAlert() {
  const [config, setConfig] = useState(null);

  const showAlert = useCallback((title, message, buttons) => {
    setConfig({
      title,
      message,
      buttons: buttons && buttons.length ? buttons : [{ text: 'OK' }],
    });
  }, []);

  const close = useCallback(() => setConfig(null), []);

  const handlePress = useCallback((btn) => {
    close();
    btn.onPress?.();
  }, [close]);

  return {
    showAlert,
    alertProps: {
      visible: !!config,
      title: config?.title,
      message: config?.message,
      buttons: config?.buttons || [],
      onRequestClose: close,
      onButtonPress: handlePress,
    },
  };
}

function AppAlert({ visible, title, message, buttons, onRequestClose, onButtonPress }) {
  const stacked = buttons.length > 2;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onRequestClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onRequestClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          {!!title && <Text style={styles.title}>{title}</Text>}
          {!!message && <Text style={styles.message}>{message}</Text>}
          <View style={[styles.buttonGroup, stacked && styles.buttonGroupStacked]}>
            {buttons.map((btn, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.button,
                  stacked ? styles.buttonStacked : styles.buttonInline,
                  btn.style === 'cancel' && styles.buttonCancel,
                  btn.style === 'destructive' && styles.buttonDestructive,
                ]}
                activeOpacity={0.75}
                onPress={() => onButtonPress(btn)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    btn.style === 'cancel' && styles.buttonTextCancel,
                    btn.style === 'destructive' && styles.buttonTextDestructive,
                  ]}
                  numberOfLines={1}
                >
                  {btn.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { ...typography.h4, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 20 },
  buttonGroupStacked: { flexDirection: 'column' },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
  buttonInline: {},
  buttonStacked: { flex: undefined, width: '100%' },
  buttonCancel: { backgroundColor: colors.surfaceSecondary },
  buttonDestructive: { backgroundColor: colors.error },
  buttonText: { ...typography.labelLarge, color: colors.onAccent },
  buttonTextCancel: { color: colors.textPrimary },
  buttonTextDestructive: { color: '#FFFFFF' },
});

export default AppAlert;
