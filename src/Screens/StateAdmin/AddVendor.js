import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT, lightColors as baseColors } from '../../theme';
import { createStateAdminVendor, fetchStateAdminVendors } from '../../Redux/slices/stateAdminVendorsSlice';
import { getVendorRegionScope } from '../../Api/StateAdmin/stateAdminVendorsApi';
import { getStates, getCities } from '../../Api/geoApi';
import { getServiceCategories, getServices } from '../../Api/catalogApi';

const C = {
  ...baseColors,
  primary: '#20304C',
  accent: '#A64416',
  orange: '#F97316',
};

const VENDOR_TYPES = [
  { id: 'individual', label: 'Individual' },
  { id: 'agency', label: 'Agency' },
  { id: 'company', label: 'Company' },
];

function createDefaultArea(id) {
  return {
    id: id || Date.now(),
    states: [], // [{ id, name }]
    cities: [], // [{ id, name, stateId }]
    pincodes: [], // string[]
    currentPincodeInput: '',
    selectedCategory: null, // { id, name }
    services: [], // [{ id, name, checked, rate, recurringRate, allowsRecurring, allowsSingleUse }]
    loadingServices: false,
  };
}

function AddVendor({ navigation }) {
  const dispatch = useDispatch();
  const createStatus = useSelector(state => state.stateAdminVendors?.createStatus);
  const submitting = createStatus === 'loading';

  // Section 1: Account
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Section 2: Business
  const [businessName, setBusinessName] = useState('');
  const [vendorType, setVendorType] = useState('individual');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [address, setAddress] = useState('');

  // Section 3: Tax & Legal
  const [panNumber, setPanNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');

  // Section 4: Banking
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [upiId, setUpiId] = useState('');

  // Section 5: Service Areas & Rates
  const [areas, setAreas] = useState([createDefaultArea(1)]);

  // Master Data & Geographic Scope
  const [availableStates, setAvailableStates] = useState([]);
  const [scopedCityIds, setScopedCityIds] = useState(null); // null = all cities allowed in state; number[] = restricted cities
  const [citiesByState, setCitiesByState] = useState({});
  const [categories, setCategories] = useState([]);
  const [loadingScope, setLoadingScope] = useState(true);

  // Modal Pickers
  const [pickerModal, setPickerModal] = useState(null); // { type: 'state' | 'city' | 'category', areaIndex }
  const [pickerSearch, setPickerSearch] = useState('');

  // Errors & Feedback
  const [fieldErrors, setFieldErrors] = useState({});
  const [errorDialog, setErrorDialog] = useState(null);
  const [successDialog, setSuccessDialog] = useState(null);

  // Load Geographic Region Scope and Categories on Mount
  useEffect(() => {
    let isMounted = true;

    async function initializeMasterData() {
      setLoadingScope(true);
      try {
        // GET /api/v1/admin/vendors/region-scope
        const scopeRes = await getVendorRegionScope().catch(() => null);
        if (isMounted && scopeRes && Array.isArray(scopeRes.states) && scopeRes.states.length > 0) {
          setAvailableStates(scopeRes.states);
          setScopedCityIds(scopeRes.cityIds || null);
        } else if (isMounted) {
          const fallbackStates = await getStates().catch(() => []);
          setAvailableStates(fallbackStates || []);
          setScopedCityIds(null);
        }
      } catch (e) {
        if (isMounted) {
          const fallbackStates = await getStates().catch(() => []);
          setAvailableStates(fallbackStates || []);
          setScopedCityIds(null);
        }
      } finally {
        if (isMounted) setLoadingScope(false);
      }

      getServiceCategories()
        .then(res => {
          if (isMounted) setCategories(res || []);
        })
        .catch(() => {});
    }

    initializeMasterData();
    return () => { isMounted = false; };
  }, []);

  const clearError = (field) => {
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  // Helper to load cities for a state with scope filtering
  const loadCitiesForState = async (stateId) => {
    if (citiesByState[stateId]) return citiesByState[stateId];
    try {
      const list = await getCities({ stateId });
      let filtered = list || [];
      if (Array.isArray(scopedCityIds) && scopedCityIds.length > 0) {
        filtered = filtered.filter(c => scopedCityIds.includes(Number(c.id)));
      }
      setCitiesByState(prev => ({ ...prev, [stateId]: filtered }));
      return filtered;
    } catch (e) {
      return [];
    }
  };

  // Area Management
  const addArea = () => {
    setAreas(prev => [...prev, createDefaultArea(Date.now())]);
  };

  const removeArea = (index) => {
    setAreas(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSelectAllForArea = async (areaIndex) => {
    const allStates = [...availableStates];
    const citiesAccum = [];
    for (const st of allStates) {
      const cts = await loadCitiesForState(st.id);
      cts.forEach(c => citiesAccum.push({ id: c.id, name: c.name, stateId: st.id }));
    }

    setAreas(prev => {
      const next = [...prev];
      next[areaIndex] = {
        ...next[areaIndex],
        states: allStates,
        cities: citiesAccum,
        pincodes: [],
      };
      return next;
    });
  };

  const toggleStateInArea = async (areaIndex, stateObj) => {
    const targetArea = areas[areaIndex];
    const exists = targetArea.states.some(s => s.id === stateObj.id);

    if (exists) {
      // Remove state and its cities
      setAreas(prev => {
        const next = [...prev];
        next[areaIndex] = {
          ...next[areaIndex],
          states: next[areaIndex].states.filter(s => s.id !== stateObj.id),
          cities: next[areaIndex].cities.filter(c => c.stateId !== stateObj.id),
        };
        return next;
      });
    } else {
      // Add state & preload cities
      loadCitiesForState(stateObj.id);
      setAreas(prev => {
        const next = [...prev];
        next[areaIndex] = {
          ...next[areaIndex],
          states: [...next[areaIndex].states, stateObj],
        };
        return next;
      });
    }
  };

  const toggleCityInArea = (areaIndex, cityObj) => {
    setAreas(prev => {
      const next = [...prev];
      const area = next[areaIndex];
      const exists = area.cities.some(c => c.id === cityObj.id);
      const newCities = exists
        ? area.cities.filter(c => c.id !== cityObj.id)
        : [...area.cities, cityObj];

      next[areaIndex] = {
        ...area,
        cities: newCities,
        // Reset pincodes if cities != 1
        pincodes: newCities.length === 1 ? area.pincodes : [],
      };
      return next;
    });
  };

  const addPincodeToArea = (areaIndex) => {
    const area = areas[areaIndex];
    const pin = (area.currentPincodeInput || '').trim();
    if (!pin) return;
    if (area.pincodes.includes(pin)) {
      setAreas(prev => {
        const next = [...prev];
        next[areaIndex] = { ...next[areaIndex], currentPincodeInput: '' };
        return next;
      });
      return;
    }

    setAreas(prev => {
      const next = [...prev];
      next[areaIndex] = {
        ...next[areaIndex],
        pincodes: [...next[areaIndex].pincodes, pin],
        currentPincodeInput: '',
      };
      return next;
    });
  };

  const removePincodeFromArea = (areaIndex, pin) => {
    setAreas(prev => {
      const next = [...prev];
      next[areaIndex] = {
        ...next[areaIndex],
        pincodes: next[areaIndex].pincodes.filter(p => p !== pin),
      };
      return next;
    });
  };

  const selectCategoryForArea = async (areaIndex, categoryObj) => {
    setAreas(prev => {
      const next = [...prev];
      next[areaIndex] = {
        ...next[areaIndex],
        selectedCategory: categoryObj,
        loadingServices: true,
        services: [],
      };
      return next;
    });

    try {
      const srvList = await getServices({ categoryId: categoryObj.id });
      setAreas(prev => {
        const next = [...prev];
        next[areaIndex] = {
          ...next[areaIndex],
          loadingServices: false,
          services: (srvList || []).map(s => ({
            id: s.id,
            name: s.name,
            allowsRecurring: !!s.allowsRecurring,
            allowsSingleUse: s.allowsSingleUse !== false,
            checked: false,
            rate: '',
            recurringRate: '',
          })),
        };
        return next;
      });
    } catch (e) {
      setAreas(prev => {
        const next = [...prev];
        next[areaIndex] = { ...next[areaIndex], loadingServices: false };
        return next;
      });
    }
  };

  const toggleServiceInArea = (areaIndex, serviceId) => {
    setAreas(prev => {
      const next = [...prev];
      const area = next[areaIndex];
      next[areaIndex] = {
        ...area,
        services: area.services.map(s => (s.id === serviceId ? { ...s, checked: !s.checked } : s)),
      };
      return next;
    });
  };

  const updateServiceRate = (areaIndex, serviceId, field, val) => {
    setAreas(prev => {
      const next = [...prev];
      const area = next[areaIndex];
      next[areaIndex] = {
        ...area,
        services: area.services.map(s => (s.id === serviceId ? { ...s, [field]: val } : s)),
      };
      return next;
    });
  };

  // Form Submission
  const handleSubmit = () => {
    const errors = {};
    if (!name.trim()) errors.name = 'Contact person name is required.';
    if (!email.trim()) errors.email = 'Login email is required.';
    if (!password) errors.password = 'Password is required.';
    if (password.length < 6) errors.password = 'Password must be at least 6 characters.';
    if (password !== passwordConfirmation) errors.password_confirmation = 'Passwords do not match.';
    if (!businessName.trim()) errors.business_name = 'Business name is required.';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    // Compile Rates from All Areas
    const flattenedRates = [];
    areas.forEach(area => {
      const areaPincodesStr = area.pincodes.join(', ');
      const checkedServices = area.services.filter(s => s.checked && (s.rate || s.recurringRate));

      area.states.forEach(st => {
        // Cities belonging to this state
        const stateCities = area.cities.filter(c => c.stateId === st.id);
        const cityList = stateCities.length > 0 ? stateCities : [{ id: 0 }];

        cityList.forEach(ct => {
          checkedServices.forEach(srv => {
            flattenedRates.push({
              state_id: Number(st.id),
              city_id: Number(ct.id || 0),
              pincodes: areaPincodesStr || undefined,
              service_id: Number(srv.id),
              rate: srv.rate ? Number(srv.rate) : 0,
              recurring_rate: srv.recurringRate ? Number(srv.recurringRate) : undefined,
            });
          });
        });
      });
    });

    const payload = {
      name: name.trim(),
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
      business_name: businessName.trim(),
      vendor_type: vendorType,
      contact_phone: contactPhone.trim() || undefined,
      contact_email: contactEmail.trim() || undefined,
      address: address.trim() || undefined,
      pan_number: panNumber.trim().toUpperCase() || undefined,
      gst_number: gstNumber.trim().toUpperCase() || undefined,
      aadhaar_number: aadhaarNumber.trim() || undefined,
      bank_name: bankName.trim() || undefined,
      bank_account_name: bankAccountName.trim() || undefined,
      bank_account_number: bankAccountNumber.trim() || undefined,
      bank_ifsc: bankIfsc.trim().toUpperCase() || undefined,
      upi_id: upiId.trim() || undefined,
      rates: flattenedRates.length > 0 ? flattenedRates : undefined,
    };

    dispatch(createStateAdminVendor(payload))
      .unwrap()
      .then((res) => {
        dispatch(fetchStateAdminVendors());
        setSuccessDialog({
          title: 'Vendor Created',
          message: res?.message || `Vendor ${businessName} has been created with ${flattenedRates.length} service rate areas.`,
        });
      })
      .catch((err) => {
        if (err?.errors) {
          setFieldErrors(err.errors);
        }
        setErrorDialog({
          title: 'Failed to Create Vendor',
          message: err?.message || 'Could not create vendor. Please verify fields and jurisdiction scope.',
        });
      });
  };

  // Available Cities for Area Picker
  const citiesAvailableForArea = useMemo(() => {
    if (!pickerModal || pickerModal.type !== 'city') return [];
    const area = areas[pickerModal.areaIndex];
    if (!area) return [];
    const all = [];
    area.states.forEach(st => {
      const list = citiesByState[st.id] || [];
      list.forEach(c => all.push({ ...c, stateName: st.name }));
    });
    return all;
  }, [pickerModal, areas, citiesByState]);

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />

      {/* Navy Header */}
      <View style={styles.header}>
        <View style={styles.decorCircleLg} pointerEvents="none" />
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Icon name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add New Vendor</Text>
          <View style={{ width: 40 }} />
        </View>
        <Text style={styles.headerSub}>Create vendor profile & configure service coverage areas</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Section 1: Account & Credentials */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="person" size={20} color="#20304C" />
              <Text style={styles.sectionTitle}>Login & Profile Account</Text>
            </View>

            <Text style={styles.label}>Contact Person Name *</Text>
            <View style={[styles.inputWrap, fieldErrors.name && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Full Name"
                placeholderTextColor="#94A3B8"
                value={name}
                onChangeText={(v) => { setName(v); clearError('name'); }}
              />
            </View>
            {!!fieldErrors.name && <Text style={styles.errorText}>{fieldErrors.name}</Text>}

            <Text style={styles.label}>Login Email Address *</Text>
            <View style={[styles.inputWrap, fieldErrors.email && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="vendor@company.com"
                placeholderTextColor="#94A3B8"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(v) => { setEmail(v); clearError('email'); }}
              />
            </View>
            {!!fieldErrors.email && <Text style={styles.errorText}>{fieldErrors.email}</Text>}

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Password *</Text>
                <View style={[styles.inputWrap, fieldErrors.password && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Min 6 chars"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearError('password'); }}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} style={{ padding: 6 }}>
                    <Icon name={showPassword ? 'visibility-off' : 'visibility'} size={18} color="#94A3B8" />
                  </TouchableOpacity>
                </View>
                {!!fieldErrors.password && <Text style={styles.errorText}>{fieldErrors.password}</Text>}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Confirm Password *</Text>
                <View style={[styles.inputWrap, fieldErrors.password_confirmation && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="Repeat"
                    placeholderTextColor="#94A3B8"
                    secureTextEntry={!showPassword}
                    value={passwordConfirmation}
                    onChangeText={(v) => { setPasswordConfirmation(v); clearError('password_confirmation'); }}
                  />
                </View>
                {!!fieldErrors.password_confirmation && (
                  <Text style={styles.errorText}>{fieldErrors.password_confirmation}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Section 2: Business Info */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="business" size={20} color="#20304C" />
              <Text style={styles.sectionTitle}>Business Details</Text>
            </View>

            <Text style={styles.label}>Business / Trade Name *</Text>
            <View style={[styles.inputWrap, fieldErrors.business_name && styles.inputError]}>
              <TextInput
                style={styles.input}
                placeholder="Business Name"
                placeholderTextColor="#94A3B8"
                value={businessName}
                onChangeText={(v) => { setBusinessName(v); clearError('business_name'); }}
              />
            </View>
            {!!fieldErrors.business_name && <Text style={styles.errorText}>{fieldErrors.business_name}</Text>}

            <Text style={styles.label}>Vendor Type</Text>
            <View style={styles.typeSelectorRow}>
              {VENDOR_TYPES.map(vt => (
                <TouchableOpacity
                  key={vt.id}
                  style={[styles.typeChip, vendorType === vt.id && styles.typeChipActive]}
                  onPress={() => setVendorType(vt.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.typeChipText, vendorType === vt.id && styles.typeChipTextActive]}>
                    {vt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Contact Phone</Text>
                <View style={[styles.inputWrap, fieldErrors.contact_phone && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="+91 9876543210"
                    placeholderTextColor="#94A3B8"
                    keyboardType="phone-pad"
                    value={contactPhone}
                    onChangeText={(v) => { setContactPhone(v); clearError('contact_phone'); }}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Contact Email</Text>
                <View style={[styles.inputWrap, fieldErrors.contact_email && styles.inputError]}>
                  <TextInput
                    style={styles.input}
                    placeholder="support@co.com"
                    placeholderTextColor="#94A3B8"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={contactEmail}
                    onChangeText={(v) => { setContactEmail(v); clearError('contact_email'); }}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Operating Address</Text>
            <View style={[styles.inputWrap, { height: 70, alignItems: 'flex-start' }]}>
              <TextInput
                style={[styles.input, { textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Street address, City, Pincode"
                placeholderTextColor="#94A3B8"
                multiline
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>

          {/* Section 3: Tax & Identification */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="badge" size={20} color="#20304C" />
              <Text style={styles.sectionTitle}>Tax & Legal Identification</Text>
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>PAN Number</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="ABCDE1234F"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    maxLength={10}
                    value={panNumber}
                    onChangeText={setPanNumber}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>GST Number</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="27AAAAA0000A1Z5"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    maxLength={15}
                    value={gstNumber}
                    onChangeText={setGstNumber}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Aadhaar Number</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="12-digit Aadhaar Number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                maxLength={12}
                value={aadhaarNumber}
                onChangeText={setAadhaarNumber}
              />
            </View>
          </View>

          {/* Section 4: Bank Account & Payouts */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeadingRow}>
              <Icon name="account-balance" size={20} color="#20304C" />
              <Text style={styles.sectionTitle}>Bank Account & Payouts</Text>
            </View>

            <Text style={styles.label}>Bank Name</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="e.g. HDFC Bank, ICICI Bank"
                placeholderTextColor="#94A3B8"
                value={bankName}
                onChangeText={setBankName}
              />
            </View>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Account Name</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="Account Name"
                    placeholderTextColor="#94A3B8"
                    value={bankAccountName}
                    onChangeText={setBankAccountName}
                  />
                </View>
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.label}>IFSC Code</Text>
                <View style={styles.inputWrap}>
                  <TextInput
                    style={styles.input}
                    placeholder="HDFC0001234"
                    placeholderTextColor="#94A3B8"
                    autoCapitalize="characters"
                    value={bankIfsc}
                    onChangeText={setBankIfsc}
                  />
                </View>
              </View>
            </View>

            <Text style={styles.label}>Account Number</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Bank Account Number"
                placeholderTextColor="#94A3B8"
                keyboardType="number-pad"
                value={bankAccountNumber}
                onChangeText={setBankAccountNumber}
              />
            </View>

            <Text style={styles.label}>UPI ID</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="business@upi"
                placeholderTextColor="#94A3B8"
                autoCapitalize="none"
                value={upiId}
                onChangeText={setUpiId}
              />
            </View>
          </View>

          {/* Section 5: Service Areas & Rates (Web Matching) */}
          <View style={styles.areaContainerCard}>
            <View style={styles.areaMainHeader}>
              <Text style={styles.areaMainTitle}>Service Areas & Rates</Text>
              <Text style={styles.areaMainDescription}>
                Add the areas (state + city) this vendor covers and their rate per service. Coverage and service categories shown elsewhere are derived from these rates.
              </Text>
            </View>

            {areas.map((area, areaIdx) => {
              const checkedCount = area.services.filter(s => s.checked).length;
              const hasExactlyOneCity = area.cities.length === 1;

              return (
                <View key={area.id || areaIdx} style={styles.areaBox}>
                  {/* Area Top Toolbar */}
                  <View style={styles.areaToolbar}>
                    <View style={styles.areaIndexBadge}>
                      <Text style={styles.areaIndexText}>{areaIdx + 1}</Text>
                    </View>

                    <TouchableOpacity
                      style={styles.selectAllBtn}
                      onPress={() => handleSelectAllForArea(areaIdx)}
                      activeOpacity={0.7}
                    >
                      <Icon name="public" size={16} color="#2563EB" />
                      <Text style={styles.selectAllText}>Select All</Text>
                    </TouchableOpacity>

                    <View style={{ flex: 1 }} />

                    <Text style={styles.areaCountsText}>
                      {area.cities.length} cities • {checkedCount} services
                    </Text>

                    {areas.length > 1 && (
                      <TouchableOpacity
                        style={styles.removeAreaBtn}
                        onPress={() => removeArea(areaIdx)}
                        activeOpacity={0.7}
                      >
                        <Icon name="delete-outline" size={16} color="#EF4444" />
                        <Text style={styles.removeAreaText}>Remove Area</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Geo Selector Columns */}
                  <View style={styles.geoColumnsRow}>
                    {/* STATES */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.columnHeader}>STATES</Text>
                      <TouchableOpacity
                        style={styles.selectDropdown}
                        onPress={() => setPickerModal({ type: 'state', areaIndex: areaIdx })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.selectPlaceholder} numberOfLines={1}>Add a state...</Text>
                        <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
                      </TouchableOpacity>

                      {/* State Chips */}
                      <View style={styles.chipsContainer}>
                        {area.states.length === 0 ? (
                          <Text style={styles.noChipsText}>No states yet</Text>
                        ) : (
                          area.states.map(st => (
                            <View key={st.id} style={styles.chipPill}>
                              <Text style={styles.chipPillText}>{st.name}</Text>
                              <TouchableOpacity onPress={() => toggleStateInArea(areaIdx, st)}>
                                <Icon name="close" size={14} color="#64748B" />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </View>
                    </View>

                    {/* CITIES */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.columnHeader}>CITIES</Text>
                      <TouchableOpacity
                        style={[styles.selectDropdown, area.states.length === 0 && styles.selectDisabled]}
                        disabled={area.states.length === 0}
                        onPress={() => setPickerModal({ type: 'city', areaIndex: areaIdx })}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.selectPlaceholder} numberOfLines={1}>
                          {area.states.length === 0 ? 'Select a state first...' : 'Add a city...'}
                        </Text>
                        <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
                      </TouchableOpacity>

                      {/* City Chips */}
                      <View style={styles.chipsContainer}>
                        {area.cities.length === 0 ? (
                          <Text style={styles.noChipsText}>No cities yet</Text>
                        ) : (
                          area.cities.map(ct => (
                            <View key={ct.id} style={styles.chipPill}>
                              <Text style={styles.chipPillText}>{ct.name}</Text>
                              <TouchableOpacity onPress={() => toggleCityInArea(areaIdx, ct)}>
                                <Icon name="close" size={14} color="#64748B" />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </View>
                    </View>

                    {/* PINCODES */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.columnHeader}>PINCODES (one city only)</Text>
                      <View style={[styles.pincodeInputRow, !hasExactlyOneCity && styles.selectDisabled]}>
                        <TextInput
                          style={styles.pincodeInput}
                          placeholder={hasExactlyOneCity ? 'Add pincode...' : 'One city only'}
                          placeholderTextColor="#94A3B8"
                          keyboardType="number-pad"
                          maxLength={6}
                          editable={hasExactlyOneCity}
                          value={area.currentPincodeInput}
                          onChangeText={(v) => {
                            setAreas(prev => {
                              const next = [...prev];
                              next[areaIdx] = { ...next[areaIdx], currentPincodeInput: v };
                              return next;
                            });
                          }}
                        />
                        <TouchableOpacity
                          disabled={!hasExactlyOneCity}
                          onPress={() => addPincodeToArea(areaIdx)}
                          style={{ padding: 4 }}
                        >
                          <Icon name="add-circle" size={22} color={hasExactlyOneCity ? '#2563EB' : '#CBD5E1'} />
                        </TouchableOpacity>
                      </View>

                      {/* Pincode Chips */}
                      <View style={styles.chipsContainer}>
                        {area.pincodes.length === 0 ? (
                          <Text style={styles.noChipsText}>All pincodes</Text>
                        ) : (
                          area.pincodes.map(p => (
                            <View key={p} style={[styles.chipPill, { backgroundColor: '#E0F2FE' }]}>
                              <Text style={[styles.chipPillText, { color: '#0369A1' }]}>{p}</Text>
                              <TouchableOpacity onPress={() => removePincodeFromArea(areaIdx, p)}>
                                <Icon name="close" size={14} color="#0369A1" />
                              </TouchableOpacity>
                            </View>
                          ))
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Category Selection */}
                  <View style={styles.categorySection}>
                    <TouchableOpacity
                      style={styles.categoryDropdown}
                      onPress={() => setPickerModal({ type: 'category', areaIndex: areaIdx })}
                      activeOpacity={0.8}
                    >
                      <Icon name="category" size={18} color="#A64416" />
                      <Text style={styles.categoryDropdownText} numberOfLines={1}>
                        {area.selectedCategory ? area.selectedCategory.name : 'Add a category...'}
                      </Text>
                      <Icon name="keyboard-arrow-down" size={20} color="#64748B" />
                    </TouchableOpacity>

                    {!area.selectedCategory && (
                      <View style={styles.categoryHintRow}>
                        <Icon name="arrow-back" size={15} color="#64748B" />
                        <Text style={styles.categoryHintText}>Choose a category to list its services.</Text>
                      </View>
                    )}
                  </View>

                  {/* Services List with Rates */}
                  {area.loadingServices ? (
                    <View style={styles.serviceLoadingWrap}>
                      <ActivityIndicator size="small" color="#A64416" />
                      <Text style={styles.serviceLoadingText}>Loading services...</Text>
                    </View>
                  ) : area.services.length > 0 ? (
                    <View style={styles.servicesContainer}>
                      <Text style={styles.servicesHeaderTitle}>
                        Select services & set rates for {area.selectedCategory?.name}:
                      </Text>

                      {area.services.map(service => (
                        <View key={service.id} style={styles.serviceRowItem}>
                          <TouchableOpacity
                            style={styles.serviceCheckboxRow}
                            onPress={() => toggleServiceInArea(areaIdx, service.id)}
                            activeOpacity={0.7}
                          >
                            <View style={[styles.customCheck, service.checked && styles.customCheckActive]}>
                              {service.checked && <Icon name="check" size={14} color="#FFFFFF" />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.serviceName}>{service.name}</Text>
                              <View style={styles.serviceTagsRow}>
                                {service.allowsSingleUse && (
                                  <View style={styles.tagBadge}>
                                    <Text style={styles.tagBadgeText}>One-time</Text>
                                  </View>
                                )}
                                {service.allowsRecurring && (
                                  <View style={[styles.tagBadge, { backgroundColor: '#ECFDF5' }]}>
                                    <Text style={[styles.tagBadgeText, { color: '#059669' }]}>Recurring</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>

                          {service.checked && (
                            <View style={styles.serviceRatesRow}>
                              <View style={styles.rateFieldWrap}>
                                <Text style={styles.rateFieldLabel}>One-time Rate (₹)</Text>
                                <TextInput
                                  style={styles.rateFieldInput}
                                  placeholder="e.g. 500"
                                  placeholderTextColor="#94A3B8"
                                  keyboardType="numeric"
                                  value={String(service.rate)}
                                  onChangeText={(v) => updateServiceRate(areaIdx, service.id, 'rate', v)}
                                />
                              </View>

                              {service.allowsRecurring && (
                                <View style={styles.rateFieldWrap}>
                                  <Text style={styles.rateFieldLabel}>Recurring Rate (₹)</Text>
                                  <TextInput
                                    style={styles.rateFieldInput}
                                    placeholder="e.g. 400"
                                    placeholderTextColor="#94A3B8"
                                    keyboardType="numeric"
                                    value={String(service.recurringRate)}
                                    onChangeText={(v) => updateServiceRate(areaIdx, service.id, 'recurringRate', v)}
                                  />
                                </View>
                              )}
                            </View>
                          )}
                        </View>
                      ))}
                    </View>
                  ) : null}
                </View>
              );
            })}

            {/* + Add Area Button */}
            <TouchableOpacity style={styles.addAreaBtn} onPress={addArea} activeOpacity={0.8}>
              <Icon name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addAreaBtnText}>Add Area</Text>
            </TouchableOpacity>

            {/* Explanatory Footnote */}
            <Text style={styles.areaFootnote}>
              Add one or more states and one or more cities to an area (or click "Select All" to add every state and city at once), then add a category to see its services — tick the ones you cover and enter your rate (₹) once. That rate applies to every state + city you've added to this area, so the ticked services become visible to customers everywhere you've added. Services offered both ways show a One-time and a Recurring rate. Pincode narrowing is only available when an area has exactly one city — leave it empty to cover the whole city.
            </Text>
          </View>

          {/* Submit Action */}
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
                <Text style={styles.submitBtnText}>Create Vendor</Text>
                <Icon name="check" size={20} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal Picker for State / City / Category Selection */}
      <Modal visible={!!pickerModal} transparent animationType="fade" onRequestClose={() => setPickerModal(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>
                {pickerModal?.type === 'state' ? 'Select State' : pickerModal?.type === 'city' ? 'Select City' : 'Select Category'}
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

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {pickerModal?.type === 'state' &&
                availableStates
                  .filter(st => st.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(st => {
                    const isSelected = areas[pickerModal.areaIndex]?.states.some(s => s.id === st.id);
                    return (
                      <TouchableOpacity
                        key={st.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                        onPress={() => {
                          toggleStateInArea(pickerModal.areaIndex, st);
                          setPickerModal(null);
                          setPickerSearch('');
                        }}
                      >
                        <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>
                          {st.name}
                        </Text>
                        {isSelected && <Icon name="check" size={18} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  })}

              {pickerModal?.type === 'city' &&
                citiesAvailableForArea
                  .filter(c => c.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(c => {
                    const isSelected = areas[pickerModal.areaIndex]?.cities.some(ct => ct.id === c.id);
                    return (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                        onPress={() => {
                          toggleCityInArea(pickerModal.areaIndex, c);
                          setPickerModal(null);
                          setPickerSearch('');
                        }}
                      >
                        <View>
                          <Text style={[styles.pickerItemText, isSelected && styles.pickerItemTextActive]}>{c.name}</Text>
                          <Text style={styles.pickerSubText}>{c.stateName}</Text>
                        </View>
                        {isSelected && <Icon name="check" size={18} color="#2563EB" />}
                      </TouchableOpacity>
                    );
                  })}

              {pickerModal?.type === 'category' &&
                categories
                  .filter(cat => cat.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                  .map(cat => (
                    <TouchableOpacity
                      key={cat.id}
                      style={styles.pickerItem}
                      onPress={() => {
                        selectCategoryForArea(pickerModal.areaIndex, cat);
                        setPickerModal(null);
                        setPickerSearch('');
                      }}
                    >
                      <Text style={styles.pickerItemText}>{cat.name}</Text>
                      <Icon name="chevron-right" size={18} color="#94A3B8" />
                    </TouchableOpacity>
                  ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Error Dialog Modal */}
      <Modal visible={!!errorDialog} transparent animationType="fade" onRequestClose={() => setErrorDialog(null)}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.errorIconWrap}>
              <Icon name="error-outline" size={32} color="#EF4444" />
            </View>
            <Text style={styles.dialogTitle}>{errorDialog?.title}</Text>
            <Text style={styles.dialogMsg}>{errorDialog?.message}</Text>
            <TouchableOpacity style={styles.dialogBtn} onPress={() => setErrorDialog(null)} activeOpacity={0.8}>
              <Text style={styles.dialogBtnText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success Dialog Modal */}
      <Modal visible={!!successDialog} transparent animationType="fade" onRequestClose={() => { setSuccessDialog(null); navigation.goBack(); }}>
        <View style={styles.dialogOverlay}>
          <View style={styles.dialogCard}>
            <View style={styles.successIconWrap}>
              <Icon name="check-circle" size={36} color="#10B981" />
            </View>
            <Text style={styles.dialogTitle}>{successDialog?.title}</Text>
            <Text style={styles.dialogMsg}>{successDialog?.message}</Text>
            <TouchableOpacity
              style={[styles.dialogBtn, { backgroundColor: '#10B981' }]}
              onPress={() => {
                setSuccessDialog(null);
                navigation.goBack();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.dialogBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#20304C' },

  header: {
    paddingTop: STATUS_BAR_HEIGHT + 8,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: '#20304C',
    overflow: 'hidden',
  },
  decorCircleLg: {
    position: 'absolute', top: -50, right: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  headerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', fontWeight: '700' },
  headerSub: { fontSize: 12, color: '#CBD5E1', marginLeft: 4 },

  body: {
    flex: 1, backgroundColor: '#FDFBF7',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
  },
  scrollContent: { paddingHorizontal: 16, paddingTop: 18, paddingBottom: 120, gap: 16 },

  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 10, elevation: 1,
  },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },

  label: { fontSize: 12, fontWeight: '600', color: '#334155', marginBottom: 6, marginTop: 10 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: 12,
    borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 12, height: 46,
  },
  input: { flex: 1, fontSize: 14, color: '#0F172A', padding: 0 },
  inputError: { borderColor: '#EF4444', backgroundColor: '#FEF2F2' },
  errorText: { fontSize: 11, color: '#EF4444', marginTop: 4, marginLeft: 4 },

  rowTwo: { flexDirection: 'row', gap: 10 },

  typeSelectorRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  typeChip: {
    flex: 1, paddingVertical: 10, borderRadius: 12,
    backgroundColor: '#F1F5F9', alignItems: 'center', borderWidth: 1, borderColor: '#E2E8F0',
  },
  typeChipActive: { backgroundColor: '#20304C', borderColor: '#20304C' },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#475569' },
  typeChipTextActive: { color: '#FFFFFF' },

  // Service Areas & Rates Card
  areaContainerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: '#E2E8F0',
  },
  areaMainHeader: { marginBottom: 16 },
  areaMainTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  areaMainDescription: { fontSize: 13, color: '#64748B', marginTop: 4, lineHeight: 18 },

  areaBox: {
    backgroundColor: '#F8FAFC', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16,
  },
  areaToolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  areaIndexBadge: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#EFF6FF', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#BFDBFE',
  },
  areaIndexText: { fontSize: 13, fontWeight: '700', color: '#1D4ED8' },
  selectAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#2563EB',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  selectAllText: { fontSize: 12, fontWeight: '700', color: '#2563EB' },
  areaCountsText: { fontSize: 11, color: '#64748B', fontWeight: '500' },
  removeAreaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderColor: '#EF4444', borderRadius: 16,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  removeAreaText: { fontSize: 11, fontWeight: '700', color: '#EF4444' },

  geoColumnsRow: { flexDirection: 'column', gap: 12, marginBottom: 14 },
  columnHeader: { fontSize: 11, fontWeight: '700', color: '#475569', letterSpacing: 0.5, marginBottom: 4 },
  selectDropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 10, height: 40,
  },
  selectDisabled: { opacity: 0.5, backgroundColor: '#F1F5F9' },
  selectPlaceholder: { fontSize: 13, color: '#64748B' },

  chipsContainer: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6,
    backgroundColor: '#FFFFFF', borderRadius: 10, padding: 8, minHeight: 36,
    borderWidth: 1, borderColor: '#F1F5F9',
  },
  noChipsText: { fontSize: 12, color: '#94A3B8', fontStyle: 'italic' },
  chipPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  chipPillText: { fontSize: 11, fontWeight: '600', color: '#334155' },

  pincodeInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 8, height: 40,
  },
  pincodeInput: { flex: 1, fontSize: 13, color: '#0F172A', padding: 0 },

  categorySection: { marginTop: 4, marginBottom: 12 },
  categoryDropdown: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#FFFFFF', borderRadius: 10, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 12, height: 44,
  },
  categoryDropdownText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#0F172A' },
  categoryHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, marginLeft: 4 },
  categoryHintText: { fontSize: 12, color: '#64748B' },

  serviceLoadingWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14 },
  serviceLoadingText: { fontSize: 13, color: '#64748B' },

  servicesContainer: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 12,
    borderWidth: 1, borderColor: '#E2E8F0', marginTop: 8,
  },
  servicesHeaderTitle: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 10 },
  serviceRowItem: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  serviceCheckboxRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  customCheck: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: '#94A3B8',
    justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', marginTop: 2,
  },
  customCheckActive: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  serviceName: { fontSize: 14, fontWeight: '600', color: '#0F172A' },
  serviceTagsRow: { flexDirection: 'row', gap: 6, marginTop: 4 },
  tagBadge: { backgroundColor: '#F1F5F9', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagBadgeText: { fontSize: 10, fontWeight: '600', color: '#475569' },

  serviceRatesRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginLeft: 30 },
  rateFieldWrap: { flex: 1 },
  rateFieldLabel: { fontSize: 11, fontWeight: '600', color: '#64748B', marginBottom: 4 },
  rateFieldInput: {
    backgroundColor: '#F8FAFC', borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1',
    paddingHorizontal: 8, height: 38, fontSize: 13, color: '#0F172A',
  },

  addAreaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: '#F97316', borderRadius: 12, paddingVertical: 12,
  },
  addAreaBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },

  areaFootnote: {
    fontSize: 12, color: '#64748B', lineHeight: 18, marginTop: 14,
  },

  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#A64416', height: 54, borderRadius: 27,
    marginTop: 8,
    shadowColor: '#A64416', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.65 },
  submitBtnText: { fontSize: 16, fontWeight: '700', color: '#FFFFFF' },

  // Picker Modal
  dialogOverlay: {
    flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20,
  },
  pickerModalCard: {
    width: '100%', maxWidth: 380, backgroundColor: '#FFFFFF',
    borderRadius: 20, padding: 20,
  },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pickerTitle: { fontSize: 17, fontWeight: '700', color: '#0F172A' },
  pickerSearchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#F8FAFC', borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0',
    paddingHorizontal: 10, height: 40, marginBottom: 12,
  },
  pickerSearchInput: { flex: 1, fontSize: 13, color: '#0F172A', padding: 0 },
  pickerItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  pickerItemActive: { backgroundColor: '#EFF6FF', borderRadius: 8, paddingHorizontal: 8 },
  pickerItemText: { fontSize: 14, color: '#1E293B', fontWeight: '500' },
  pickerItemTextActive: { color: '#2563EB', fontWeight: '700' },
  pickerSubText: { fontSize: 11, color: '#64748B', marginTop: 2 },

  dialogCard: {
    width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF',
    borderRadius: 22, padding: 24, alignItems: 'center',
  },
  errorIconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#FEF2F2',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  successIconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#ECFDF5',
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  dialogTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center', marginBottom: 8 },
  dialogMsg: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  dialogBtn: {
    width: '100%', height: 46, borderRadius: 23,
    backgroundColor: '#20304C', justifyContent: 'center', alignItems: 'center',
  },
  dialogBtnText: { fontSize: 14, fontWeight: '700', color: '#FFFFFF' },
});

export default AddVendor;
