import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { describeRisk } from '../permissions/safetyPolicy';
import { colors, radius, spacing, touch, typography } from '../theme/tokens';
import { ApprovalTask } from '../types/domain';
import { CalmCard } from './CalmCard';
import { FieldPill } from './FieldPill';
import { StatusPill } from './StatusPill';

export function ApprovalCard({ task, onApprove, onReject, onDisableSafeMode }: { task: ApprovalTask; onApprove(task: ApprovalTask): void; onReject(task: ApprovalTask): void; onDisableSafeMode?: () => void }) {
  const pending = task.status === 'pending';
  const tone = task.status === 'blocked' ? 'amber' : task.status === 'pending' ? 'stone' : 'moss';

  return (
    <CalmCard style={styles.card}>
      <View style={styles.header}>
        <FieldPill source={task.action.source} />
        <StatusPill label={task.status} tone={tone} />
      </View>
      <Text style={styles.title}>{task.action.title}</Text>
      <Text style={styles.body}>{task.action.description}</Text>
      <Text style={styles.risk}>{describeRisk(task.action.risk)}</Text>
      {task.decisionReason ? <Text style={styles.reason}>{task.decisionReason}</Text> : null}
      {task.status === 'blocked' && onDisableSafeMode ? (
        <View style={styles.blockedActions}>
          <Text style={styles.blockedHint}>
            Safe Mode is blocking this approval. Disable it to proceed.
          </Text>
          <TouchableOpacity
            style={styles.disableSafeMode}
            onPress={() => {
              Alert.alert(
                'Disable Safe Mode?',
                'Outbound sends, file changes, and system changes will become possible. Root commands remain locked regardless. Audit entries will still be recorded for every action.',
                [
                  { text: 'Keep On', style: 'cancel' },
                  { text: 'Disable', style: 'destructive', onPress: onDisableSafeMode },
                ],
              );
            }}
            accessibilityRole="button"
          >
            <Text style={styles.disableSafeModeText}>Disable Safe Mode to approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {pending ? (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.reject} onPress={() => onReject(task)} accessibilityRole="button">
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.approve} onPress={() => onApprove(task)} accessibilityRole="button">
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </CalmCard>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  risk: {
    color: colors.amber,
    fontSize: typography.small,
  },
  reason: {
    color: colors.textMuted,
    fontSize: typography.small,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  reject: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: touch.min,
  },
  rejectText: {
    color: colors.textSecondary,
    fontWeight: '700',
  },
  approve: {
    alignItems: 'center',
    backgroundColor: colors.amber,
    borderRadius: radius.xl,
    flex: 1,
    justifyContent: 'center',
    minHeight: touch.min,
  },
  approveText: {
    color: colors.ink,
    fontWeight: '800',
  },
  blockedActions: {
    borderTopColor: colors.line,
    borderTopWidth: 1,
    gap: spacing.sm,
    paddingTop: spacing.md,
  },
  blockedHint: {
    color: colors.amber,
    fontSize: typography.small,
    lineHeight: 18,
  },
  disableSafeMode: {
    alignItems: 'center',
    borderColor: colors.amber,
    borderRadius: radius.xl,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touch.min,
  },
  disableSafeModeText: {
    color: colors.amber,
    fontWeight: '800',
  },
});
