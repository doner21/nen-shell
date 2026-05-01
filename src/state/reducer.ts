import { ShellAction } from './actions';
import { ApprovalTask, AuditEntry, ShellState } from '../types/domain';
import { makeId } from '../utils/ids';
import { nowIso } from '../utils/time';

const sortAudit = (entries: AuditEntry[]) =>
  [...entries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

const withApprovalCount = (state: ShellState, approvalQueue: ApprovalTask[]): ShellState => ({
  ...state,
  approvalQueue,
  attentionCounts: {
    ...state.attentionCounts,
    approvals: approvalQueue.filter((task) => task.status === 'pending').length,
  },
});

export const shellReducer = (state: ShellState, action: ShellAction): ShellState => {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.tab };

    case 'SEND_MESSAGE_REQUEST':
      return {
        ...state,
        agentLoading: true,
        agentError: undefined,
        messages: [...state.messages, action.message],
      };

    case 'SEND_MESSAGE_SUCCESS': {
      const tasks: ApprovalTask[] = action.result.suggestedActions.map((suggested) => ({
        id: makeId('task'),
        action: suggested,
        status: 'pending',
        requestedAt: nowIso(),
      }));
      const permissionAudits: AuditEntry[] = tasks.map((task) => ({
        id: makeId('audit'),
        category: 'permission_request',
        title: 'Action queued for approval',
        detail: `${task.action.title} (${task.action.risk}) is waiting in Tasks.`,
        source: task.action.source,
        createdAt: nowIso(),
      }));
      const approvalQueue = [...tasks, ...state.approvalQueue];

      return withApprovalCount(
        {
          ...state,
          agentLoading: false,
          latestReply: action.result.reply,
          messages: [...state.messages, action.result.reply],
          auditLog: sortAudit([...action.result.auditEntries, ...permissionAudits, ...state.auditLog]),
        },
        approvalQueue,
      );
    }

    case 'SEND_MESSAGE_FAILURE':
      return {
        ...state,
        agentLoading: false,
        agentError: action.error,
        auditLog: sortAudit([action.audit, ...state.auditLog]),
      };

    case 'ADD_AUDIT':
      return {
        ...state,
        auditLog: sortAudit([action.entry, ...state.auditLog]),
      };

    case 'APPROVE_TASK': {
      const queue = state.approvalQueue.map((task) =>
        task.id === action.taskId
          ? { ...task, status: 'approved' as const, decidedAt: nowIso(), decisionReason: action.reason }
          : task,
      );
      return withApprovalCount(
        { ...state, auditLog: sortAudit([action.audit, ...state.auditLog]) },
        queue,
      );
    }

    case 'REJECT_TASK': {
      const queue = state.approvalQueue.map((task) =>
        task.id === action.taskId
          ? { ...task, status: 'rejected' as const, decidedAt: nowIso(), decisionReason: action.reason }
          : task,
      );
      return withApprovalCount(
        { ...state, auditLog: sortAudit([action.audit, ...state.auditLog]) },
        queue,
      );
    }

    case 'BLOCK_TASK': {
      const queue = state.approvalQueue.map((task) =>
        task.id === action.taskId
          ? { ...task, status: 'blocked' as const, decidedAt: nowIso(), decisionReason: action.reason }
          : task,
      );
      return withApprovalCount(
        { ...state, auditLog: sortAudit([action.audit, ...state.auditLog]) },
        queue,
      );
    }

    case 'TOGGLE_SAFE_MODE':
      return {
        ...state,
        permission: {
          ...state.permission,
          safeMode: !state.permission.safeMode,
        },
      };

    case 'SET_SAFE_MODE':
      return {
        ...state,
        permission: {
          ...state.permission,
          safeMode: action.enabled,
        },
      };

    case 'SET_MODEL_PREFERENCE':
      return {
        ...state,
        ...(action.model !== undefined ? { selectedModel: action.model } : {}),
        ...(action.provider !== undefined ? { selectedProvider: action.provider } : {}),
      };

    case 'WRITE_FILE_REQUEST':
      return { ...state };

    case 'WRITE_FILE_SUCCESS':
      return {
        ...state,
        auditLog: sortAudit([
          {
            id: makeId('audit'),
            category: 'check',
            title: 'File written',
            detail: `Successfully wrote to ${action.filename}.`,
            source: 'System',
            createdAt: nowIso(),
          },
          ...state.auditLog,
        ]),
      };

    case 'WRITE_FILE_FAILURE':
      return {
        ...state,
        auditLog: sortAudit([action.audit, ...state.auditLog]),
      };

    case 'REFRESH_STATUS':
      return {
        ...state,
        bridgeHealth: action.bridgeHealth,
        scheduler: action.scheduler,
        auditLog: sortAudit([action.audit, ...state.auditLog]),
      };

    default:
      return state;
  }
};
