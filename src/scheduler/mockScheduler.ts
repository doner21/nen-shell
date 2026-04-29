import { SchedulerSnapshot } from '../types/domain';
import { minutesFromNow, nowIso } from '../utils/time';

// TODO(android-notification-listener): integrate Android notification listener after permission design.
export const getMockSchedulerSnapshot = (): SchedulerSnapshot => ({
  heartbeatAt: nowIso(),
  status: 'steady',
  jobs: [
    {
      id: 'job-morning-brief',
      title: 'Morning brief',
      cadence: 'Daily at 07:30',
      nextRunAt: minutesFromNow(38),
      enabled: true,
      source: 'Scheduler',
    },
    {
      id: 'job-calendar-drift',
      title: 'Calendar drift check',
      cadence: 'Every 2 hours',
      nextRunAt: minutesFromNow(74),
      enabled: true,
      source: 'Calendar',
    },
    {
      id: 'job-approval-sweep',
      title: 'Approval queue sweep',
      cadence: 'Every 20 minutes',
      nextRunAt: minutesFromNow(20),
      enabled: true,
      source: 'Scheduler',
    },
  ],
});
