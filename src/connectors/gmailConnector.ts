import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(gmail-api): implement OAuth/API connector without open-app launcher behavior.
export const getGmailConnectorStatus = (): ConnectorStatus => ({
  source: 'Gmail',
  state: 'mock',
  detail: 'Passive digest labels only; no sending or app-opening behavior.',
  lastCheckedAt: nowIso(),
});
