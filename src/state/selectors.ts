import { ApprovalTask, ShellState } from '../types/domain';

export const selectPendingTasks = (state: ShellState): ApprovalTask[] =>
  state.approvalQueue.filter((task) => task.status === 'pending');

export const selectCompletedTasks = (state: ShellState): ApprovalTask[] =>
  state.approvalQueue.filter((task) => task.status !== 'pending');

export const selectLatestPendingAction = (state: ShellState) => selectPendingTasks(state)[0];

export const selectRecentAudit = (state: ShellState) => state.auditLog.slice(0, 12);
