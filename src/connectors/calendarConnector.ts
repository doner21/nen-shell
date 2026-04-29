import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(calendar-connector): implement Calendar connector with read-only default.
export const getCalendarConnectorStatus = (): ConnectorStatus => ({
  source: 'Calendar',
  state: 'mock',
  detail: 'Read-only schedule contours for planning and reminders.',
  lastCheckedAt: nowIso(),
});
