import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(calendar-connector): implement Calendar connector with read-only default.
export const getCalendarConnectorStatus = (): ConnectorStatus => {
  const checked = nowIso();
  return {
    id: 'connector-calendar-main',
    name: 'Calendar contour',
    type: 'calendar',
    status: 'mock',
    last_checked: checked,
    source: 'Calendar',
    state: 'mock',
    detail: 'Read-only schedule contours for planning and reminders.',
    lastCheckedAt: checked,
  };
};
