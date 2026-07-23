import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Header from '../../Components/Header';
import { sendTicketSupportChat } from '../../Api/ticketApi';
import { lightColors as colors } from '../../theme/colors';
import { typography } from '../../theme/typography';

function RequestSupportChat({ route, navigation }) {
  const { serviceTicketId } = route.params || {};
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const createLoading = sending;

  const handleSend = async () => {
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      // Start-or-continue the request-linked chat via
      // POST /customer/tickets/{id}/support-chat, then open the full thread.
      const result = await sendTicketSupportChat(serviceTicketId, message.trim());
      const chat = result.chat;
      if (!chat?.id) {
        Alert.alert('Could Not Start Chat', 'Please try again.');
        return;
      }
      navigation.replace('SupportTicketChat', { ticketId: chat.id, createdTicketNumber: chat.ticketNumber });
    } catch (error) {
      Alert.alert('Could Not Start Chat', error?.message || 'Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header navigation={navigation} showBack />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Icon name="chat-bubble-outline" size={20} color={colors.primary} />
            <Text style={styles.headerTitle}>Support Chat</Text>
          </View>
          <View style={styles.divider} />

          <Text style={styles.label}>Start a conversation about this request:</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Type your message..."
            placeholderTextColor="#94A3B8"
            multiline
            numberOfLines={6}
            value={message}
            onChangeText={setMessage}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!message.trim() || createLoading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!message.trim() || createLoading}
          >
            {createLoading ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
              <>
                <Text style={styles.sendBtnText}>Send</Text>
                <Icon name="send" size={16} color="#FFFFFF" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 60 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginTop: 14, marginBottom: 18 },

  label: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#475569', marginBottom: 10 },
  textArea: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
    textAlignVertical: 'top',
    minHeight: 140,
  },
  sendBtn: { flexDirection: 'row', alignSelf: 'flex-end', alignItems: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 20, paddingHorizontal: 22, paddingVertical: 12, marginTop: 16 },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#FFFFFF', fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
});

export default RequestSupportChat;
