import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../theme/typography';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// Fixed, pixel-based cell size instead of aspectRatio. aspectRatio derives
// height from width but doesn't hard-clamp it — when the selected/today day
// swaps to a bold fontFamily, that font's native line-height differs just
// enough to grow that one cell, which shifts every row below it in the
// flexWrap grid. Locking width AND height up front removes any possibility
// of a cell's size depending on its text content.
const GRID_HORIZONTAL_PADDING = 20; // must match calendarWrap's paddingHorizontal below
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CELL_SIZE = Math.floor((SCREEN_WIDTH - GRID_HORIZONTAL_PADDING * 2) / 7);

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfDay(d) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}
// When disablePastDates is set, today becomes the effective floor unless an
// explicit minimumDate is already later than today (in which case that
// stricter caller-supplied date wins).
function getEffectiveMinDate(minimumDate, disablePastDates) {
  if (!disablePastDates) return minimumDate;
  const today = startOfDay(new Date());
  if (minimumDate && startOfDay(minimumDate) > today) return minimumDate;
  return today;
}
function dayAllowed(day, minimumDate, maximumDate) {
  if (minimumDate && startOfDay(day) < startOfDay(minimumDate)) return false;
  if (maximumDate && startOfDay(day) > startOfDay(maximumDate)) return false;
  return true;
}
function clampDate(date, minimumDate, maximumDate) {
  if (minimumDate && startOfDay(date) < startOfDay(minimumDate)) return minimumDate;
  if (maximumDate && startOfDay(date) > startOfDay(maximumDate)) return maximumDate;
  return date;
}
function buildMonthGrid(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const startWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}
function pad2(n) {
  return String(n).padStart(2, '0');
}

// Fully custom date/time picker (calendar grid + time steppers) — deliberately
// avoids @react-native-community/datetimepicker's native modal entirely. That
// native picker behaves differently per platform (iOS's spinner fires
// onChange continuously as the user scrolls, with no "confirm" moment, while
// Android's is a single-shot dialog needing date→time chaining), which kept
// producing platform-specific bugs (see SubmitRequest.js git history). This
// component renders identical JS on both platforms, so there's nothing
// platform-specific left to break.
//
// mode: 'date' | 'time' | 'datetime'. `value` is the controlled Date (or
// null); `initialDate` seeds the calendar/time when `value` is null (e.g. a
// DOB field opening at 1990 instead of today). `onConfirm(date)` fires on
// Done with a plain JS Date; `onCancel()` fires on Cancel/backdrop tap/back
// button — the caller's state is left untouched either way.
// `inline`: render as a plain overlay View instead of wrapping in its own
// native <Modal> — for screens (e.g. Planner.js) that already keep everything
// inside one Modal because mounting a second native Modal on top of an open
// one previously left the whole flow unresponsive. The caller is responsible
// for gating rendering on `visible` in that case, same as its other overlays.
export default function CustomDateTimePicker({
  visible, mode = 'date', value, minimumDate, maximumDate, initialDate, title, onConfirm, onCancel, inline = false,
  disablePastDates = false,
}) {
  const [draft, setDraft] = useState(() => value || initialDate || new Date());
  const [viewDate, setViewDate] = useState(() => value || initialDate || new Date());

  const effectiveMinDate = getEffectiveMinDate(minimumDate, disablePastDates);

  useEffect(() => {
    if (visible) {
      const seed = clampDate(value || initialDate || new Date(), effectiveMinDate, maximumDate);
      setDraft(seed);
      setViewDate(seed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const showDate = mode !== 'time';
  const showTime = mode !== 'date';

  const changeMonth = (delta) => setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

  const canGoPrevMonth = !effectiveMinDate
    || viewDate.getFullYear() > effectiveMinDate.getFullYear()
    || (viewDate.getFullYear() === effectiveMinDate.getFullYear() && viewDate.getMonth() > effectiveMinDate.getMonth());
  const canGoNextMonth = !maximumDate
    || viewDate.getFullYear() < maximumDate.getFullYear()
    || (viewDate.getFullYear() === maximumDate.getFullYear() && viewDate.getMonth() < maximumDate.getMonth());

  const selectDay = (day) => {
    const next = new Date(draft);
    next.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
    setDraft(next);
    if (!showTime) onConfirm(next);
  };

  const adjustHour = (delta) => {
    const next = new Date(draft);
    next.setHours((next.getHours() + delta + 24) % 24);
    setDraft(next);
  };
  const adjustMinute = (delta) => {
    const next = new Date(draft);
    next.setMinutes((next.getMinutes() + delta + 60) % 60);
    setDraft(next);
  };
  const toggleAmPm = () => {
    const next = new Date(draft);
    next.setHours((next.getHours() + 12) % 24);
    setDraft(next);
  };

  const hour12 = ((draft.getHours() + 11) % 12) + 1;
  const isPM = draft.getHours() >= 12;
  const grid = showDate ? buildMonthGrid(viewDate) : [];
  const defaultTitle = showDate && showTime ? 'Select Date & Time' : showTime ? 'Select Time' : 'Select Date';

  if (inline && !visible) return null;

  const content = (
      <TouchableOpacity style={[styles.overlay, inline && styles.overlayInline]} activeOpacity={1} onPress={onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.headerCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle} numberOfLines={1}>{title || defaultTitle}</Text>
            <TouchableOpacity onPress={() => onConfirm(draft)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.headerDone}>Done</Text>
            </TouchableOpacity>
          </View>

          {showDate && (
            <View style={styles.calendarWrap}>
              <View style={styles.monthRow}>
                <TouchableOpacity onPress={() => changeMonth(-1)} disabled={!canGoPrevMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="chevron-left" size={22} color={canGoPrevMonth ? '#20304C' : '#CBD5E1'} />
                </TouchableOpacity>
                <Text style={styles.monthLabel}>{MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
                <TouchableOpacity onPress={() => changeMonth(1)} disabled={!canGoNextMonth} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Icon name="chevron-right" size={22} color={canGoNextMonth ? '#20304C' : '#CBD5E1'} />
                </TouchableOpacity>
              </View>
              <View style={styles.weekRow}>
                {WEEKDAYS.map((w, i) => <Text key={i} style={styles.weekDayText}>{w}</Text>)}
              </View>
              <View style={styles.daysGrid}>
                {grid.map((day, idx) => {
                  if (!day) return <View key={idx} style={styles.dayCell} />;
                  const disabled = !dayAllowed(day, effectiveMinDate, maximumDate);
                  const selected = sameDay(day, draft);
                  const today = sameDay(day, new Date());
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[styles.dayCell, selected && styles.dayCellSelected]}
                      disabled={disabled}
                      onPress={() => selectDay(day)}
                    >
                      <Text style={[
                        styles.dayText,
                        disabled && styles.dayTextDisabled,
                        selected && styles.dayTextSelected,
                        today && !selected && styles.dayTextToday,
                      ]}
                      >
                        {day.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {showTime && (
            <View style={styles.timeWrap}>
              {showDate && <View style={styles.divider} />}
              <View style={styles.timeRow}>
                <View style={styles.timeStepper}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustHour(1)}>
                    <Icon name="keyboard-arrow-up" size={22} color="#20304C" />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{pad2(hour12)}</Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustHour(-1)}>
                    <Icon name="keyboard-arrow-down" size={22} color="#20304C" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.timeColon}>:</Text>
                <View style={styles.timeStepper}>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustMinute(5)}>
                    <Icon name="keyboard-arrow-up" size={22} color="#20304C" />
                  </TouchableOpacity>
                  <Text style={styles.timeValue}>{pad2(draft.getMinutes())}</Text>
                  <TouchableOpacity style={styles.stepperBtn} onPress={() => adjustMinute(-5)}>
                    <Icon name="keyboard-arrow-down" size={22} color="#20304C" />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.ampmToggle} onPress={toggleAmPm}>
                  <Text style={styles.ampmText}>{isPM ? 'PM' : 'AM'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
  );

  if (inline) return content;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      {content}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'flex-end' },
  overlayInline: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 28 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  headerCancel: { fontSize: 14, color: '#64748B', fontFamily: typography.h4.fontFamily },
  headerTitle: { flex: 1, fontSize: 15, fontFamily: typography.h2.fontFamily, color: '#0F172A', textAlign: 'center', marginHorizontal: 8 },
  headerDone: { fontSize: 14, color: '#D94625', fontFamily: typography.h4.fontFamily },

  // Reduced from paddingTop: 16 and marginBottom: 12 to tighten the gap
  // above/below the month row.
  calendarWrap: { paddingHorizontal: GRID_HORIZONTAL_PADDING, paddingTop: 12, paddingBottom: 4 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  monthLabel: { fontSize: 15, fontFamily: typography.h4.fontFamily, color: '#0F172A' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDayText: { flex: 1, textAlign: 'center', fontSize: 12, color: '#94A3B8', fontFamily: typography.labelMedium.fontFamily },
  daysGrid: { flexDirection: 'row', flexWrap: 'wrap' },

  // width/height are now fixed pixel values (CELL_SIZE), not aspectRatio —
  // this is the actual fix for rows shifting on selection. borderRadius on
  // dayCellSelected still renders a full circle since it's applied to an
  // already-square box.
  dayCell: { width: CELL_SIZE, height: CELL_SIZE, justifyContent: 'center', alignItems: 'center', borderRadius: CELL_SIZE / 2 },
  dayCellSelected: { backgroundColor: '#D94625' },
  // lineHeight is now explicit and shared by every state (default/disabled/
  // selected/today) so swapping fontFamily can never change this Text's
  // intrinsic height again.
  dayText: { fontSize: 13.5, lineHeight: 18, color: '#1E293B', textAlign: 'center' },
  dayTextDisabled: { color: '#CBD5E1' },
  dayTextSelected: { color: '#FFFFFF', fontFamily: typography.h4.fontFamily },
  dayTextToday: { color: '#D94625', fontFamily: typography.h4.fontFamily },

  // paddingTop and divider marginBottom both reduced (16 -> 8/10) to close
  // the gap between the calendar and the time steppers.
  timeWrap: { paddingHorizontal: 20, paddingTop: 8 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 10 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  timeStepper: { alignItems: 'center' },
  stepperBtn: { padding: 6 },
  timeValue: { fontSize: 28, fontFamily: typography.h2.fontFamily, color: '#0F172A', minWidth: 48, textAlign: 'center' },
  timeColon: { fontSize: 28, fontFamily: typography.h2.fontFamily, color: '#0F172A' },
  ampmToggle: { marginLeft: 10, backgroundColor: '#EEF2FB', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10 },
  ampmText: { fontSize: 14, fontFamily: typography.h4.fontFamily, color: '#20304C' },
});
