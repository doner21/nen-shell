import { AgentMessage, AgentTask, AgentTurnResult, ApprovalTask, AuditEntry, BridgeHealth, SchedulerSnapshot } from '../types/domain';

export type SendAgentMessageInput = {
  message: string;
  context?: Record<string, unknown>;
  /** Full conversation history (user + assistant turns) for multi-turn sessions. */
  conversation?: AgentMessage[];
  /** UI compatibility; normalized to message by mock bridge. */
  text?: string;
  /** Optional model selection, e.g. "openai/gpt-4o". Sent to bridge as the desired model. */
  model?: string;
  /** Optional provider selection, e.g. "openai". Sent alongside model for set_model RPC. */
  provider?: string;
};

export type ActionDecisionResult = {
  taskId: string;
  status: 'approved' | 'rejected';
  message: string;
};

export type PiBridgeClient = {
  /** GET /health */
  getHealth(): Promise<BridgeHealth>;
  /** POST /agent/message */
  sendAgentMessage(input: SendAgentMessageInput): Promise<AgentTurnResult>;
  /** GET /agent/tasks */
  getAgentTasks(): Promise<AgentTask[]>;
  /** POST /agent/approve */
  approveAgentTask(task: ApprovalTask): Promise<ActionDecisionResult>;
  /** POST /agent/reject */
  rejectAgentTask(task: ApprovalTask): Promise<ActionDecisionResult>;
  /** GET /agent/audit */
  getAgentAudit(): Promise<AuditEntry[]>;

  /** GET /scheduler/jobs - local placeholder until Android WorkManager/foreground service integration. */
  getSchedulerSnapshot(): Promise<SchedulerSnapshot>;

  /** Write a string to a file in the app's document directory. */
  writeFile(filename: string, content: string): Promise<void>;

  /** Backwards-compatible aliases used by the first UI slice. */
  approveAction(task: ApprovalTask): Promise<ActionDecisionResult>;
  rejectAction(task: ApprovalTask): Promise<ActionDecisionResult>;
};
