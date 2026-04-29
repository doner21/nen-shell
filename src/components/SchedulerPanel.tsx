import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing, typography } from '../theme/tokens';
import { SchedulerSnapshot } from '../types/domain';
import { formatShortDateTime, formatTime } from '../utils/time';
import { StatusPill } from './StatusPill';

export function SchedulerPanel({ scheduler }: { scheduler: SchedulerSnapshot }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Scheduler heartbeat</Text>
        <StatusPill label={scheduler.status} />
      </View>
      <Text style={styles.heartbeat}>Last beat {formatTime(scheduler.heartbeatAt)}</Text>
      {scheduler.jobs.map((job) => (
        <View key={job.id} style={styles.job}>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobDetail}>{job.cadence} · next {formatShortDateTime(job.nextRunAt)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
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
  heartbeat: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  job: {
    borderColor: colors.line,
    borderRadius: 14,
    borderWidth: 1,
    padding: spacing.md,
  },
  jobTitle: {
    color: colors.textSecondary,
    fontSize: typography.body,
    fontWeight: '700',
  },
  jobDetail: {
    color: colors.textMuted,
    fontSize: typography.small,
    marginTop: spacing.xs,
  },
});
