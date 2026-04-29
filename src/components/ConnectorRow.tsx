import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { ConnectorStatus } from '../types/domain';
import { formatTime } from '../utils/time';
import { FieldPill } from './FieldPill';
import { StatusPill } from './StatusPill';

export function ConnectorRow({ connector }: { connector: ConnectorStatus }) {
  return (
    <View style={styles.row}>
      <View style={styles.main}>
        <FieldPill source={connector.source} />
        <Text style={styles.detail}>{connector.detail}</Text>
        <Text style={styles.time}>Checked {formatTime(connector.lastCheckedAt)}</Text>
      </View>
      <StatusPill label={connector.state} tone="stone" />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-start',
    borderBottomColor: colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
  },
  main: {
    flex: 1,
    gap: spacing.sm,
  },
  detail: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 18,
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.micro,
  },
});
