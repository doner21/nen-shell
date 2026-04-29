import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(telegram-connector): implement Telegram connector with explicit permissions.
export const getTelegramConnectorStatus = (): ConnectorStatus => {
  const checked = nowIso();
  return {
    id: 'connector-message-telegram',
    name: 'Message summaries',
    type: 'message',
    status: 'mock',
    last_checked: checked,
    source: 'Telegram',
    state: 'mock',
    detail: 'Mock read-only pulse for private chats and groups.',
    lastCheckedAt: checked,
  };
};
