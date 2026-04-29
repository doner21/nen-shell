import {
  ActionKind,
  ActionRisk,
  AgentTask,
  AgentTurnResult,
  ApprovalTask,
  AuditCategory,
  AuditEntry,
  BridgeHealth,
  RiskLevel,
  SchedulerJob,
  SchedulerSnapshot,
  SourceLabel,
  SuggestedAction,
} from '../types/domain';
import { makeId } from '../utils/ids';
import { nowIso } from '../utils/time';
import { mockPiBridge } from './mockPiBridge';
import { ActionDecisionResult, PiBridgeClient, SendAgentMessageInput } from './piBridge.types';

// Android emulators use 10.0.2.2 to reach a service running on the Windows host.
// When testing on a physical phone, replace this with the host machine's LAN IP,
// for example http://192.168.0.110:31415.
const DEFAULT_PI_BRIDGE_BASE_URL = 'http://10.0.2.2:31415';

type HttpMethod = 'GET' | 'POST';

type FetchJsonOptions = {
  method?: HttpMethod;
  body?: unknown;
};

const actionKinds: ActionKind[] = [
  'summarize',
  'draft_reply',
  'send_message',
  'modify_file',
  'delete_file',
  'schedule_reminder',
  'system_change',
  'root_command',
];

const actionRisks: ActionRisk[] = ['low', 'requires_confirmation', 'risky_send', 'risky_file', 'risky_system', 'root'];
const auditCategories: AuditCategory[] = [
  'boot',
  'check',
  'summary',
  'draft',
  'permission_request',
  'approval',
  'rejection',
  'blocked',
  'failure',
  'scheduler',
];
const riskLevels: RiskLevel[] = ['low', 'medium', 'high', 'root'];
const sourceLabels: SourceLabel[] = ['Gmail', 'Telegram', 'Calendar', 'File', 'Pi Code', 'System', 'Scheduler'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const stringValue = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);
const booleanValue = (value: unknown): boolean | undefined => (typeof value === 'boolean' ? value : undefined);

const normalizedString = (value: unknown, fallback: string): string => {
  const text = stringValue(value)?.trim();
  return text ? text : fallback;
};

const pickLiteral = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback;

const extractArray = (value: unknown, keys: string[]): unknown[] | undefined => {
  if (Array.isArray(value)) {
    return value;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  for (const key of keys) {
    const candidate = value[key];
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return undefined;
};

const joinUrl = (baseUrl: string, path: string) => {
  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
};

const createFetchJson = (baseUrl: string) => async (path: string, options: FetchJsonOptions = {}): Promise<unknown> => {
  const response = await fetch(joinUrl(baseUrl, path), {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    throw new Error(`Pi bridge ${path} returned HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Pi bridge ${path} returned invalid JSON`);
  }
};

const normalizeSource = (value: unknown, fallback: SourceLabel = 'Pi Code'): SourceLabel =>
  pickLiteral(value, sourceLabels, fallback);

const normalizeSuggestedAction = (value: unknown): SuggestedAction | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: normalizedString(value.id, makeId('action')),
    kind: pickLiteral(value.kind, actionKinds, 'summarize'),
    title: normalizedString(value.title, 'Suggested action'),
    description: normalizedString(value.description, 'The bridge returned an action without a description.'),
    source: normalizeSource(value.source),
    risk: pickLiteral(value.risk, actionRisks, 'low'),
    createdAt: normalizedString(value.createdAt ?? value.created_at, nowIso()),
  };
};

const normalizeSuggestedActions = (value: unknown): SuggestedAction[] =>
  extractArray(value, ['suggestedActions', 'suggested_actions', 'actions'])
    ?.map(normalizeSuggestedAction)
    .filter((action): action is SuggestedAction => Boolean(action)) ?? [];

const normalizeAuditEntry = (value: unknown): AuditEntry | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: normalizedString(value.id, makeId('audit')),
    category: pickLiteral(value.category, auditCategories, 'check'),
    title: normalizedString(value.title, 'Bridge audit event'),
    detail: normalizedString(value.detail ?? value.message, 'The bridge returned an audit entry without detail.'),
    source: normalizeSource(value.source),
    createdAt: normalizedString(value.createdAt ?? value.created_at, nowIso()),
  };
};

const normalizeAuditEntries = (value: unknown): AuditEntry[] =>
  extractArray(value, ['auditEntries', 'audit_entries', 'audit'])
    ?.map(normalizeAuditEntry)
    .filter((entry): entry is AuditEntry => Boolean(entry)) ?? [];

const normalizeAgentTurn = (value: unknown): AgentTurnResult | undefined => {
  if (!isRecord(value) || !isRecord(value.reply)) {
    return undefined;
  }

  const replyText = stringValue(value.reply.text);
  if (!replyText) {
    return undefined;
  }

  const createdAt = normalizedString(value.reply.createdAt ?? value.reply.created_at, nowIso());

  return {
    reply: {
      id: normalizedString(value.reply.id, makeId('reply')),
      role: 'assistant',
      text: replyText,
      summary: normalizedString(value.reply.summary ?? value.summary, replyText),
      created_at: normalizedString(value.reply.created_at, createdAt),
      createdAt,
    },
    suggestedActions: normalizeSuggestedActions(value),
    auditEntries: normalizeAuditEntries(value),
  };
};

const normalizeAgentTask = (value: unknown): AgentTask | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: normalizedString(value.id, makeId('agent-task')),
    title: normalizedString(value.title, 'Bridge task'),
    description: normalizedString(value.description, 'The bridge returned a task without a description.'),
    status: pickLiteral(value.status, ['pending', 'approved', 'rejected', 'completed', 'failed'], 'pending'),
    risk_level: pickLiteral(value.risk_level ?? value.riskLevel, riskLevels, 'low'),
    requires_approval: booleanValue(value.requires_approval ?? value.requiresApproval) ?? false,
    created_at: normalizedString(value.created_at ?? value.createdAt, nowIso()),
  };
};

const normalizeAgentTasks = (value: unknown): AgentTask[] | undefined => {
  const tasks = extractArray(value, ['tasks', 'agentTasks', 'agent_tasks']);
  return tasks
    ?.map(normalizeAgentTask)
    .filter((task): task is AgentTask => Boolean(task));
};

const normalizeDecision = (
  value: unknown,
  task: ApprovalTask,
  status: ActionDecisionResult['status'],
): ActionDecisionResult => {
  if (!isRecord(value)) {
    return {
      taskId: task.id,
      status,
      message: status === 'approved' ? 'HTTP bridge approval recorded.' : 'HTTP bridge rejection recorded.',
    };
  }

  return {
    taskId: normalizedString(value.taskId ?? value.task_id, task.id),
    status: pickLiteral(value.status, ['approved', 'rejected'], status),
    message: normalizedString(
      value.message,
      status === 'approved' ? 'HTTP bridge approval recorded.' : 'HTTP bridge rejection recorded.',
    ),
  };
};

const normalizeSchedulerJob = (value: unknown): SchedulerJob | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    id: normalizedString(value.id, makeId('job')),
    title: normalizedString(value.title, 'Bridge scheduler job'),
    cadence: normalizedString(value.cadence, 'on demand'),
    nextRunAt: normalizedString(value.nextRunAt ?? value.next_run_at, nowIso()),
    enabled: booleanValue(value.enabled) ?? false,
    source: normalizeSource(value.source, 'Scheduler'),
  };
};

const normalizeSchedulerSnapshot = (value: unknown): SchedulerSnapshot | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const jobs = extractArray(value.jobs, []) ?? extractArray(value, ['jobs', 'schedulerJobs', 'scheduler_jobs']) ?? [];

  return {
    heartbeatAt: normalizedString(value.heartbeatAt ?? value.heartbeat_at, nowIso()),
    status: pickLiteral(value.status, ['steady', 'paused', 'attention'], 'attention'),
    jobs: jobs.map(normalizeSchedulerJob).filter((job): job is SchedulerJob => Boolean(job)),
  };
};

const normalizeHealth = (value: unknown, baseUrl: string, latencyMs: number): BridgeHealth => {
  if (!isRecord(value)) {
    return {
      status: 'degraded',
      transport: 'http',
      endpointBase: baseUrl,
      checkedAt: nowIso(),
      latencyMs,
    };
  }

  return {
    status: pickLiteral(value.status, ['mock-online', 'offline', 'degraded'], 'degraded'),
    transport: 'http',
    endpointBase: normalizedString(value.endpointBase ?? value.endpoint_base, baseUrl),
    checkedAt: normalizedString(value.checkedAt ?? value.checked_at, nowIso()),
    latencyMs: typeof value.latencyMs === 'number' ? value.latencyMs : latencyMs,
  };
};

export const createHttpPiBridge = (baseUrl = DEFAULT_PI_BRIDGE_BASE_URL): PiBridgeClient => {
  const fetchJson = createFetchJson(baseUrl);

  const client: PiBridgeClient = {
    async getHealth(): Promise<BridgeHealth> {
      const startedAt = Date.now();
      try {
        const payload = await fetchJson('/health');
        return normalizeHealth(payload, baseUrl, Date.now() - startedAt);
      } catch {
        return {
          status: 'offline',
          transport: 'http',
          endpointBase: baseUrl,
          checkedAt: nowIso(),
          latencyMs: Date.now() - startedAt,
        };
      }
    },

    async sendAgentMessage(input: SendAgentMessageInput): Promise<AgentTurnResult> {
      try {
        const payload = await fetchJson('/agent/message', {
          method: 'POST',
          body: {
            message: input.message ?? input.text ?? '',
            context: input.context ?? {},
          },
        });
        return normalizeAgentTurn(payload) ?? mockPiBridge.sendAgentMessage(input);
      } catch {
        return mockPiBridge.sendAgentMessage(input);
      }
    },

    async getAgentTasks(): Promise<AgentTask[]> {
      try {
        const payload = await fetchJson('/agent/tasks');
        return normalizeAgentTasks(payload) ?? mockPiBridge.getAgentTasks();
      } catch {
        return mockPiBridge.getAgentTasks();
      }
    },

    async approveAgentTask(task: ApprovalTask): Promise<ActionDecisionResult> {
      try {
        const payload = await fetchJson('/agent/approve', { method: 'POST', body: task });
        return normalizeDecision(payload, task, 'approved');
      } catch {
        return mockPiBridge.approveAgentTask(task);
      }
    },

    async rejectAgentTask(task: ApprovalTask): Promise<ActionDecisionResult> {
      try {
        const payload = await fetchJson('/agent/reject', { method: 'POST', body: task });
        return normalizeDecision(payload, task, 'rejected');
      } catch {
        return mockPiBridge.rejectAgentTask(task);
      }
    },

    async getAgentAudit(): Promise<AuditEntry[]> {
      try {
        const payload = await fetchJson('/agent/audit');
        return normalizeAuditEntries(payload) ?? mockPiBridge.getAgentAudit();
      } catch {
        return mockPiBridge.getAgentAudit();
      }
    },

    async getSchedulerSnapshot(): Promise<SchedulerSnapshot> {
      try {
        const payload = await fetchJson('/scheduler/jobs');
        return normalizeSchedulerSnapshot(payload) ?? mockPiBridge.getSchedulerSnapshot();
      } catch {
        return mockPiBridge.getSchedulerSnapshot();
      }
    },

    async approveAction(task: ApprovalTask): Promise<ActionDecisionResult> {
      return client.approveAgentTask(task);
    },

    async rejectAction(task: ApprovalTask): Promise<ActionDecisionResult> {
      return client.rejectAgentTask(task);
    },
  };

  return client;
};

export const httpPiBridge = createHttpPiBridge();
