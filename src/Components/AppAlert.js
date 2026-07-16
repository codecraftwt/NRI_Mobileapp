import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  title: { ...typography.h4, color: '#0F172A', textAlign: 'center' },
  message: { ...typography.body, color: '#64748B', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  buttonGroup: { flexDirection: 'row', gap: 10, marginTop: 20 },
  buttonGroupStacked: { flexDirection: 'column' },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#D94625',
  },
  buttonInline: {},
  buttonStacked: { flex: undefined, width: '100%' },
  buttonCancel: { backgroundColor: '#F1F5F9' },
  buttonDestructive: { backgroundColor: '#EF4444' },
  buttonText: { ...typography.labelLarge, color: '#FFFFFF' },
  buttonTextCancel: { color: '#0F172A' },
  buttonTextDestructive: { color: '#FFFFFF' },
});

export default AppAlert;
