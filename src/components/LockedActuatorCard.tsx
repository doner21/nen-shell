import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { CalmCard } from './CalmCard';
import { StatusPill } from './StatusPill';

export function LockedActuatorCard({ locked }: { locked: boolean }) {
  return (
    <CalmCard style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Root/system actuator</Text>
        <StatusPill label={locked ? 'locked' : 'mock-unlocked'} tone="amber" />
      </View>
      <Text style={styles.body}>
        Locked by default. This prototype contains no real root, file mutation, notification, or system-state actuator.
      </Text>
      <View style={styles.seal}>
        <Text style={styles.sealText}>No root action surface</Text>
      </View>
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
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  seal: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  sealText: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '700',
  },
});
