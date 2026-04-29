import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { AuditEntry } from '../types/domain';
import { formatShortDateTime } from '../utils/time';
import { FieldPill } from './FieldPill';

export function AuditTimeline({ entries }: { entries: AuditEntry[] }) {
  return (
    <View style={styles.wrap}>
      {entries.map((entry) => (
        <View key={entry.id} style={styles.item}>
          <View style={styles.rail} />
          <View style={styles.content}>
            <View style={styles.row}>
              <FieldPill source={entry.source} />
              <Text style={styles.time}>{formatShortDateTime(entry.createdAt)}</Text>
            </View>
            <Text style={styles.title}>{entry.title}</Text>
            <Text style={styles.detail}>{entry.detail}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.lg,
  },
  item: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  rail: {
    backgroundColor: colors.line,
    borderRadius: 99,
    width: 2,
  },
  content: {
    flex: 1,
    gap: spacing.sm,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: {
    color: colors.textMuted,
    fontSize: typography.micro,
  },
  title: {
    color: colors.ivory,
    fontSize: typography.body,
    fontWeight: '700',
  },
  detail: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 18,
  },
});
