import { AgentTask, AgentTurnResult, ApprovalTask, AuditEntry, BridgeHealth, SchedulerSnapshot } from '../types/domain';

export type SendAgentMessageInput = {
  message: string;
  context?: Record<string, unknown>;
  /** UI compatibility; normalized to message by mock bridge. */
  text?: string;
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

  /** Backwards-compatible aliases used by the first UI slice. */
  approveAction(task: ApprovalTask): Promise<ActionDecisionResult>;
  rejectAction(task: ApprovalTask): Promise<ActionDecisionResult>;
};
