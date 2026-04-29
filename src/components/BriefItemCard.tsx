import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BriefItem } from '../types/domain';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { FieldPill } from './FieldPill';

const actionLabels: Record<string, string> = {
  summarize: 'Summarize',
  draft_reply: 'Draft Reply',
  schedule_reminder: 'Remind Me',
  send_message: 'Queue Send',
  modify_file: 'Queue Change',
  delete_file: 'Queue Delete',
  system_change: 'Queue System Change',
  root_command: 'Locked Root',
};

const sourceLabel = (item: BriefItem) => {
  if (item.source_type === 'email') return 'Gmail';
  if (item.source_type === 'message') return 'Telegram';
  if (item.source_type === 'calendar') return 'Calendar';
  if (item.source_type === 'file') return 'File';
  return 'System';
};

export function BriefItemCard({ item }: { item: BriefItem }) {
  return (
    <View style={styles.item}>
      <View style={styles.topline}>
        <FieldPill source={sourceLabel(item)} />
        <Text style={styles.priority}>{item.priority}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.summary}>{item.summary}</Text>
      <View style={styles.actions}>
        {item.actions.map((action) => (
          <Text key={action} style={styles.action}>{actionLabels[action] ?? action}</Text>
        ))}
        <Text style={styles.action}>Ignore</Text>
        <Text style={styles.action}>Archive</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  topline: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priority: {
    color: colors.textMuted,
    fontSize: typography.micro,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontSize: typography.body,
    fontWeight: '800',
  },
  summary: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  action: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    color: colors.moss,
    fontSize: typography.micro,
    overflow: 'hidden',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
});
