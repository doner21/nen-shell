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
import { colors, radius, spacing, typography } from '../theme/tokens';

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

      <SafeModeBanner enabled={state.permission.safeMode} onToggle={actions.toggleSafeMode} />

      <View style={styles.metrics}>
        <MetricTile label="Messages" value={state.attentionCounts.messages} detail="need attention" />
        <MetricTile label="Emails" value={state.attentionCounts.emails} detail="important" />
        <MetricTile label="Calendar" value={state.attentionCounts.calendar} detail="events today" />
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
        <Text style={styles.cardTitle}>Ask Pi Code</Text>
        <AgentInput loading={state.agentLoading} onSend={actions.sendMessage} />
        {state.agentError ? <Text style={styles.error}>{state.agentError}</Text> : null}
      </CalmCard>

      {state.messages.length > 0 ? (
        <View style={styles.conversation}>
          <Text style={styles.sectionTitle}>Conversation</Text>
          {state.messages.map((msg) => (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
              ]}
            >
              <Text style={styles.messageRole}>
                {msg.role === 'user' ? 'You' : 'Pi Code'}
              </Text>
              <Text
                style={[
                  styles.messageText,
                  msg.role === 'user' ? styles.userText : styles.assistantText,
                ]}
                selectable={msg.role === 'assistant'}
              >
                {msg.text}
              </Text>
            </View>
          ))}
        </View>
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
  conversation: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '800',
    marginBottom: spacing.xs,
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: radius.md,
    maxWidth: '90%',
    gap: spacing.xs,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.lifted,
    borderWidth: 1,
    borderColor: colors.line,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: colors.graphite,
    borderWidth: 1,
    borderColor: colors.mossDim,
  },
  messageRole: {
    color: colors.moss,
    fontSize: typography.micro,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  messageText: {
    fontSize: typography.body,
    lineHeight: 22,
  },
  userText: {
    color: colors.ivory,
  },
  assistantText: {
    color: colors.textSecondary,
  },
  error: {
    color: colors.amber,
    fontSize: typography.small,
  },
});
