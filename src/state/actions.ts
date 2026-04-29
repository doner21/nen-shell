import { AgentMessage, AgentTurnResult, ApprovalTask, AuditEntry, BridgeHealth, SchedulerSnapshot, TabId } from '../types/domain';

export type ShellAction =
  | { type: 'SET_ACTIVE_TAB'; tab: TabId }
  | { type: 'SEND_MESSAGE_REQUEST'; message: AgentMessage }
  | { type: 'SEND_MESSAGE_SUCCESS'; result: AgentTurnResult }
  | { type: 'SEND_MESSAGE_FAILURE'; error: string; audit: AuditEntry }
  | { type: 'ADD_AUDIT'; entry: AuditEntry }
  | { type: 'APPROVE_TASK'; taskId: string; reason?: string; audit: AuditEntry }
  | { type: 'REJECT_TASK'; taskId: string; reason?: string; audit: AuditEntry }
  | { type: 'BLOCK_TASK'; taskId: string; reason: string; audit: AuditEntry }
  | { type: 'TOGGLE_SAFE_MODE' }
  | { type: 'REFRESH_STATUS'; bridgeHealth: BridgeHealth; scheduler: SchedulerSnapshot; audit: AuditEntry };

export type ShellActionsApi = {
  setActiveTab(tab: TabId): void;
  sendMessage(text: string): Promise<void>;
  approveTask(task: ApprovalTask): Promise<void>;
  rejectTask(task: ApprovalTask): Promise<void>;
  toggleSafeMode(): void;
  refreshStatus(): Promise<void>;
};
