import { ConnectorStatus } from '../types/domain';
import { nowIso } from '../utils/time';

// TODO(telegram-connector): implement Telegram connector with explicit permissions.
export const getTelegramConnectorStatus = (): ConnectorStatus => ({
  source: 'Telegram',
  state: 'mock',
  detail: 'Mock read-only pulse for private chats and groups.',
  lastCheckedAt: nowIso(),
});
