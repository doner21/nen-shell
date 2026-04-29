import { getMockSchedulerSnapshot } from '../scheduler/mockScheduler';
import { AgentTask, AgentTurnResult, ApprovalTask, AuditEntry, BridgeHealth, SuggestedAction } from '../types/domain';
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
    const text = (input.message ?? input.text ?? '').trim();
    const actions = buildSuggestedActions(text);

    return {
      reply: {
        id: makeId('reply'),
        role: 'assistant',
        text: `I can hold this calmly: “${text}”. I prepared a local draft and queued any risky movement for approval instead of acting.`,
        summary: 'Mock Pi Code replied locally and created reviewable actions.',
        created_at: createdAt,
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

  async getAgentTasks(): Promise<AgentTask[]> {
    await wait(80);
    const createdAt = nowIso();
    return [
      {
        id: 'mock-agent-task-digest',
        title: 'Summarize priority inbox',
        description: 'Mock pending task returned through GET /agent/tasks.',
        status: 'pending',
        risk_level: 'low',
        requires_approval: false,
        created_at: createdAt,
      },
    ];
  },

  async getAgentAudit(): Promise<AuditEntry[]> {
    await wait(80);
    return [
      {
        id: makeId('audit'),
        category: 'check',
        title: 'Mock audit endpoint read',
        detail: 'GET /agent/audit returned local audit rows; no external bridge was contacted.',
        source: 'Pi Code',
        createdAt: nowIso(),
      },
    ];
  },

  async getSchedulerSnapshot() {
    await wait(80);
    return getMockSchedulerSnapshot();
  },

  async approveAgentTask(task: ApprovalTask): Promise<ActionDecisionResult> {
    await wait(120);
    return {
      taskId: task.id,
      status: 'approved',
      message: 'Mock approval recorded. No external side effect occurred.',
    };
  },

  async rejectAgentTask(task: ApprovalTask): Promise<ActionDecisionResult> {
    await wait(80);
    return {
      taskId: task.id,
      status: 'rejected',
      message: 'Mock rejection recorded. No external side effect occurred.',
    };
  },

  async approveAction(task: ApprovalTask): Promise<ActionDecisionResult> {
    return this.approveAgentTask(task);
  },

  async rejectAction(task: ApprovalTask): Promise<ActionDecisionResult> {
    return this.rejectAgentTask(task);
  },
};
