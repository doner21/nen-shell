import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AuditTimeline } from '../components/AuditTimeline';
import { CalmCard } from '../components/CalmCard';
import { ConnectorRow } from '../components/ConnectorRow';
import { LockedActuatorCard } from '../components/LockedActuatorCard';
import { SchedulerPanel } from '../components/SchedulerPanel';
import { StatusPill } from '../components/StatusPill';
import { ToggleRow } from '../components/ToggleRow';
import { useNenShell } from '../state/NenShellContext';
import { selectRecentAudit } from '../state/selectors';
import { colors, radius, spacing, touch, typography } from '../theme/tokens';
import { formatTime } from '../utils/time';

// TODO(android-kiosk-mode): evaluate launcher/kiosk mode without app-grid UX.
export function SystemScreen() {
  const { state, actions } = useNenShell();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>System</Text>
        <Text style={styles.title}>Safety and bridge state</Text>
        <Text style={styles.body}>The shell can observe, suggest, and queue approvals. Real actuators remain absent.</Text>
      </View>

      <CalmCard style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Pi Code bridge</Text>
          <StatusPill label={state.bridgeHealth.status} />
        </View>
        <Text style={styles.body}>{state.bridgeHealth.transport.toUpperCase()} · {state.bridgeHealth.endpointBase}</Text>
        <Text style={styles.muted}>Checked {formatTime(state.bridgeHealth.checkedAt)} · {state.bridgeHealth.latencyMs}ms mock latency</Text>
        <TouchableOpacity style={styles.button} onPress={actions.refreshStatus} accessibilityRole="button">
          <Text style={styles.buttonText}>Refresh local status</Text>
        </TouchableOpacity>
      </CalmCard>

      <CalmCard>
        <SchedulerPanel scheduler={state.scheduler} />
      </CalmCard>

      <CalmCard style={styles.card}>
        <Text style={styles.cardTitle}>Mock connectors</Text>
        {state.connectors.map((connector) => (
          <ConnectorRow key={connector.source} connector={connector} />
        ))}
      </CalmCard>

      <CalmCard style={styles.card}>
        <Text style={styles.cardTitle}>Autonomy and permissions</Text>
        <ToggleRow
          label="Safe Mode"
          detail="Blocks sends, file mutations, system changes, and root commands."
          value={state.permission.safeMode}
          onValueChange={actions.toggleSafeMode}
        />
        <Text style={styles.body}>Autonomy: {state.permission.autonomyLevel}. Blocked kinds: {state.permission.blockedKinds.join(', ')}.</Text>
      </CalmCard>

      <LockedActuatorCard locked={state.permission.rootLocked} />

      <CalmCard style={styles.card}>
        <Text style={styles.cardTitle}>Audit timeline</Text>
        <AuditTimeline entries={selectRecentAudit(state)} />
      </CalmCard>
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
  muted: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  card: {
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: touch.min,
  },
  buttonText: {
    color: colors.moss,
    fontWeight: '800',
  },
});
