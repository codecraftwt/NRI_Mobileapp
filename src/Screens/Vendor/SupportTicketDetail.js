import React from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

const MESSAGES = [
  { id: '1', from: 'me', text: 'Payout for NRI-2026-00007 has not been received yet.', time: '10:12 AM' },
  { id: '2', from: 'support', text: 'Thanks for reaching out, Ramesh. We are checking with the payments team and will update you shortly.', time: '10:20 AM' },
  { id: '3', from: 'support', text: 'Your payout has been processed. It should reflect in your account within 24 hours.', time: '11:05 AM' },
];

function SupportTicketDetail({ navigation }) {
  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Header navigation={navigation} title="Payout delayed for NRI-2026-00007" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {MESSAGES.map(msg => (
          <View key={msg.id} style={[styles.bubbleRow, msg.from === 'me' && styles.bubbleRowMe]}>
            <View style={[styles.bubble, msg.from === 'me' ? styles.bubbleMe : styles.bubbleSupport]}>
              <Text style={[styles.bubbleText, msg.from === 'me' && styles.bubbleTextMe]}>{msg.text}</Text>
            </View>
            <Text style={styles.bubbleTime}>{msg.time}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput style={styles.input} placeholder="Type a message..." placeholderTextColor={colors.textPlaceholder} />
        <TouchableOpacity style={styles.sendBtn}>
          <Icon name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  scrollContent: { padding: 16, gap: 16 },

  bubbleRow: { maxWidth: '80%', alignSelf: 'flex-start' },
  bubbleRowMe: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10 },
  bubbleSupport: { backgroundColor: colors.surface, borderBottomLeftRadius: 4 },
  bubbleMe: { backgroundColor: '#D94625', borderBottomRightRadius: 4 },
  bubbleText: { ...typography.body, color: colors.textPrimary },
  bubbleTextMe: { color: '#FFFFFF' },
  bubbleTime: { ...typography.tiny, color: colors.textPlaceholder, marginTop: 4 },

  inputBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  input: {
    flex: 1, backgroundColor: colors.surfaceSecondary, borderRadius: 24,
    paddingHorizontal: 16, paddingVertical: 10, ...typography.body, color: colors.textPrimary,
  },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#D94625', justifyContent: 'center', alignItems: 'center' },
});

export default SupportTicketDetail;
