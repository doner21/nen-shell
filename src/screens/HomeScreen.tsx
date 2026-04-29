import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { AgentInput } from '../components/AgentInput';
import { CalmCard } from '../components/CalmCard';
import { FieldPill } from '../components/FieldPill';
import { MetricTile } from '../components/MetricTile';
import { SafeModeBanner } from '../components/SafeModeBanner';
import { StatusPill } from '../components/StatusPill';
import { useNenShell } from '../state/NenShellContext';
import { selectLatestPendingAction } from '../state/selectors';
import { colors, spacing, typography } from '../theme/tokens';

export function HomeScreen() {
  const { state, actions } = useNenShell();
  const latestPending = selectLatestPendingAction(state);

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <StatusPill label="quiet cockpit" />
        <Text style={styles.eyebrow}>Good day</Text>
        <Text style={styles.title}>Nen Shell is observing before acting.</Text>
        <Text style={styles.summary}>{state.todaySummary}</Text>
      </View>

      <SafeModeBanner enabled={state.permission.safeMode} />

      <View style={styles.metrics}>
        <MetricTile label="Approvals" value={state.attentionCounts.approvals} detail="waiting calmly" />
        <MetricTile label="Calendar" value={state.attentionCounts.calendar} detail="shape change" />
        <MetricTile label="Messages" value={state.attentionCounts.messages} detail="digest only" />
      </View>

      <CalmCard>
        <Text style={styles.cardTitle}>Schedule contour</Text>
        <Text style={styles.cardBody}>{state.scheduleSummary}</Text>
      </CalmCard>

      <CalmCard style={styles.stack}>
        <Text style={styles.cardTitle}>Priorities</Text>
        {state.priorities.map((priority) => (
          <View key={priority.id} style={styles.priority}>
            <FieldPill source={priority.source} />
            <Text style={styles.priorityTitle}>{priority.title}</Text>
            <Text style={styles.cardBody}>{priority.detail}</Text>
          </View>
        ))}
      </CalmCard>

      <CalmCard style={styles.stack}>
        <Text style={styles.cardTitle}>Ask Pi Code through the mock bridge</Text>
        <AgentInput loading={state.agentLoading} onSend={actions.sendMessage} />
        {state.agentError ? <Text style={styles.error}>{state.agentError}</Text> : null}
      </CalmCard>

      {state.latestReply ? (
        <CalmCard style={styles.stack}>
          <Text style={styles.cardTitle}>Latest mock reply</Text>
          <Text style={styles.cardBody}>{state.latestReply.text}</Text>
          <Text style={styles.muted}>{state.latestReply.summary}</Text>
        </CalmCard>
      ) : null}

      {latestPending ? (
        <CalmCard style={styles.stack}>
          <Text style={styles.cardTitle}>Suggested next action</Text>
          <FieldPill source={latestPending.action.source} />
          <Text style={styles.priorityTitle}>{latestPending.action.title}</Text>
          <Text style={styles.cardBody}>Queued in Tasks for approval or rejection. No action has been taken.</Text>
        </CalmCard>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  hero: {
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
    fontSize: typography.hero,
    fontWeight: '800',
    letterSpacing: -0.8,
    lineHeight: 39,
  },
  summary: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 23,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  cardBody: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  stack: {
    gap: spacing.md,
  },
  priority: {
    gap: spacing.sm,
  },
  priorityTitle: {
    color: colors.ivory,
    fontSize: typography.body,
    fontWeight: '700',
  },
  muted: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  error: {
    color: colors.amber,
    fontSize: typography.small,
  },
});
