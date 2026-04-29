import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(gmail-api): implement OAuth/API connector without open-app launcher behavior.
export const getGmailConnectorStatus = (): ConnectorStatus => {
  const checked = nowIso();
  return {
    id: 'connector-email-gmail',
    name: 'Email summaries',
    type: 'email',
    status: 'mock',
    last_checked: checked,
    source: 'Gmail',
    state: 'mock',
    detail: 'Passive digest labels only; no sending or app-opening behavior.',
    lastCheckedAt: checked,
  };
};
