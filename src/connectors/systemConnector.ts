import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

export const getSystemHeartbeatStatus = (): ConnectorStatus => {
  const checked = nowIso();
  return {
    id: 'connector-system-heartbeat',
    name: 'System heartbeat',
    type: 'system',
    status: 'mock',
    last_checked: checked,
    source: 'File',
    state: 'mock',
    detail: 'Heartbeat is local and read-only. System actuators remain locked by default.',
    lastCheckedAt: checked,
  };
};
