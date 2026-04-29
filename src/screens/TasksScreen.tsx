import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ApprovalCard } from '../components/ApprovalCard';
import { SafeModeBanner } from '../components/SafeModeBanner';
import { useNenShell } from '../state/NenShellContext';
import { selectCompletedTasks, selectPendingTasks } from '../state/selectors';
import { colors, spacing, typography } from '../theme/tokens';

export function TasksScreen() {
  const { state, actions } = useNenShell();
  const pending = selectPendingTasks(state);
  const completed = selectCompletedTasks(state);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Tasks</Text>
        <Text style={styles.title}>Approval queue</Text>
        <Text style={styles.body}>Everything is mock-only. Risky sends and system movement are blocked while Safe Mode is on.</Text>
      </View>

      <SafeModeBanner enabled={state.permission.safeMode} />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending</Text>
        {pending.length === 0 ? <Text style={styles.empty}>No pending approvals. Send a Home message to create a suggested action.</Text> : null}
        {pending.map((task) => (
          <ApprovalCard key={task.id} task={task} onApprove={actions.approveTask} onReject={actions.rejectTask} />
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Completed, rejected, blocked</Text>
        {completed.length === 0 ? <Text style={styles.empty}>Decisions will settle here with audit evidence.</Text> : null}
        {completed.map((task) => (
          <ApprovalCard key={task.id} task={task} onApprove={actions.approveTask} onReject={actions.rejectTask} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    color: colors.amber,
    fontSize: typography.small,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontSize: typography.title,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  empty: {
    color: colors.textMuted,
    fontSize: typography.body,
    lineHeight: 22,
  },
});
