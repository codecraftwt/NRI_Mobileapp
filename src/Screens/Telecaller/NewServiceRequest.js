import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Alert,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography, STATUS_BAR_HEIGHT } from '../../theme';
import { getTelecallerCustomers } from '../../Api/Telecaller/telecallerCustomersApi';
import { getServices } from '../../Api/catalogApi';
import { getStates, getCities, getTalukas } from '../../Api/geoApi';
import apiClient from '../../Api/client';
import {
  createTelecallerServiceRequest,
  getTelecallerServiceRequestPrice,
} from '../../Api/Telecaller/telecallerRequestsApi';

const URGENCY_OPTIONS = [
  { id: 'standard', label: 'Standard' },
  { id: 'express', label: 'Express' },
  { id: 'emergency', label: 'Emergency' },
];

function NewServiceRequest({ navigation }) {
  // 1. Request Details
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [urgency, setUrgency] = useState('standard');
  const [preferredDate, setPreferredDate] = useState('');
  const [vendorDeadline, setVendorDeadline] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null); // null means "Unassigned — assign later"

  // 2. Service Location
  const [selectedState, setSelectedState] = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedTaluka, setSelectedTaluka] = useState(null);
  const [address, setAddress] = useState('');

  // 3. Pricing
  const [customerPrice, setCustomerPrice] = useState('');
  const [vendorCost, setVendorCost] = useState('');
  const [expressSurcharge, setExpressSurcharge] = useState('0');

  // 4. Notes
  const [customerNotes, setCustomerNotes] = useState('');
  const [internalNotes, setInternalNotes] = useState('');

  // Dropdown lists
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [talukas, setTalukas] = useState([]);
  const [vendors, setVendors] = useState([]);

  // Modal selector state
  const [pickerType, setPickerType] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Date picker helper state
  const [customDateInput, setCustomDateInput] = useState('');
  const [customTimeInput, setCustomTimeInput] = useState('10:00');

  // Loading & Submission
  const [loadingInit, setLoadingInit] = useState(true);
  const [loadingPricing, setLoadingPricing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load initial dropdowns
  useEffect(() => {
    async function loadData() {
      try {
        setLoadingInit(true);
        const [custRes, servRes, stRes, vendRes] = await Promise.all([
          getTelecallerCustomers().catch(() => []),
          getServices().catch(() => []),
          getStates().catch(() => []),
          apiClient.get('/telecaller/vendors').then(r => r.data?.data || r.data || []).catch(async () => {
            return apiClient.get('/super-admin/vendors').then(r => r.data?.data || r.data || []).catch(() => []);
          }),
        ]);
        setCustomers(Array.isArray(custRes) ? custRes : []);
        setServices(Array.isArray(servRes) ? servRes : []);
        setStates(Array.isArray(stRes) ? stRes : []);
        setVendors(Array.isArray(vendRes) ? vendRes : []);
      } catch (err) {
        console.warn('Error loading form data:', err);
      } finally {
        setLoadingInit(false);
      }
    }
    loadData();
  }, []);

  // When State changes, fetch Cities
  useEffect(() => {
    if (selectedState?.id) {
      getCities({ stateId: selectedState.id })
        .then(res => setCities(res || []))
        .catch(() => setCities([]));
      setSelectedCity(null);
      setSelectedTaluka(null);
      setTalukas([]);
    } else {
      setCities([]);
      setSelectedCity(null);
      setSelectedTaluka(null);
      setTalukas([]);
    }
  }, [selectedState]);

  // When City changes, fetch Talukas
  useEffect(() => {
    if (selectedCity?.id) {
      getTalukas({ cityId: selectedCity.id })
        .then(res => setTalukas(res || []))
        .catch(() => setTalukas([]));
      setSelectedTaluka(null);
    } else {
      setTalukas([]);
      setSelectedTaluka(null);
    }
  }, [selectedCity]);

  // Auto-fetch pricing preview when service, city, or urgency changes
  const checkPricing = useCallback(async () => {
    if (!selectedService?.id || !selectedCity?.id) return;
    try {
      setLoadingPricing(true);
      const quote = await getTelecallerServiceRequestPrice({
        service_id: selectedService.id,
        city_id: selectedCity.id,
        urgency,
      });
      if (quote) {
        if (quote.customer_price != null && !customerPrice) {
          setCustomerPrice(String(quote.customer_price));
        }
        if (quote.vendor_cost != null && !vendorCost) {
          setVendorCost(String(quote.vendor_cost));
        }
        if (quote.express_surcharge != null) {
          setExpressSurcharge(String(quote.express_surcharge));
        }
      }
    } catch (err) {
      console.log('Price preview note:', err?.message);
    } finally {
      setLoadingPricing(false);
    }
  }, [selectedService, selectedCity, urgency, customerPrice, vendorCost]);

  useEffect(() => {
    checkPricing();
  }, [checkPricing]);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      Alert.alert('Validation Error', 'Please select a customer.');
      return;
    }
    if (!selectedService) {
      Alert.alert('Validation Error', 'Please select a service.');
      return;
    }
    if (!customerPrice || isNaN(Number(customerPrice))) {
      Alert.alert('Validation Error', 'Customer price (₹) is required.');
      return;
    }
    if (!vendorCost || isNaN(Number(vendorCost))) {
      Alert.alert('Validation Error', 'Vendor cost (₹) is required.');
      return;
    }

    try {
      setSubmitting(true);
      await createTelecallerServiceRequest({
        customer_id: selectedCustomer.id,
        service_id: selectedService.id,
        urgency,
        preferred_date: preferredDate.trim() || null,
        vendor_completion_deadline: vendorDeadline.trim() || null,
        vendor_id: selectedVendor?.id || null,
        state_id: selectedState?.id || null,
        city_id: selectedCity?.id || null,
        taluka_id: selectedTaluka?.id || null,
        address: address.trim(),
        customer_price: Number(customerPrice),
        vendor_cost: Number(vendorCost),
        express_surcharge: Number(expressSurcharge || 0),
        customer_notes: customerNotes.trim(),
        internal_notes: internalNotes.trim(),
      });

      Alert.alert('Success', 'Service request created successfully!', [
        {
          text: 'OK',
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (err) {
      Alert.alert('Creation Failed', err?.message || 'Could not create service request.');
    } finally {
      setSubmitting(false);
    }
  };

  const openPicker = (type) => {
    setPickerType(type);
    setSearchQuery('');
    if (type === 'preferredDate') {
      setCustomDateInput(preferredDate || new Date().toISOString().slice(0, 10));
    }
    if (type === 'vendorDeadline') {
      setCustomDateInput(vendorDeadline || new Date().toISOString().slice(0, 10));
    }
  };

  const getFilteredItems = () => {
    const q = searchQuery.toLowerCase();
    if (pickerType === 'customer') {
      return customers.filter(c => (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q));
    }
    if (pickerType === 'service') {
      return services.filter(s => (s.name || '').toLowerCase().includes(q));
    }
    if (pickerType === 'urgency') {
      return URGENCY_OPTIONS.filter(u => u.label.toLowerCase().includes(q));
    }
    if (pickerType === 'vendor') {
      const vendorList = vendors.map(v => ({
        id: v.id,
        name: v.business_name || v.name || v.ownerName || `Vendor #${v.id}`,
        phone: v.phone || v.contact_phone || '',
      }));
      return [{ id: 'unassigned', name: 'Unassigned — assign later' }, ...vendorList.filter(v => v.name.toLowerCase().includes(q))];
    }
    if (pickerType === 'state') {
      return states.filter(st => (st.name || '').toLowerCase().includes(q));
    }
    if (pickerType === 'city') {
      return cities.filter(ct => (ct.name || '').toLowerCase().includes(q));
    }
    if (pickerType === 'taluka') {
      return talukas.filter(tk => (tk.name || '').toLowerCase().includes(q));
    }
    return [];
  };

  const handleSelectItem = (item) => {
    if (pickerType === 'customer') setSelectedCustomer(item);
    if (pickerType === 'service') setSelectedService(item);
    if (pickerType === 'urgency') setUrgency(item.id);
    if (pickerType === 'vendor') {
      if (item.id === 'unassigned') setSelectedVendor(null);
      else setSelectedVendor(item);
    }
    if (pickerType === 'state') setSelectedState(item);
    if (pickerType === 'city') setSelectedCity(item);
    if (pickerType === 'taluka') setSelectedTaluka(item);
    setPickerType(null);
    setSearchQuery('');
  };

  const handleSaveDateTime = () => {
    const combined = customTimeInput ? `${customDateInput} ${customTimeInput}` : customDateInput;
    if (pickerType === 'preferredDate') {
      setPreferredDate(combined);
    } else if (pickerType === 'vendorDeadline') {
      setVendorDeadline(combined);
    }
    setPickerType(null);
  };

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#20304C" barStyle="light-content" translucent />

      {/* Header */}
      <View style={styles.blueHeader}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} activeOpacity={0.7}>
            <Icon name="arrow-back-ios" size={18} color="#FFFFFF" style={styles.backIcon} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>New Service Request</Text>
          <View style={styles.headerRightPlaceholder} />
        </View>
      </View>

      {loadingInit ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#A64416" />
          <Text style={styles.loadingText}>Loading form...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card 1: Request Details */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Request Details</Text>

            {/* Row 1: Customer & Service */}
            <View style={styles.rowTwoCols}>
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Customer <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => openPicker('customer')}
                  activeOpacity={0.7}
                >
                  <Text style={selectedCustomer ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {selectedCustomer ? `${selectedCustomer.name}` : 'Select customer...'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Service <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => openPicker('service')}
                  activeOpacity={0.7}
                >
                  <Text style={selectedService ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {selectedService ? selectedService.name : 'Select service...'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 2: Urgency & Preferred Date */}
            <View style={styles.rowTwoCols}>
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Urgency <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => openPicker('urgency')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownValText} numberOfLines={1}>
                    {URGENCY_OPTIONS.find(u => u.id === urgency)?.label || 'Standard'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Preferred Date <Text style={styles.requiredStar}>*</Text></Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => openPicker('preferredDate')}
                  activeOpacity={0.7}
                >
                  <Text style={preferredDate ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {preferredDate || 'dd-mm-yyyy'}
                  </Text>
                  <Icon name="calendar-today" size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Row 3: Vendor Completion Deadline */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Vendor Completion Deadline</Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => openPicker('vendorDeadline')}
                activeOpacity={0.7}
              >
                <Text style={vendorDeadline ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                  {vendorDeadline || 'dd-mm-yyyy'}
                </Text>
                <Icon name="calendar-today" size={16} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Row 4: Assign Vendor */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Assign Vendor <Text style={styles.optionalLabel}>(optional)</Text></Text>
              <TouchableOpacity
                style={styles.dropdownInput}
                onPress={() => openPicker('vendor')}
                activeOpacity={0.7}
              >
                <Text style={selectedVendor ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                  {selectedVendor ? selectedVendor.name : 'Unassigned — assign later'}
                </Text>
                <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
              </TouchableOpacity>
              <Text style={styles.helperText}>
                Not filtered by service/location yet — pick carefully, or leave unassigned and assign from the ticket page once created.
              </Text>
            </View>
          </View>

          {/* Card 2: Service Location */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Service Location</Text>

            {/* Row: State & City */}
            <View style={styles.rowTwoCols}>
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>State</Text>
                <TouchableOpacity
                  style={styles.dropdownInput}
                  onPress={() => openPicker('state')}
                  activeOpacity={0.7}
                >
                  <Text style={selectedState ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {selectedState ? selectedState.name : 'Select state...'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>City</Text>
                <TouchableOpacity
                  style={[styles.dropdownInput, !selectedState && styles.dropdownDisabled]}
                  onPress={() => selectedState && openPicker('city')}
                  disabled={!selectedState}
                  activeOpacity={0.7}
                >
                  <Text style={selectedCity ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                    {selectedCity ? selectedCity.name : 'Select city...'}
                  </Text>
                  <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Row: Taluka */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Taluka</Text>
              <TouchableOpacity
                style={[styles.dropdownInput, !selectedCity && styles.dropdownDisabled]}
                onPress={() => selectedCity && openPicker('taluka')}
                disabled={!selectedCity}
                activeOpacity={0.7}
              >
                <Text style={selectedTaluka ? styles.dropdownValText : styles.dropdownPlaceholder} numberOfLines={1}>
                  {selectedTaluka ? selectedTaluka.name : 'Select taluka...'}
                </Text>
                <Icon name="keyboard-arrow-down" size={20} color="#94A3B8" />
              </TouchableOpacity>
            </View>

            {/* Address Text Area */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Address</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Full address for the service..."
                placeholderTextColor="#94A3B8"
                value={address}
                onChangeText={setAddress}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Card 3: Pricing */}
          <View style={styles.formCard}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>Pricing</Text>
              {loadingPricing && (
                <View style={styles.quoteLoadingRow}>
                  <ActivityIndicator size="small" color="#EA580C" />
                  <Text style={styles.quoteLoadingText}>Fetching auto quote...</Text>
                </View>
              )}
            </View>

            {/* Row: Customer Price & Vendor Cost */}
            <View style={styles.rowTwoCols}>
              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Customer Price (₹) <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={customerPrice}
                  onChangeText={setCustomerPrice}
                />
              </View>

              <View style={styles.colHalf}>
                <Text style={styles.inputLabel}>Vendor Cost (₹) <Text style={styles.requiredStar}>*</Text></Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="0"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={vendorCost}
                  onChangeText={setVendorCost}
                />
              </View>
            </View>

            {/* Row: Express Surcharge */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Express Surcharge (₹)</Text>
              <TextInput
                style={styles.textInput}
                placeholder="0"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={expressSurcharge}
                onChangeText={setExpressSurcharge}
              />
            </View>
          </View>

          {/* Card 4: Notes */}
          <View style={styles.formCard}>
            <Text style={styles.cardTitle}>Notes</Text>

            {/* Customer Notes */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Customer Notes</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Customer notes..."
                placeholderTextColor="#94A3B8"
                value={customerNotes}
                onChangeText={setCustomerNotes}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Internal Notes */}
            <View style={styles.fullWidthField}>
              <Text style={styles.inputLabel}>Internal Notes</Text>
              <TextInput
                style={styles.textAreaInput}
                placeholder="Internal staff notes..."
                placeholderTextColor="#94A3B8"
                value={internalNotes}
                onChangeText={setInternalNotes}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          {/* Buttons: Create & Cancel */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.createBtn}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.createBtnText}>Create Service Request</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => navigation.goBack()}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* Selector Dropdown Modal */}
      <Modal
        visible={!!pickerType && pickerType !== 'preferredDate' && pickerType !== 'vendorDeadline'}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerType(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {pickerType ? pickerType.charAt(0).toUpperCase() + pickerType.slice(1) : ''}
              </Text>
              <TouchableOpacity onPress={() => setPickerType(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Search Input for items with many entries */}
            {pickerType !== 'urgency' && (
              <View style={styles.modalSearchBox}>
                <Icon name="search" size={18} color="#94A3B8" />
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder={`Search ${pickerType}...`}
                  placeholderTextColor="#94A3B8"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            )}

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {getFilteredItems().map((item, idx) => (
                <TouchableOpacity
                  key={String(item.id || idx)}
                  style={styles.modalItemRow}
                  onPress={() => handleSelectItem(item)}
                  activeOpacity={0.7}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalItemTitle}>{item.name || item.label}</Text>
                    {item.phone && <Text style={styles.modalItemSub}>{item.phone}</Text>}
                    {item.email && <Text style={styles.modalItemSub}>{item.email}</Text>}
                  </View>
                  <Icon name="chevron-right" size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))}

              {getFilteredItems().length === 0 && (
                <View style={styles.modalEmptyWrap}>
                  <Text style={styles.modalEmptyText}>No matching items found</Text>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Date & Time Picker Modal */}
      <Modal
        visible={pickerType === 'preferredDate' || pickerType === 'vendorDeadline'}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerType(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPickerType(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {pickerType === 'preferredDate' ? 'Set Preferred Date' : 'Set Completion Deadline'}
              </Text>
              <TouchableOpacity onPress={() => setPickerType(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={{ paddingVertical: 12, gap: 12 }}>
              <View>
                <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#94A3B8"
                  value={customDateInput}
                  onChangeText={setCustomDateInput}
                />
              </View>

              <View>
                <Text style={styles.inputLabel}>Time (HH:mm)</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="10:00"
                  placeholderTextColor="#94A3B8"
                  value={customTimeInput}
                  onChangeText={setCustomTimeInput}
                />
              </View>

              {/* Quick shortcut date chips */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => {
                    const today = new Date().toISOString().slice(0, 10);
                    setCustomDateInput(today);
                  }}
                >
                  <Text style={styles.quickDateChipText}>Today</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 1);
                    setCustomDateInput(d.toISOString().slice(0, 10));
                  }}
                >
                  <Text style={styles.quickDateChipText}>Tomorrow</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickDateChip}
                  onPress={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + 3);
                    setCustomDateInput(d.toISOString().slice(0, 10));
                  }}
                >
                  <Text style={styles.quickDateChipText}>In 3 Days</Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveDateTime}>
              <Text style={styles.modalSaveBtnText}>Set Date & Time</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FDFBF7',
  },

  blueHeader: {
    paddingTop: STATUS_BAR_HEIGHT,
    paddingHorizontal: 16,
    paddingBottom: 14,
    backgroundColor: '#20304C',
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    marginLeft: 6,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: typography.h3.fontFamily,
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  headerRightPlaceholder: {
    width: 36,
  },

  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 14,
    paddingBottom: 60,
    gap: 14,
  },

  centerLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: typography.body.fontFamily,
    color: '#64748B',
    marginTop: 10,
  },

  // Card Structure
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#64748B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
    gap: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: typography.h4.fontFamily,
    color: '#1E293B',
    marginBottom: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  quoteLoadingText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#EA580C',
  },

  // Layout Columns
  rowTwoCols: {
    flexDirection: 'row',
    gap: 10,
  },
  colHalf: {
    flex: 1,
  },
  fullWidthField: {
    width: '100%',
  },

  // Labels & Inputs
  inputLabel: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#475569',
    marginBottom: 5,
  },
  requiredStar: {
    color: '#DC2626',
  },
  optionalLabel: {
    fontSize: 10,
    fontFamily: typography.small.fontFamily,
    color: '#94A3B8',
  },
  helperText: {
    fontSize: 10.5,
    fontFamily: typography.small.fontFamily,
    color: '#64748B',
    marginTop: 5,
    lineHeight: 14,
  },

  dropdownInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  dropdownDisabled: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  dropdownValText: {
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
    color: '#1E293B',
    flex: 1,
    marginRight: 4,
  },
  dropdownPlaceholder: {
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
    color: '#94A3B8',
    flex: 1,
    marginRight: 4,
  },

  textInput: {
    height: 42,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
    color: '#1E293B',
  },
  textAreaInput: {
    height: 68,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
    color: '#1E293B',
    textAlignVertical: 'top',
  },

  // Action Buttons
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  createBtn: {
    flex: 1,
    backgroundColor: '#A64416',
    paddingVertical: 12,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#A64416',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  createBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 15,
    fontFamily: typography.h4.fontFamily,
    color: '#1E293B',
  },
  modalSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    marginVertical: 10,
    gap: 6,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
    color: '#1E293B',
    paddingVertical: 0,
  },
  modalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  modalItemTitle: {
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#1E293B',
  },
  modalItemSub: {
    fontSize: 11,
    fontFamily: typography.small.fontFamily,
    color: '#64748B',
    marginTop: 2,
  },
  modalEmptyWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  modalEmptyText: {
    fontSize: 12.5,
    fontFamily: typography.body.fontFamily,
    color: '#94A3B8',
  },
  quickDateChip: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  quickDateChipText: {
    fontSize: 11,
    fontFamily: typography.labelMedium.fontFamily,
    color: '#1E40AF',
  },
  modalSaveBtn: {
    backgroundColor: '#20304C',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 10,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: typography.labelMedium.fontFamily,
  },
});

export default NewServiceRequest;
