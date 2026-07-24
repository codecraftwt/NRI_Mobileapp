import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { typography } from '../../theme/typography';

const MOCK_TASKS = [
  { id: '1', time: '09:00 AM', title: 'Follow-up call — akanksha', type: 'Call', customer: 'akanksha', done: false, color: '#3B82F6', icon: 'call' },
  { id: '2', time: '11:30 AM', title: 'Home visit coordination', type: 'Visit', customer: 'Pradnya', done: false, color: '#8B5CF6', icon: 'home' },
  { id: '3', time: '02:00 PM', title: 'Renewal reminder — Test', type: 'Renewal', customer: 'Test', done: true, color: '#0EA5E9', icon: 'autorenew' },
  { id: '4', time: '04:30 PM', title: 'Review medical report', type: 'Review', customer: 'Rohit Mehta', done: false, color: '#16A34A', icon: 'fact-check' },
];

const WEEK = [
  { day: 'Mon', date: '21' },
  { day: 'Tue', date: '22' },
  { day: 'Wed', date: '23' },
  { day: 'Thu', date: '24', active: true },
  { day: 'Fri', date: '25' },
  { day: 'Sat', date: '26' },
  { day: 'Sun', date: '27' },
];

function Planner() {
  const [selected, setSelected] = useState('24');

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="#20304C" barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Planner</Text>
        <Text style={styles.headerSub}>Your schedule & tasks</Text>
      </View>

      {/* Week strip */}
      <View style={styles.weekStrip}>
        {WEEK.map(d => {
          const isActive = selected === d.date;
          return (
            <TouchableOpacity key={d.date} style={[styles.dayCol, isActive && styles.dayColActive]} onPress={() => setSelected(d.date)} activeOpacity={0.7}>
              <Text style={[styles.dayName, isActive && styles.dayTextActive]}>{d.day}</Text>
              <Text style={[styles.dayNum, isActive && styles.dayTextActive]}>{d.date}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Today's Tasks</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Icon name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>

        {MOCK_TASKS.map(task => (
          <View key={task.id} style={styles.taskCard}>
            <View style={styles.timeCol}>
              <Text style={styles.timeText}>{task.time.split(' ')[0]}</Text>
              <Text style={styles.ampm}>{task.time.split(' ')[1]}</Text>
            </View>
            <View style={[styles.timeline, { backgroundColor: task.color }]} />
            <View style={styles.taskBody}>
              <View style={styles.taskTopRow}>
                <View style={[styles.taskIconBg, { backgroundColor: task.color + '15' }]}>
                  <Icon name={task.icon} size={18} color={task.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.taskTitle, task.done && styles.taskDone]} numberOfLines={1}>{task.title}</Text>
                  <Text style={styles.taskMeta}>{task.type} · {task.customer}</Text>
                </View>
                <Icon name={task.done ? 'check-circle' : 'radio-button-unchecked'} size={22} color={task.done ? '#16A34A' : '#CBD5E1'} />
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FDFBF7' },
  header: { paddingHorizontal: 24, paddingTop: 60, paddingBottom: 16, backgroundColor: '#20304C' },
  headerTitle: { fontSize: 24, fontFamily: typography.h2.fontFamily, color: '#FFFFFF', letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: '#94A3B8', marginTop: 4 },

  weekStrip: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  dayCol: { alignItems: 'center', paddingVertical: 10, paddingHorizontal: 6, borderRadius: 16, width: 44 },
  dayColActive: { backgroundColor: '#D94625' },
  dayName: { fontSize: 12, color: '#94A3B8', marginBottom: 4 },
  dayNum: { fontSize: 16, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  dayTextActive: { color: '#FFFFFF' },

  scrollContent: { paddingHorizontal: 20, paddingBottom: 100, paddingTop: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: typography.sectionTitle.fontFamily, color: '#0F172A' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D94625', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  addBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

  taskCard: { flexDirection: 'row', marginBottom: 16 },
  timeCol: { width: 56, alignItems: 'flex-end', paddingRight: 8, paddingTop: 14 },
  timeText: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#334155' },
  ampm: { fontSize: 10, color: '#94A3B8' },
  timeline: { width: 3, borderRadius: 2, marginRight: 12 },
  taskBody: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#F1F5F9',
    shadowColor: '#64748B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  taskTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  taskIconBg: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  taskTitle: { fontSize: 14, fontFamily: typography.labelMedium.fontFamily, color: '#0F172A' },
  taskDone: { textDecorationLine: 'line-through', color: '#94A3B8' },
  taskMeta: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
});

export default Planner;
