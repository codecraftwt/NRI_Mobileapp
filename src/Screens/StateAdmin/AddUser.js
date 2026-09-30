import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Modal,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT, lightColors as baseColors } from '../../theme';
import { useStateAdminUsers } from '../../Hooks/StateAdmin/useStateAdminUsers';
import { getUserAssignableRoles, getUserRegionScope } from '../../Api/StateAdmin/stateAdminUsersApi';
import { getStates, getCities, getDistricts } from '../../Api/geoApi';
import { getServiceCategories } from '../../Api/catalogApi';

const C = {
  ...baseColors,
  primary: '#20304C',
  accent: '#A64416',
};

function AddUser({ navigation, route }) {
  const editUser = route.params?.editUser || null;
  const isEdit = !!editUser;
  const presetRole = route.params?.presetRole || null;

  const { createUser, updateUser, loadUserDetail, selectedUser, detailLoading, resetDetail } = useStateAdminUsers();

  // Form State
  const [name, setName] = useState(editUser?.name || '');
  const [email, setEmail] = useState(editUser?.email || '');
  const [phone, setPhone] = useState(editUser?.phone || '');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState(editUser?.role || presetRole || 'customer');
  const [isActive, setIsActive] = useState(editUser ? editUser.isActive : true);

  // Operations Geo & Scope
  const [selectedState, setSelectedState] = useState(
    editUser?.stateId ? { id: editUser.stateId, name: editUser.stateName || 'Selected State' } : null
  );
  const [selectedCity, setSelectedCity] = useState(
    editUser?.cityId ? { id: editUser.cityId, name: editUser.cityName || 'Selected City' } : null
  );
  const [selectedCategories, setSelectedCategories] = useState(editUser?.categoryIds || []);

  // District Admin scope: chips of {id, name} plus an independent "browse by
  // state" filter used only to find more districts to add (mirrors the admin
  // web UI, which leaves this filter blank even when districts are already
  // assigned).
  const [districtBrowseState, setDistrictBrowseState] = useState(null);
  const [availableDistricts, setAvailableDistricts] = useState([]);
  const [selectedDistricts, setSelectedDistricts] = useState([]);

  // Multi-Geo for Taluka / State Admin
  const [talukaIdsInput, setTalukaIdsInput] = useState(
    editUser?.talukaIds ? editUser.talukaIds.join(', ') : ''
  );
  const [stateIdsInput, setStateIdsInput] = useState(
    editUser?.stateIds ? editUser.stateIds.join(', ') : ''
  );

  // Master Data
  const [assignableRoles, setAssignableRoles] = useState([]);
  const [availableStates, setAvailableStates] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [scopedCityIds, setScopedCityIds] = useState(null);
  const [categories, setCategories] = useState([]);

  // Modal Pickers
  const [pickerModal, setPickerModal] = useState(null); // 'role' | 'state' | 'city'
  const [pickerSearch, setPickerSearch] = useState('');

  // UI States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [feedbackDialog, setFeedbackDialog] = useState(null);

  // The list screen only hands over what GET /admin/users returned for the
  // row (single state/city, no role-specific geo scope) — fetch the full
  // GET /admin/users/{user} record so District/Taluka/State scope fields and
  // the role-wise sections below are populated correctly, not left blank.
  useEffect(() => {
    if (!isEdit) return undefined;
    loadUserDetail(editUser.id);
    return () => resetDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, editUser?.id]);

  useEffect(() => {
    if (!isEdit || !selectedUser || selectedUser.id !== editUser.id) return;

    setName(selectedUser.name || '');
    setEmail(selectedUser.email || '');
    setPhone(selectedUser.phone || '');
    setRole(selectedUser.role || 'customer');
    setIsActive(selectedUser.isActive);
    setSelectedState(
      selectedUser.stateId ? { id: selectedUser.stateId, name: selectedUser.stateName || 'Selected State' } : null
    );
    setSelectedCity(
      selectedUser.cityId ? { id: selectedUser.cityId, name: selectedUser.cityName || 'Selected City' } : null
    );
    setSelectedCategories(selectedUser.categoryIds || []);
    setTalukaIdsInput(selectedUser.talukaIds ? selectedUser.talukaIds.join(', ') : '');
    setStateIdsInput(selectedUser.stateIds ? selectedUser.stateIds.join(', ') : '');

    if (selectedUser.role === 'district-admin' && selectedUser.districts?.length) {
      // assigned_districts already carries { id, name, stateId, stateName } — no extra fetch needed.
      setSelectedDistricts(selectedUser.districts);
    } else if (selectedUser.role === 'district-admin' && selectedUser.districtIds?.length) {
      setSelectedDistricts(selectedUser.districtIds.map(id => ({ id, name: `District #${id}` })));
    } else {
      setSelectedDistricts([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser]);

  // Districts available to add, scoped to whichever state the admin is
  // currently browsing (independent of the assigned chips above).
  useEffect(() => {
    if (!districtBrowseState?.id) {
      setAvailableDistricts([]);
      return;
    }
    getDistricts(districtBrowseState.id)
      .then(list => setAvailableDistricts(list.map(d => ({ ...d, stateName: districtBrowseState.name }))))
      .catch(() => setAvailableDistricts([]));
  }, [districtBrowseState]);

  const toggleDistrict = (d) => {
    setSelectedDistricts(prev =>
      prev.some(x => x.id === d.id) ? prev.filter(x => x.id !== d.id) : [...prev, d]
    );
  };

  const selectAllDistricts = () => {
    setSelectedDistricts(prev => {
      const map = new Map(prev.map(d => [d.id, d]));
      availableDistricts.forEach(d => map.set(d.id, d));
      return Array.from(map.values());
    });
  };

  const clearAllDistricts = () => setSelectedDistricts([]);

  // Load assignable roles, region scope, and master data
  useEffect(() => {
    let isMounted = true;

    async function init() {
      setLoadingInitial(true);
      try {
        const [rolesRes, scopeRes, catsRes] = await Promise.all([
          getUserAssignableRoles().catch(() => []),
          getUserRegionScope().catch(() => null),
          getServiceCategories().catch(() => []),
        ]);

        if (isMounted) {
          // If server returned assignable roles, use them; otherwise provide default fallbacks
          if (Array.isArray(rolesRes) && rolesRes.length > 0) {
            setAssignableRoles(rolesRes);
            if (!isEdit && !role) setRole(rolesRes[0].name);
          } else {
            setAssignableRoles([
              { name: 'customer', label: 'Customer' },
              { name: 'telecaller', label: 'Telecaller' },
              { name: 'field-executive', label: 'Field Executive' },
              { name: 'district-admin', label: 'District Admin' },
              { name: 'taluka-admin', label: 'Taluka Admin' },
            ]);
          }

          if (scopeRes?.states && scopeRes.states.length > 0) {
            setAvailableStates(scopeRes.states);
            setScopedCityIds(scopeRes.cityIds || null);
          } else {
            const rawStates = await getStates().catch(() => []);
            setAvailableStates(rawStates || []);
            setScopedCityIds(null);
          }

          setCategories(catsRes || []);
        }
      } catch (e) {
        // Fallback
      } finally {
        if (isMounted) setLoadingInitial(false);
      }
    }

    init();
    return () => { isMounted = false; };
  }, [isEdit, role]);

  // Load cities when state changes
  useEffect(() => {
    if (!selectedState?.id) {
      setAvailableCities([]);
      return;
    }

    getCities({ stateId: selectedState.id })
      .then(res => {
        let list = res || [];
        if (Array.isArray(scopedCityIds) && scopedCityIds.length > 0) {
          list = list.filter(c => scopedCityIds.includes(Number(c.id)));
        }
        setAvailableCities(list);
      })
      .catch(() => setAvailableCities([]));
  }, [selectedState, scopedCityIds]);

  const clearError = (f) => {
    if (fieldErrors[f]) setFieldErrors(prev => ({ ...prev, [f]: undefined }));
  };

  const isOpsRole = role === 'telecaller' || role === 'field-executive' || role === 'rm';

  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const handleSubmit = async () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Full name is required.';
    if (!email.trim()) errors.email = 'Email address is required.';
    if (!isEdit && !password) errors.password = 'Password is required.';
    if (password && password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (password && password !== passwordConfirmation) {
      errors.password_confirmation = 'Passwords do not match.';
    }

    if (role === 'district-admin' && selectedDistricts.length === 0) {
      errors.district_ids = 'At least one district is required for District Admin.';
    }
    if (role === 'taluka-admin' && !talukaIdsInput.trim()) {
      errors.taluka_ids = 'At least one Taluka ID is required for Taluka Admin.';
    }
    if (isOpsRole && !selectedCity?.id) {
      errors.city_id = 'Assigned City is required for Operations Staff.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSubmitting(true);

    const parseNumArray = (str) =>
      str
        .split(',')
        .map(s => Number(s.trim()))
        .filter(n => !isNaN(n) && n > 0);

    // Keys here must match the camelCase params that
    // createStateAdminUser/updateStateAdminUser destructure — those functions
    // build the snake_case request body themselves, so passing snake_case
    // keys here silently drops every field except name/email/phone/password/role.
    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      password: password || undefined,
      passwordConfirmation: password ? passwordConfirmation : undefined,
      role,
      isActive,
      stateId: selectedState?.id ? Number(selectedState.id) : undefined,
      cityId: selectedCity?.id ? Number(selectedCity.id) : undefined,
      stateIds: stateIdsInput.trim() ? parseNumArray(stateIdsInput) : undefined,
      districtIds: role === 'district-admin' ? selectedDistricts.map(d => Number(d.id)) : undefined,
      talukaIds: talukaIdsInput.trim() ? parseNumArray(talukaIdsInput) : undefined,
      categoryIds: selectedCategories.length > 0 ? selectedCategories : undefined,
    };

    try {
      if (isEdit) {
        const res = await updateUser(editUser.id, payload);
        setFeedbackDialog({
          type: 'success',
          title: 'Account Updated',
          message: res.message || 'User details have been successfully updated.',
        });
      } else {
        const res = await createUser(payload);
        setFeedbackDialog({
          type: 'success',
          title: 'Account Created',
          message: res.message || 'Staff / Customer account has been created.',
        });
      }
    } catch (e) {
      setFeedbackDialog({
        type: 'error',
        title: isEdit ? 'Update Failed' : 'Creation Failed',
        message: e?.message || 'An error occurred while saving the account.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {isEdit ? `Edit User — ${name || editUser?.name || ''}` : 'Add New User'}
          </Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>
          {isEdit
            ? 'Update account credentials, role, and jurisdiction'
            : 'Create a new staff or customer account within your coverage'}
        </Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loadingInitial || (isEdit && detailLoading) ? (
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color="#A64416" />
              <Text style={styles.loaderText}>Loading configuration...</Text>
            </View>
          ) : (
            <>
              {/* Account Information */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionHeadingRow}>
                  <Icon name="account-circle" size={20} color="#20304C" />
                  <Text style={styles.sectionTitle}>Account Details</Text>
                </View>

                <Text style={styles.label}>Full Name *</Text>
                <View style={[styles.inputWrap, fieldErrors.name && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Rahul Sharma"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={(v) => { setName(v); clearError('name'); }}
                  />
                </View>
                {!!fieldErrors.name && <Text style={styles.errorText}>{fieldErrors.name}</Text>}

                <Text style={styles.label}>Email Address *</Text>
                <View style={[styles.inputWrap, fieldErrors.email && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="customer@example.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={email}
                    onChangeText={(v) => { setEmail(v); clearError('email'); }}
                  />
                </View>
                {!!fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}

                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 98765 43210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>

                <Text style={styles.label}>Role *</Text>
                <View style={styles.roleActiveRow}>
                  <TouchableOpacity
                    style={[styles.dropdownWrap, { flex: 1 }]}
                    onPress={() => setPickerModal('role')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownValue}>
                      {assignableRoles.find(r => r.name === role)?.label || role}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={22} color="#64748B" />
                  </TouchableOpacity>

                  <View style={styles.activeToggleWrap}>
                    <Text style={styles.activeToggleLabel}>{isActive ? 'Active' : 'Inactive'}</Text>
                    <Switch
                      value={isActive}
                      onValueChange={setIsActive}
                      trackColor={{ false: '#CBD5E1', true: '#93C5FD' }}
                      thumbColor={isActive ? '#2563EB' : '#F1F5F9'}
                    />
                  </View>
                </View>

                {/* Password Fields */}
                <Text style={styles.label}>
                  {isEdit ? 'New Password (leave empty to keep current)' : 'Password *'}
                </Text>
                <View style={[styles.inputWrap, fieldErrors.password && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder={isEdit ? '••••••••' : 'Minimum 6 characters'}
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError('password'); }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                    <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={20} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {!!fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}

                {(!isEdit || !!password) && (
                  <>
                    <Text style={styles.label}>Confirm Password *</Text>
                    <View style={[styles.inputWrap, fieldErrors.password_confirmation && styles.inputError]}>
                      <TextInput
                        style={styles.input}
                        placeholder="Re-enter password"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        value={passwordConfirmation}
                        onChangeText={(v) => { setPasswordConfirmation(v); clearError('password_confirmation'); }}
                      />
                    </View>
                    {!!fieldErrors.password_confirmation && (
                      <Text style={styles.errorText}>{fieldErrors.password_confirmation}</Text>
                    )}
                  </>
                )}
              </View>

              {/* Operations Scope Section (for Telecallers / Field Executives / RM) */}
              {isOpsRole && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeadingRow}>
                    <Icon name="place" size={20} color="#20304C" />
                    <Text style={styles.sectionTitle}>Operations Jurisdiction</Text>
                  </View>

                  <Text style={styles.label}>State *</Text>
                  <TouchableOpacity
                    style={styles.dropdownWrap}
                    onPress={() => setPickerModal('state')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownValue}>
                      {selectedState?.name || 'Select State...'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={22} color="#64748B" />
                  </TouchableOpacity>

                  <Text style={styles.label}>Assigned City *</Text>
                  <TouchableOpacity
                    style={[styles.dropdownWrap, !selectedState && styles.disabledWrap]}
                    disabled={!selectedState}
                    onPress={() => setPickerModal('city')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownValue}>
                      {selectedCity?.name || (selectedState ? 'Select City...' : 'Select State first')}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={22} color="#64748B" />
                  </TouchableOpacity>
                  {!!fieldErrors.city_id && <Text style={styles.errorText}>{fieldErrors.city_id}</Text>}

                  {/* Categories */}
                  {categories.length > 0 && (
                    <>
                      <Text style={[styles.label, { marginTop: 14 }]}>Assigned Categories (Optional)</Text>
                      <View style={styles.categoriesWrap}>
                        {categories.map(cat => {
                          const isSel = selectedCategories.includes(cat.id);
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[styles.catChip, isSel && styles.catChipActive]}
                              onPress={() => toggleCategory(cat.id)}
                            >
                              <Text style={[styles.catChipText, isSel && styles.catChipTextActive]}>
                                {cat.name}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </>
                  )}
                </View>
              )}

              {/* District Admin Scopes */}
              {role === 'district-admin' && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeadingRow}>
                    <Icon name="map" size={20} color="#20304C" />
                    <Text style={styles.sectionTitle}>Geographic Scope</Text>
                  </View>
                  <Text style={styles.scopeHint}>Assign the geographic scope this user will manage.</Text>

                  <Text style={styles.label}>State</Text>
                  <TouchableOpacity
                    style={styles.dropdownWrap}
                    onPress={() => setPickerModal('districtState')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownValue}>
                      {districtBrowseState?.name || 'Select state to browse districts...'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={22} color="#64748B" />
                  </TouchableOpacity>

                  <View style={styles.districtsHeaderRow}>
                    <Text style={[styles.label, { marginTop: 14 }]}>Assigned Districts *</Text>
                    <View style={{ flexDirection: 'row', gap: 14 }}>
                      <TouchableOpacity onPress={selectAllDistricts} disabled={!availableDistricts.length}>
                        <Text style={[styles.linkText, !availableDistricts.length && styles.linkTextDisabled]}>
                          Select all
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={clearAllDistricts} disabled={!selectedDistricts.length}>
                        <Text
                          style={[
                            styles.linkText,
                            { color: '#EF4444' },
                            !selectedDistricts.length && styles.linkTextDisabled,
                          ]}
                        >
                          Clear all
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {selectedDistricts.length > 0 && (
                    <View style={styles.categoriesWrap}>
                      {selectedDistricts.map(d => (
                        <View key={d.id} style={styles.districtChip}>
                          <Text style={styles.districtChipText}>
                            {d.name}{d.stateName ? ` · ${d.stateName}` : ''}
                          </Text>
                          <TouchableOpacity
                            onPress={() => toggleDistrict(d)}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          >
                            <Icon name="close" size={14} color="#4338CA" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[styles.dropdownWrap, !districtBrowseState && styles.disabledWrap, { marginTop: 10 }]}
                    disabled={!districtBrowseState}
                    onPress={() => setPickerModal('district')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.dropdownValue}>
                      {districtBrowseState ? 'Select a district...' : 'Select a state first...'}
                    </Text>
                    <Icon name="keyboard-arrow-down" size={22} color="#64748B" />
                  </TouchableOpacity>
                  {!!fieldErrors.district_ids && (
                    <Text style={styles.errorText}>{fieldErrors.district_ids}</Text>
                  )}
                </View>
              )}

              {/* Taluka Admin Scopes */}
              {role === 'taluka-admin' && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeadingRow}>
                    <Icon name="holiday-village" size={20} color="#20304C" />
                    <Text style={styles.sectionTitle}>Taluka Scopes</Text>
                  </View>
                  <Text style={styles.label}>Taluka IDs (comma separated) *</Text>
                  <View style={[styles.inputWrap, fieldErrors.taluka_ids && styles.inputError]}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 201, 202"
                      placeholderTextColor="#94A3B8"
                      value={talukaIdsInput}
                      onChangeText={(v) => { setTalukaIdsInput(v); clearError('taluka_ids'); }}
                    />
                  </View>
                  {!!fieldErrors.taluka_ids && (
                    <Text style={styles.errorText}>{fieldErrors.taluka_ids}</Text>
                  )}
                </View>
              )}

              {/* State Admin Scopes */}
              {role === 'state-admin' && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeadingRow}>
                    <Icon name="public" size={20} color="#20304C" />
                    <Text style={styles.sectionTitle}>State Jurisdiction</Text>
                  </View>
                  <Text style={styles.label}>State IDs (comma separated, empty = National Admin)</Text>
                  <View style={styles.inputWrap}>
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. 1, 2"
                      placeholderTextColor="#94A3B8"
                      value={stateIdsInput}
                      onChangeText={setStateIdsInput}
                    />
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.submitBtnText}>
                      {isEdit ? 'Update Account' : 'Create Account'}
                    </Text>
                    <Icon name="check" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Picker Modal for Role / State / City */}
      <Modal visible={!!pickerModal} transparent animationType="fade" onRequestClose={() => setPickerModal(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerModal === 'role'
                  ? 'Select Role'
                  : pickerModal === 'state' || pickerModal === 'districtState'
                  ? 'Select State'
                  : pickerModal === 'district'
                  ? 'Select Districts'
                  : 'Select City'}
              </Text>
              <TouchableOpacity onPress={() => { setPickerModal(null); setPickerSearch(''); }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.pickerSearchBar}>
              <Icon name="search" size={18} color="#94A3B8" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search..."
                placeholderTextColor="#94A3B8"
                value={pickerSearch}
                onChangeText={setPickerSearch}
              />
            </View>

            <ScrollView style={{ maxHeight: 300 }} showsVerticalScrollIndicator={false}>
              {pickerModal === 'role' &&
                assignableRoles
                  .filter(r => r.label.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(r => (
                    <TouchableOpacity
                      key={r.name}
                      style={[styles.pickerItem, role === r.name && styles.pickerItemActive]}
                      onPress={() => {
                        setRole(r.name);
                        setPickerModal(null);
                        setPickerSearch('');
                      }}
                    >
                      <Text style={[styles.pickerItemText, role === r.name && styles.pickerItemTextActive]}>
                        {r.label}
                      </Text>
                      {role === r.name && <Icon name="check" size={18} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}

              {pickerModal === 'state' &&
                availableStates
                  .filter(st => st.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(st => (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.pickerItem, selectedState?.id === st.id && styles.pickerItemActive]}
                      onPress={() => {
                        setSelectedState(st);
                        setSelectedCity(null);
                        setPickerModal(null);
                        setPickerSearch('');
                      }}
                    >
                      <Text style={[styles.pickerItemText, selectedState?.id === st.id && styles.pickerItemTextActive]}>
                        {st.name}
                      </Text>
                      {selectedState?.id === st.id && <Icon name="check" size={18} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}

              {pickerModal === 'city' &&
                availableCities
                  .filter(ct => ct.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(ct => (
                    <TouchableOpacity
                      key={ct.id}
                      style={[styles.pickerItem, selectedCity?.id === ct.id && styles.pickerItemActive]}
                      onPress={() => {
                        setSelectedCity(ct);
                        clearError('city_id');
                        setPickerModal(null);
                        setPickerSearch('');
                      }}
                    >
                      <Text style={[styles.pickerItemText, selectedCity?.id === ct.id && styles.pickerItemTextActive]}>
                        {ct.name}
                      </Text>
                      {selectedCity?.id === ct.id && <Icon name="check" size={18} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}

              {pickerModal === 'districtState' &&
                availableStates
                  .filter(st => st.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(st => (
                    <TouchableOpacity
                      key={st.id}
                      style={[styles.pickerItem, districtBrowseState?.id === st.id && styles.pickerItemActive]}
                      onPress={() => {
                        setDistrictBrowseState(st);
                        setPickerModal(null);
                        setPickerSearch('');
                      }}
                    >
                      <Text style={[styles.pickerItemText, districtBrowseState?.id === st.id && styles.pickerItemTextActive]}>
                        {st.name}
                      </Text>
                      {districtBrowseState?.id === st.id && <Icon name="check" size={18} color="#2563EB" />}
                    </TouchableOpacity>
                  ))}

              {pickerModal === 'district' &&
                availableDistricts
                  .filter(d => d.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(d => {
                    const isSel = selectedDistricts.some(x => x.id === d.id);
                    return (
                      <TouchableOpacity
                        key={d.id}
                        style={[styles.pickerItem, isSel && styles.pickerItemActive]}
                        onPress={() => { toggleDistrict(d); clearError('district_ids'); }}
                      >
                        <Text style={[styles.pickerItemText, isSel && styles.pickerItemTextActive]}>
                          {d.name}
                        </Text>
                        <Icon
                          name={isSel ? 'check-box' : 'check-box-outline-blank'}
                          size={18}
                          color={isSel ? '#2563EB' : '#CBD5E1'}
                        />
                      </TouchableOpacity>
                    );
                  })}
            </ScrollView>

            {pickerModal === 'district' && (
              <TouchableOpacity
                style={styles.pickerDoneBtn}
                onPress={() => { setPickerModal(null); setPickerSearch(''); }}
              >
                <Text style={styles.pickerDoneBtnText}>Done ({selectedDistricts.length} selected)</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      {/* Feedback Dialog */}
      <Modal visible={!!feedbackDialog} transparent animationType="fade" onRequestClose={() => setFeedbackDialog(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View
              style={[
                styles.feedbackIconWrap,
                { backgroundColor: feedbackDialog?.type === 'success' ? '#ECFDF5' : '#FEF2F2' },
              ]}
            >
              <Icon
                name={feedbackDialog?.type === 'success' ? 'check' : 'error'}
                size={30}
                color={feedbackDialog?.type === 'success' ? '#10B981' : '#EF4444'}
              />
            </View>
            <Text style={styles.dialogTitle}>{feedbackDialog?.title}</Text>
            <Text style={styles.dialogMsg}>{feedbackDialog?.message}</Text>

            <TouchableOpacity
              style={styles.dialogOkBtn}
              onPress={() => {
                const wasSuccess = feedbackDialog?.type === 'success';
                setFeedbackDialog(null);
                if (wasSuccess) navigation.goBack();
              }}
            >
              <Text style={styles.dialogOkBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    backgroundColor: '#20304C',
    paddingTop: STATUS_BAR_HEIGHT + 14,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: 'relative',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute',
    top: -50,
    right: -40,
    width: 170,
    height: 170,
    borderRadius: 85,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFFFFF' },
  headerSub: { fontSize: 13, color: 'rgba(255, 255, 255, 0.7)', marginTop: 8, lineHeight: 18 },

  body: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40, gap: 14 },

  loaderWrap: { paddingVertical: 60, alignItems: 'center' },
  loaderText: { fontSize: 13, color: '#64748B', marginTop: 12 },

  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 10 },
  scopeHint: { fontSize: 12, color: '#64748B', marginBottom: 4 },

  roleActiveRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  activeToggleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeToggleLabel: { fontSize: 12, fontWeight: '600', color: '#334155' },

  districtsHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  linkText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  linkTextDisabled: { color: '#CBD5E1' },
  districtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#E0E7FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  districtChipText: { fontSize: 12, color: '#4338CA', fontWeight: '600' },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
  },
  input: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 4, marginLeft: 4 },

  dropdownWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
  },
  disabledWrap: { opacity: 0.5, backgroundColor: '#F1F5F9' },
  dropdownValue: { fontSize: 14, color: '#0F172A', fontWeight: '500' },

  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  switchLabel: { fontSize: 13, fontWeight: '700', color: '#0F172A' },
  switchSub: { fontSize: 11, color: '#64748B', marginTop: 2 },

  categoriesWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  catChipActive: { backgroundColor: '#EFF6FF', borderColor: '#2563EB' },
  catChipText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  catChipTextActive: { color: '#2563EB', fontWeight: '700' },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#A64416',
    height: 52,
    borderRadius: 26,
    marginTop: 8,
    shadowColor: '#A64416',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Picker Modal
  dialogOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  pickerModalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  pickerSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 12,
  },
  pickerSearchInput: { flex: 1, fontSize: 13, color: '#0F172A', padding: 0 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  pickerItemActive: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8 },
  pickerItemText: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  pickerItemTextActive: { color: '#2563EB', fontWeight: '700' },
  pickerDoneBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerDoneBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  dialogCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  feedbackIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  dialogMsg: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  dialogOkBtn: {
    width: '100%',
    height: 44,
    borderRadius: 22,
    backgroundColor: '#20304C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialogOkBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default AddUser;
