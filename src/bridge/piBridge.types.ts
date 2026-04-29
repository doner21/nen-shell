import { AgentTurnResult, ApprovalTask, BridgeHealth, SchedulerSnapshot } from '../types/domain';

export type SendAgentMessageInput = {
  text: string;
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
  /** GET /scheduler/jobs */
  getSchedulerSnapshot(): Promise<SchedulerSnapshot>;
  /** POST /actions/:id/approve */
  approveAction(task: ApprovalTask): Promise<ActionDecisionResult>;
  /** POST /actions/:id/reject */
  rejectAction(task: ApprovalTask): Promise<ActionDecisionResult>;
};
