import { getCalendarConnectorStatus } from '../connectors/calendarConnector';
import { getFileConnectorStatus } from '../connectors/fileConnector';
import { getGmailConnectorStatus } from '../connectors/gmailConnector';
import { getSystemHeartbeatStatus } from '../connectors/systemConnector';
import { getTelegramConnectorStatus } from '../connectors/telegramConnector';

export const mockConnectors = [
  getGmailConnectorStatus(),
  getTelegramConnectorStatus(),
  getCalendarConnectorStatus(),
  getFileConnectorStatus(),
  getSystemHeartbeatStatus(),
];
