import React, { useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../theme/typography';

// Matches the backend's family_member_relationship enum — shared by every
// booking screen so "Myself"/"Parent"/etc. are sent the same way everywhere.
export const RELATION_OPTIONS = ['Myself', 'Parent', 'Sibling', 'Spouse', 'Child', 'Other'];

// Kept only so existing callers that pre-select "someone else" (e.g.
// FinishRequest.js prefilling from a pending quoted request) still work —
// any non-number value here behaves identically to null below.
export const SOMEONE_ELSE = 'someone-else';

// Common keyboard-row mashes (qwertyu, xcvbnm, asdfg, ...) typed instead of a
// real name — checked as a substring match against the full row so any
// contiguous chunk of one is caught, not just the exact row itself.
const KEYBOARD_ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

// Basic sanity check for a typed (not picked-from-saved) name — this can't
// know if "Priya Shah" is a real person, but it catches the obvious cases:
// blank/too-short input, digits/symbols, no vowels, or keyboard mashing.
export function isValidFamilyMemberName(name) {
  const trimmed = (name || '').trim();
  if (trimmed.length < 2) return false;
  if (!/^[A-Za-z\s.'-]+$/.test(trimmed)) return false;
  if (!/[aeiouAEIOU]/.test(trimmed)) return false;
  const lettersOnly = trimmed.toLowerCase().replace(/[^a-z]/g, '');
  if (KEYBOARD_ROWS.some(row => row.includes(lettersOnly))) return false;
  return true;
}

// "Who is this for?" picker used on every booking form — a single Full Name
// field that doubles as an autocomplete: focusing it (or typing) shows a
// dropdown of the customer's saved family members (name + relationship_label)
// filtered by what's typed. Tapping one fills the name and locks in its
// relation (sends family_member_id on submit); typing anything else is
// treated as a new person — a Relation field appears below it, and the
// screen sends family_member_name/family_member_relationship instead, which
// the backend saves as a new family member automatically.
//
// `selectedMemberId` is a number (a saved member's id) once one is picked,
// or null/non-number otherwise. `name`/`relation` are owned by the caller.
export default function FamilyMemberPicker({
  members,
  membersLoading,
  selectedMemberId,
  onSelectMemberId,
  name,
  onChangeName,
  relation,
  onChangeRelation,
  required,
}) {
  const [focused, setFocused] = useState(false);
  const [relationOpen, setRelationOpen] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const blurTimeoutRef = useRef(null);

  const isSavedSelected = typeof selectedMemberId === 'number';
  const query = name.trim().toLowerCase();
  const filteredMembers = query
    ? (members || []).filter(m => m.name.toLowerCase().includes(query))
    : (members || []);

  const nameError = nameTouched && !isSavedSelected && name.trim().length > 0 && !isValidFamilyMemberName(name)
    ? "That doesn't look like a real name — please check it."
    : null;

  const handleChangeName = (text) => {
    onChangeName(text);
    // Typing invalidates a previous saved pick — back to "new person" mode
    // until a suggestion is tapped again.
    if (isSavedSelected) onSelectMemberId(null);
  };

  const handlePickMember = (m) => {
    onSelectMemberId(m.id);
    onChangeName(m.name);
    const label = RELATION_OPTIONS.find(r => r.toLowerCase() === (m.relationship || '').toLowerCase()) || m.relationshipLabel || '';
    onChangeRelation(label);
    setFocused(false);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    setFocused(true);
  };

  // Delayed so a tap on a dropdown row registers before the row unmounts —
  // onBlur otherwise fires first and the row's onPress never gets a chance.
  const handleBlur = () => {
    setNameTouched(true);
    blurTimeoutRef.current = setTimeout(() => setFocused(false), 150);
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.label}>
        Full Name
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>

      <View>
        <TextInput
          style={[styles.input, !!nameError && styles.inputError]}
          value={name}
          onChangeText={handleChangeName}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder="Choose a family member or type a name"
          placeholderTextColor="#94A3B8"
          editable={!membersLoading}
        />
        {membersLoading && <ActivityIndicator size="small" color="#D94625" style={styles.inputSpinner} />}

        {focused && !membersLoading && (filteredMembers.length > 0 || query.length > 0) && (
          <View style={styles.dropdown}>
            <Text style={styles.dropdownHeader}>YOUR FAMILY MEMBERS</Text>
            {filteredMembers.length > 0 ? (
              <ScrollView keyboardShouldPersistTaps="handled" style={styles.dropdownScroll} nestedScrollEnabled>
                {filteredMembers.map(m => (
                  <TouchableOpacity key={m.id} style={styles.dropdownRow} onPress={() => handlePickMember(m)} activeOpacity={0.7}>
                    <Icon name="person-outline" size={18} color="#64748B" style={{ marginRight: 8 }} />
                    <Text style={styles.dropdownName} numberOfLines={1}>{m.name}</Text>
                    <View style={styles.relationPill}>
                      <Text style={styles.relationPillText}>{m.relationshipLabel || m.relationship}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.dropdownEmptyText}>
                No saved family member matches — we'll add "{name.trim()}" as new.
              </Text>
            )}
          </View>
        )}
      </View>
      {!!nameError && <Text style={styles.errorText}>{nameError}</Text>}

      <View style={styles.fieldWrap}>
        <Text style={styles.label}>Relation<Text style={styles.required}> *</Text></Text>
        <TouchableOpacity style={styles.selectBox} onPress={() => setRelationOpen(true)} activeOpacity={0.7}>
          <Text style={[styles.selectText, !relation && styles.placeholderText]} numberOfLines={1}>
            {relation || 'Select...'}
          </Text>
          <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
        </TouchableOpacity>
        <Modal visible={relationOpen} transparent animationType="fade" onRequestClose={() => setRelationOpen(false)}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setRelationOpen(false)}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalTitle}>Relation</Text>
              <FlatList
                data={RELATION_OPTIONS}
                keyExtractor={item => item}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.modalOption}
                    onPress={() => { onChangeRelation(item); setRelationOpen(false); }}
                  >
                    <Text style={[styles.modalOptionText, item === relation && styles.modalOptionTextActive]}>{item}</Text>
                    {item === relation && <Icon name="check" size={20} color="#D94625" />}
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { gap: 8 },
  label: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  required: { color: '#DC2626' },
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    backgroundColor: '#F8FAFC',
  },
  selectText: { fontSize: 15, color: '#0F172A', flex: 1 },
  placeholderText: { color: '#94A3B8' },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  inputError: { borderColor: '#EF4444' },
  inputSpinner: { position: 'absolute', right: 16, top: 16 },
  errorText: { fontSize: 12, color: '#EF4444', marginTop: -4 },

  dropdown: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingTop: 12,
    paddingBottom: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    zIndex: 20,
  },
  dropdownScroll: { maxHeight: 220 },
  dropdownHeader: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#94A3B8',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownName: { flex: 1, fontSize: 15, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  dropdownEmptyText: { fontSize: 13.5, color: '#64748B', lineHeight: 19, paddingHorizontal: 16, paddingBottom: 14 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '60%',
    paddingBottom: 24,
    paddingTop: 12,
  },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontFamily: typography.h2.fontFamily, color: '#0F172A', paddingHorizontal: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 8,
  },
  modalOptionText: { fontSize: 15, color: '#0F172A', flexShrink: 1 },
  modalOptionTextActive: { color: '#D94625', fontFamily: typography.labelMedium.fontFamily },
  relationPill: { backgroundColor: '#F1F5F9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  relationPillText: { fontSize: 12, fontFamily: typography.labelMedium.fontFamily, color: '#64748B' },
});
