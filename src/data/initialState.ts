import { getCalendarConnectorStatus } from '../connectors/calendarConnector';
import { getGmailConnectorStatus } from '../connectors/gmailConnector';
import { getTelegramConnectorStatus } from '../connectors/telegramConnector';
import { getFileConnectorStatus } from '../connectors/fileConnector';
import { getSystemHeartbeatStatus } from '../connectors/systemConnector';
import { mockBriefSections, mockPriorities } from './mockBrief';
import { getMockSchedulerSnapshot } from '../scheduler/mockScheduler';
import { ShellState } from '../types/domain';
import { makeId } from '../utils/ids';
import { nowIso } from '../utils/time';

export const createInitialState = (): ShellState => {
  const bootTime = nowIso();

  return {
    activeTab: 'home',
    permission: {
      safeMode: true,
      rootLocked: true,
      autonomyLevel: 'suggest',
      blockedKinds: ['send_message', 'modify_file', 'delete_file', 'system_change', 'root_command'],
    },
    bridgeHealth: {
      status: 'mock-online',
      transport: 'mock',
      endpointBase: 'mock://pi-code',
      checkedAt: bootTime,
      latencyMs: 80,
    },
    scheduler: getMockSchedulerSnapshot(),
    connectors: [
      getGmailConnectorStatus(),
      getTelegramConnectorStatus(),
      getCalendarConnectorStatus(),
      getFileConnectorStatus(),
      getSystemHeartbeatStatus(),
    ],
    brief: mockBriefSections,
    priorities: mockPriorities,
    todaySummary: 'A narrow, quiet day: observe first, draft second, ask before acting.',
    scheduleSummary: 'One meeting ahead, one protected focus block, approvals swept every 20 minutes.',
    attentionCounts: {
      approvals: 0,
      calendar: 1,
      messages: 3,
    },
    messages: [],
    latestReply: undefined,
    approvalQueue: [],
    agentLoading: false,
    auditLog: [
      {
        id: makeId('audit'),
        category: 'boot',
        title: 'Nen Shell booted in Safe Mode',
        detail: 'Safe Mode is on and root/system actuator is locked.',
        source: 'System',
        createdAt: bootTime,
      },
      {
        id: makeId('audit'),
        category: 'check',
        title: 'Mock bridge health checked',
        detail: 'Using local mock endpoint boundaries; no network request was made.',
        source: 'Pi Code',
        createdAt: bootTime,
      },
      {
        id: makeId('audit'),
        category: 'summary',
        title: 'Daily digest composed',
        detail: 'Gmail, Telegram, and Calendar appeared only as passive source labels.',
        source: 'System',
        createdAt: bootTime,
      },
    ],
  };
};
