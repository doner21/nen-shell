import { getMockSchedulerSnapshot } from '../scheduler/mockScheduler';
import { AgentTurnResult, ApprovalTask, BridgeHealth, SuggestedAction } from '../types/domain';
import { makeId } from '../utils/ids';
import { nowIso } from '../utils/time';
import { ActionDecisionResult, PiBridgeClient, SendAgentMessageInput } from './piBridge.types';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const buildSuggestedActions = (text: string): SuggestedAction[] => {
  const createdAt = nowIso();
  const normalized = text.trim().toLowerCase();
  const sendTitle = normalized.includes('calendar') ? 'Draft a calendar update' : 'Prepare a quiet outbound reply';

  return [
    {
      id: makeId('action'),
      kind: 'draft_reply',
      title: 'Draft a local response note',
      description: 'Compose a short, unsent response for review inside Nen Shell.',
      source: 'Pi Code',
      risk: 'requires_confirmation',
      createdAt,
    },
    {
      id: makeId('action'),
      kind: 'send_message',
      title: sendTitle,
      description: 'Demonstration risky send. Safe Mode should block approval and record the block.',
      source: normalized.includes('telegram') ? 'Telegram' : 'Gmail',
      risk: 'risky_send',
      createdAt,
    },
  ];
};

export const mockPiBridge: PiBridgeClient = {
  async getHealth(): Promise<BridgeHealth> {
    await wait(80);
    return {
      status: 'mock-online',
      transport: 'mock',
      endpointBase: 'mock://pi-code',
      checkedAt: nowIso(),
      latencyMs: 80,
    };
  },

  async sendAgentMessage(input: SendAgentMessageInput): Promise<AgentTurnResult> {
    await wait(220);
    const createdAt = nowIso();
    const text = input.text.trim();
    const actions = buildSuggestedActions(text);

    return {
      reply: {
        id: makeId('reply'),
        role: 'assistant',
        text: `I can hold this calmly: “${text}”. I prepared a local draft and queued any risky movement for approval instead of acting.`,
        summary: 'Mock Pi Code replied locally and created reviewable actions.',
        createdAt,
      },
      suggestedActions: actions,
      auditEntries: [
        {
          id: makeId('audit'),
          category: 'summary',
          title: 'Mock agent turn summarized',
          detail: 'A deterministic local reply was generated without network access.',
          source: 'Pi Code',
          createdAt,
        },
        {
          id: makeId('audit'),
          category: 'draft',
          title: 'Draft kept local',
          detail: 'The outbound-ready text remains only a suggestion until approved.',
          source: 'Pi Code',
          createdAt,
        },
      ],
    };
  },

  async getSchedulerSnapshot() {
    await wait(80);
    return getMockSchedulerSnapshot();
  },

  async approveAction(task: ApprovalTask): Promise<ActionDecisionResult> {
    await wait(120);
    return {
      taskId: task.id,
      status: 'approved',
      message: 'Mock approval recorded. No external side effect occurred.',
    };
  },

  async rejectAction(task: ApprovalTask): Promise<ActionDecisionResult> {
    await wait(80);
    return {
      taskId: task.id,
      status: 'rejected',
      message: 'Mock rejection recorded. No external side effect occurred.',
    };
  },
};
