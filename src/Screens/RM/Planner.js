import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar, Modal, TextInput, Platform, Alert, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { typography } from '../../theme/typography';
import { useRmPlanner } from '../../Hooks/RM/useRmPlanner';
import { useRmCustomers } from '../../Hooks/RM/useRmCustomers';

const titleCase = (s) => String(s || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

const TYPES = [
  { value: 'follow_up', label: 'Follow-up', icon: 'call', color: '#3B82F6' },
  { value: 'visit', label: 'Visit', icon: 'home', color: '#8B5CF6' },
  { value: 'renewal', label: 'Renewal', icon: 'autorenew', color: '#0EA5E9' },
];
const typeMeta = (v) => TYPES.find(t => t.value === v) || { value: v, label: titleCase(v), icon: 'event', color: '#64748B' };

const SECTIONS = [
  { key: 'overdue', label: 'Overdue', color: '#DC2626', icon: 'error-outline' },
  { key: 'today', label: 'Today', color: '#C2410C', icon: 'today' },
  { key: 'upcoming', label: 'Upcoming', color: '#2563EB', icon: 'event' },
  { key: 'recentlyDone', label: 'Recently Done', color: '#059669', icon: 'check-circle' },
];

function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function Planner() {
  const planner = useRmPlanner();
  const { customers } = useRmCustomers('');

  // Add form state
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const [type, setType] = useState('follow_up');
  const [dueAt, setDueAt] = useState(null);
  const [customerId, setCustomerId] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [notes, setNotes] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(null);

  const resetForm = () => {
    setTitle(''); setType('follow_up'); setDueAt(null); setCustomerId(null); setCustomerName(''); setNotes('');
  };

  const handleDateChange = (event, selected) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed' || !selected) return;
    if (Platform.OS === 'android') { setPendingDate(selected); setShowTimePicker(true); }
    else setDueAt(selected);
  };

  const handleTimeChange = (event, selected) => {
    setShowTimePicker(false);
    if (event.type === 'dismissed' || !selected || !pendingDate) { setPendingDate(null); return; }
    const combined = new Date(pendingDate);
    combined.setHours(selected.getHours(), selected.getMinutes());
    setDueAt(combined);
    setPendingDate(null);
  };

  const submit = () => {
    if (!title.trim() || !dueAt || planner.adding) return;
    planner.add({ title: title.trim(), type, dueAt: dueAt.toISOString(), customerId, notes: notes.trim() })
      .unwrap()
      .then(() => { setShowAdd(false); resetForm(); planner.refresh(); })
      .catch((e) => Alert.alert('Could Not Add', e?.message || 'Please check the details and try again.'));
  };

  const onComplete = (ev) => {
    if (ev.done) return;
    planner.complete(ev.id).unwrap?.().then(() => planner.refresh()).catch(() => {});
  };

  const onDelete = (ev) => {
    Alert.alert('Remove Event', `Remove "${ev.title}" from your planner?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => planner.remove(ev.id).unwrap?.().then(() => planner.refresh()).catch(() => {}) },
    ]);
  };

  const isEmpty = !planner.overdue.length && !planner.today.length && !planner.upcoming.length && !planner.recentlyDone.length;

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planner</Text>
        <Text style={styles.headerSub}>Visits, follow-ups & renewals</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Schedule</Text>
          <TouchableOpacity style={styles.addBtn} onPress={() => setShowAdd(true)} activeOpacity={0.85}>
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {planner.loading && isEmpty ? (
          <View style={styles.emptyState}><ActivityIndicator size="large" color="#20304C" /></View>
        ) : isEmpty ? (
          <View style={styles.emptyState}>
            <Icon name="event-available" size={48} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>Nothing planned yet</Text>
            <Text style={styles.emptyText}>Tap “Add” to schedule a visit, follow-up or renewal.</Text>
          </View>
        ) : (
          SECTIONS.map(sec => {
            const items = planner[sec.key];
            if (!items || items.length === 0) return null;
            return (
              <View key={sec.key} style={styles.group}>
                <View style={styles.groupHeader}>
                  <Icon name={sec.icon} size={16} color={sec.color} />
                  <Text style={[styles.groupTitle, { color: sec.color }]}>{sec.label}</Text>
                  <View style={[styles.groupCount, { backgroundColor: sec.color + '15' }]}>
                    <Text style={[styles.groupCountText, { color: sec.color }]}>{items.length}</Text>
                  </View>
                </View>

                {items.map(ev => {
                  const tm = typeMeta(ev.type);
                  return (
                    <TouchableOpacity
                      key={ev.id}
                      style={styles.taskCard}
                      activeOpacity={0.8}
                      onLongPress={() => onDelete(ev)}
                    >
                      <View style={[styles.taskIconBg, { backgroundColor: tm.color + '15' }]}>
                        <Icon name={tm.icon} size={18} color={tm.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.taskTitle, ev.done && styles.taskDone]} numberOfLines={1}>{ev.title}</Text>
                        <Text style={styles.taskMeta} numberOfLines={1}>
                          {tm.label}{ev.customer ? ` · ${ev.customer}` : ''}{ev.dueAt ? ` · ${fmtDateTime(ev.dueAt)}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => onComplete(ev)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                        <Icon name={ev.done ? 'check-circle' : 'radio-button-unchecked'} size={24} color={ev.done ? '#16A34A' : '#CBD5E1'} />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  );
                })}
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Add / "Plan Something" modal */}
      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Icon name="add-circle-outline" size={22} color="#20304C" />
              <Text style={styles.modalTitle}>Plan Something</Text>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowAdd(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title */}
              <Text style={styles.fieldLabel}>Title <Text style={styles.req}>*</Text></Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Renewal call with Mr. Patil"
                placeholderTextColor="#94A3B8"
                value={title}
                onChangeText={setTitle}
              />

              {/* Type + When */}
              <View style={styles.rowTwo}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Type</Text>
                  <TouchableOpacity style={styles.select} onPress={() => setShowTypePicker(true)} activeOpacity={0.7}>
                    <Text style={styles.selectText}>{typeMeta(type).label}</Text>
                    <Icon name="expand-more" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>When <Text style={styles.req}>*</Text></Text>
                  <TouchableOpacity style={styles.select} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
                    <Text style={[styles.selectText, !dueAt && styles.selectPlaceholder]} numberOfLines={1}>
                      {dueAt ? fmtDateTime(dueAt) : 'dd-mm-yyyy --:--'}
                    </Text>
                    <Icon name="event" size={18} color="#64748B" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Customer */}
              <Text style={styles.fieldLabel}>Customer <Text style={styles.optional}>(optional)</Text></Text>
              <TouchableOpacity style={styles.select} onPress={() => setShowCustomerPicker(true)} activeOpacity={0.7}>
                <Text style={[styles.selectText, !customerId && styles.selectPlaceholder]} numberOfLines={1}>
                  {customerName || '—'}
                </Text>
                <Icon name="expand-more" size={20} color="#64748B" />
              </TouchableOpacity>

              {/* Notes */}
              <Text style={styles.fieldLabel}>Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add any details..."
                placeholderTextColor="#94A3B8"
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity
                style={[styles.submitBtn, (!title.trim() || !dueAt || planner.adding) && styles.submitBtnDisabled]}
                onPress={submit}
                disabled={!title.trim() || !dueAt || planner.adding}
                activeOpacity={0.85}
              >
                {planner.adding ? <ActivityIndicator size="small" color="#FFFFFF" /> : (
                  <>
                    <Icon name="add" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Add to Planner</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.helperText}>You'll get an in-app reminder on the morning an item is due.</Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Type picker */}
      <Modal visible={showTypePicker} transparent animationType="fade" onRequestClose={() => setShowTypePicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowTypePicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Type</Text>
            {TYPES.map(t => (
              <TouchableOpacity key={t.value} style={styles.pickerRow} onPress={() => { setType(t.value); setShowTypePicker(false); }} activeOpacity={0.7}>
                <View style={[styles.taskIconBg, { backgroundColor: t.color + '15' }]}><Icon name={t.icon} size={16} color={t.color} /></View>
                <Text style={styles.pickerRowText}>{t.label}</Text>
                {type === t.value && <Icon name="check" size={20} color="#20304C" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Customer picker */}
      <Modal visible={showCustomerPicker} transparent animationType="fade" onRequestClose={() => setShowCustomerPicker(false)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setShowCustomerPicker(false)}>
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>Select Customer</Text>
            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              <TouchableOpacity style={styles.pickerRow} onPress={() => { setCustomerId(null); setCustomerName(''); setShowCustomerPicker(false); }} activeOpacity={0.7}>
                <Text style={styles.pickerRowText}>— None —</Text>
                {!customerId && <Icon name="check" size={20} color="#20304C" />}
              </TouchableOpacity>
              {customers.map(c => (
                <TouchableOpacity key={c.id} style={styles.pickerRow} onPress={() => { setCustomerId(c.id); setCustomerName(c.name); setShowCustomerPicker(false); }} activeOpacity={0.7}>
                  <Text style={styles.pickerRowText} numberOfLines={1}>{c.name}</Text>
                  {customerId === c.id && <Icon name="check" size={20} color="#20304C" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {showDatePicker && (
        <DateTimePicker
          value={dueAt || new Date()}
          mode={Platform.OS === 'ios' ? 'datetime' : 'date'}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={pendingDate || dueAt || new Date()}
          mode="time"
          display="default"
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D94625', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },

  group: { marginBottom: 22 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  groupTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily },
  groupCount: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
  groupCountText: { fontSize: 11, fontWeight: '700' },

  taskCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  taskIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  taskTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  taskDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  taskMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },

  emptyState: { paddingVertical: 70, alignItems: 'center', gap: 10 },
  emptyTitle: { fontSize: 17, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  emptyText: { fontSize: 13, color: '#94A3B8', textAlign: 'center', paddingHorizontal: 40 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingBottom: 14, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalTitle: { flex: 1, fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  modalClose: { padding: 2 },

  fieldLabel: { fontSize: 13, fontFamily: typography.labelMedium.fontFamily, color: '#334155', marginTop: 16, marginBottom: 8 },
  req: { color: '#DC2626' },
  optional: { color: '#94A3B8', fontWeight: '400' },
  input: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#0F172A' },
  textArea: { minHeight: 84, textAlignVertical: 'top' },
  rowTwo: { flexDirection: 'row', gap: 12 },
  select: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 14, height: 46 },
  selectText: { flex: 1, fontSize: 14, color: '#0F172A' },
  selectPlaceholder: { color: '#94A3B8' },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#D94625', borderRadius: 24, paddingVertical: 15, marginTop: 22 },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontSize: 15, fontFamily: typography.labelMedium.fontFamily },
  helperText: { fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: 14, lineHeight: 17 },

  // Pickers
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', paddingHorizontal: 28 },
  pickerSheet: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16 },
  pickerTitle: { fontSize: 16, fontFamily: typography.h2.fontFamily, color: '#0F172A', marginBottom: 8 },
  pickerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  pickerRowText: { flex: 1, fontSize: 15, color: '#334155' },
});

export default Planner;
