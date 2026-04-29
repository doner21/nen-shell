import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export function MetricTile({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.detail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.slate,
    borderColor: colors.line,
    borderRadius: radius.md,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: spacing.md,
  },
  value: {
    color: colors.ivory,
    fontSize: typography.title,
    fontWeight: '700',
  },
  label: {
    color: colors.textSecondary,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
  detail: {
    color: colors.textMuted,
    fontSize: typography.micro,
    marginTop: spacing.xs,
  },
});
