import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

function StepIndicator({ steps, currentStep }) {
  return (
    <View style={styles.row}>
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const completed = stepNum < currentStep;
        const active = stepNum === currentStep;
        return (
          <React.Fragment key={label}>
            <View style={styles.stepCol}>
              <View style={[styles.circle, completed && styles.circleCompleted, active && styles.circleActive]}>
                {completed ? (
                  <Icon name="check" size={14} color="white" />
                ) : (
                  <Text style={[styles.circleText, active && styles.circleTextActive]}>{stepNum}</Text>
                )}
              </View>
              <Text style={[styles.label, (active || completed) && styles.labelActive]} numberOfLines={1}>{label}</Text>
            </View>
            {stepNum < steps.length && (
              <View style={[styles.line, stepNum < currentStep && styles.lineCompleted]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 12, paddingVertical: 16 },
  stepCol: { alignItems: 'center', width: 44 },
  circle: { width: 26, height: 26, borderRadius: 13, borderWidth: 1.5, borderColor: '#CBD5E1', backgroundColor: 'white', alignItems: 'center', justifyContent: 'center' },
  circleCompleted: { backgroundColor: '#10B981', borderColor: '#10B981' },
  circleActive: { backgroundColor: '#FF7C1A', borderColor: '#FF7C1A' },
  circleText: { fontSize: 11, fontWeight: 'bold', color: '#94A3B8' },
  circleTextActive: { color: 'white' },
  label: { fontSize: 8.5, color: '#94A3B8', marginTop: 4, textAlign: 'center', fontWeight: '600' },
  labelActive: { color: '#1E293B' },
  line: { flex: 1, height: 1.5, backgroundColor: '#E2E8F0', marginTop: 13 },
  lineCompleted: { backgroundColor: '#10B981' },
});

export default StepIndicator;
