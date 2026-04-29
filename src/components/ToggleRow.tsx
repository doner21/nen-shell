import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';

export function ToggleRow({ label, detail, value, onValueChange }: { label: string; detail: string; value: boolean; onValueChange(): void }) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.detail}>{detail}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.line, true: colors.mossDim }}
        thumbColor={value ? colors.moss : colors.stone}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  label: {
    color: colors.ivory,
    fontSize: typography.body,
    fontWeight: '700',
  },
  detail: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 18,
  },
});
