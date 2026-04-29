export type TabId = 'home' | 'brief' | 'tasks' | 'system';

export type SourceLabel = 'Gmail' | 'Telegram' | 'Calendar' | 'File' | 'Pi Code' | 'System' | 'Scheduler';

export type SourceType = 'email' | 'message' | 'calendar' | 'file' | 'system';
export type Priority = 'low' | 'normal' | 'high';
export type RiskLevel = 'low' | 'medium' | 'high' | 'root';

export type ConnectorStatus = {
  /** Required model field for the real connector registry. */
  id: string;
  name: string;
  type: SourceType;
  status: 'connected' | 'disconnected' | 'degraded' | 'mock';
  last_checked: string;

  /** UI compatibility fields for this first local-state implementation. */
  source: Exclude<SourceLabel, 'Pi Code' | 'System' | 'Scheduler'>;
  state: 'mock' | 'healthy' | 'paused' | 'needs_permission';
  detail: string;
  lastCheckedAt: string;
};

export type BridgeHealth = {
  status: 'mock-online' | 'offline' | 'degraded';
  transport: 'mock' | 'http' | 'websocket';
  endpointBase: string;
  checkedAt: string;
  latencyMs: number;
};

export type SchedulerJob = {
  id: string;
  title: string;
  cadence: string;
  nextRunAt: string;
  enabled: boolean;
  source: SourceLabel;
};

export type SchedulerSnapshot = {
  heartbeatAt: string;
  status: 'steady' | 'paused' | 'attention';
  jobs: SchedulerJob[];
};

export type AgentMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  /** Required model field for the bridge contract. */
  created_at: string;
  source_refs?: string[];

  /** UI compatibility field for React state ergonomics. */
  createdAt: string;
};

export type AgentReply = AgentMessage & {
  role: 'assistant';
  summary: string;
};

export type AgentTurnResult = {
  reply: AgentReply;
  suggestedActions: SuggestedAction[];
  auditEntries: AuditEntry[];
};

export type ActionKind =
  | 'summarize'
  | 'draft_reply'
  | 'send_message'
  | 'modify_file'
  | 'delete_file'
  | 'schedule_reminder'
  | 'system_change'
  | 'root_command';

export type ActionRisk = 'low' | 'requires_confirmation' | 'risky_send' | 'risky_file' | 'risky_system' | 'root';

export type SuggestedAction = {
  id: string;
  kind: ActionKind;
  title: string;
  description: string;
  source: SourceLabel;
  risk: ActionRisk;
  createdAt: string;
};

export type BriefItem = {
  id: string;
  title: string;
  summary: string;
  source_type: SourceType;
  source_name?: string;
  priority: Priority;
  actions: ActionKind[];
};

export type AgentTask = {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'failed';
  risk_level: RiskLevel;
  requires_approval: boolean;
  created_at: string;
};

export type PermissionCapability = {
  id: string;
  name: string;
  scope: string;
  enabled: boolean;
  requires_confirmation: boolean;
  risk_level: RiskLevel;
};

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'blocked' | 'completed' | 'failed';

export type ApprovalTask = {
  id: string;
  action: SuggestedAction;
  status: ApprovalStatus;
  requestedAt: string;
  decidedAt?: string;
  decisionReason?: string;
};

export type AuditCategory =
  | 'boot'
  | 'check'
  | 'summary'
  | 'draft'
  | 'permission_request'
  | 'approval'
  | 'rejection'
  | 'blocked'
  | 'failure'
  | 'scheduler';

export type AuditEntry = {
  id: string;
  category: AuditCategory;
  title: string;
  detail: string;
  source: SourceLabel;
  createdAt: string;
};

export type PermissionState = {
  safeMode: boolean;
  rootLocked: boolean;
  autonomyLevel: 'observe' | 'suggest' | 'confirm';
  blockedKinds: ActionKind[];
};

export type BriefSection = {
  id: string;
  title: string;
  body: string;
  sources: SourceLabel[];
};

export type PriorityItem = {
  id: string;
  title: string;
  detail: string;
  source: SourceLabel;
};

export type AttentionCounts = {
  approvals: number;
  calendar: number;
  messages: number;
};

export type ShellState = {
  activeTab: TabId;
  permission: PermissionState;
  bridgeHealth: BridgeHealth;
  scheduler: SchedulerSnapshot;
  connectors: ConnectorStatus[];
  brief: BriefSection[];
  priorities: PriorityItem[];
  todaySummary: string;
  scheduleSummary: string;
  attentionCounts: AttentionCounts;
  messages: AgentMessage[];
  latestReply?: AgentReply;
  approvalQueue: ApprovalTask[];
  auditLog: AuditEntry[];
  agentLoading: boolean;
  agentError?: string;
};
