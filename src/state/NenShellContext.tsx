import React, { createContext, ReactNode, useContext, useMemo, useReducer } from 'react';
import { piBridge } from '../bridge/bridgeClient';
import { createInitialState } from '../data/initialState';
import { evaluateApproval } from '../permissions/permissionBroker';
import { AgentMessage, ApprovalTask, AuditEntry, ShellState, TabId } from '../types/domain';
import { makeId } from '../utils/ids';
import { nowIso } from '../utils/time';
import { ShellActionsApi } from './actions';
import { shellReducer } from './reducer';

type NenShellContextValue = {
  state: ShellState;
  actions: ShellActionsApi;
};

const NenShellContext = createContext<NenShellContextValue | undefined>(undefined);

const audit = (entry: Omit<AuditEntry, 'id' | 'createdAt'>): AuditEntry => ({
  ...entry,
  id: makeId('audit'),
  createdAt: nowIso(),
});

export function NenShellProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(shellReducer, undefined, createInitialState);

  const actions = useMemo<ShellActionsApi>(
    () => ({
      setActiveTab(tab: TabId) {
        dispatch({ type: 'SET_ACTIVE_TAB', tab });
      },

      async sendMessage(text: string) {
        const clean = text.trim();
        if (!clean) {
          dispatch({
            type: 'ADD_AUDIT',
            entry: audit({
              category: 'failure',
              title: 'Empty agent request ignored',
              detail: 'Nen Shell needs a short instruction before it can prepare a local reply.',
              source: 'System',
            }),
          });
          return;
        }

        const message: AgentMessage = {
          id: makeId('msg'),
          role: 'user',
          text: clean,
          created_at: nowIso(),
          createdAt: nowIso(),
        };

        dispatch({ type: 'SEND_MESSAGE_REQUEST', message });

        try {
          const result = await piBridge.sendAgentMessage({ message: clean, context: {} });
          dispatch({ type: 'SEND_MESSAGE_SUCCESS', result });
        } catch (error) {
          const detail = error instanceof Error ? error.message : 'Unknown mock bridge failure.';
          dispatch({
            type: 'SEND_MESSAGE_FAILURE',
            error: detail,
            audit: audit({
              category: 'failure',
              title: 'Mock bridge turn failed',
              detail,
              source: 'Pi Code',
            }),
          });
        }
      },

      async approveTask(task: ApprovalTask) {
        const evaluation = evaluateApproval({
          action: task.action,
          safeMode: state.permission.safeMode,
          rootLocked: state.permission.rootLocked,
        });

        if (!evaluation.allowed) {
          const reason = evaluation.reason ?? 'Request blocked by permission broker.';
          dispatch({
            type: 'BLOCK_TASK',
            taskId: task.id,
            reason,
            audit: audit({
              category: 'blocked',
              title: 'Approval blocked safely',
              detail: `${task.action.title}: ${reason}`,
              source: 'System',
            }),
          });
          return;
        }

        const result = await piBridge.approveAction(task);
        dispatch({
          type: 'APPROVE_TASK',
          taskId: task.id,
          reason: result.message,
          audit: audit({
            category: 'approval',
            title: 'Mock approval recorded',
            detail: `${task.action.title}: ${result.message}`,
            source: task.action.source,
          }),
        });
      },

      async rejectTask(task: ApprovalTask) {
        const result = await piBridge.rejectAction(task);
        dispatch({
          type: 'REJECT_TASK',
          taskId: task.id,
          reason: result.message,
          audit: audit({
            category: 'rejection',
            title: 'Action rejected',
            detail: `${task.action.title}: ${result.message}`,
            source: task.action.source,
          }),
        });
      },

      toggleSafeMode() {
        dispatch({ type: 'TOGGLE_SAFE_MODE' });
        dispatch({
          type: 'ADD_AUDIT',
          entry: audit({
            category: 'check',
            title: 'Safe Mode toggled',
            detail: state.permission.safeMode ? 'Safe Mode was turned off for mock review.' : 'Safe Mode was turned on.',
            source: 'System',
          }),
        });
      },

      async refreshStatus() {
        const [bridgeHealth, scheduler] = await Promise.all([
          piBridge.getHealth(),
          piBridge.getSchedulerSnapshot(),
        ]);
        dispatch({
          type: 'REFRESH_STATUS',
          bridgeHealth,
          scheduler,
          audit: audit({
            category: 'check',
            title: 'System status refreshed',
            detail: 'Mock bridge and scheduler snapshots were refreshed locally.',
            source: 'System',
          }),
        });
      },
    }),
    [state.permission.rootLocked, state.permission.safeMode],
  );

  return <NenShellContext.Provider value={{ state, actions }}>{children}</NenShellContext.Provider>;
}

export const useNenShell = () => {
  const context = useContext(NenShellContext);
  if (!context) {
    throw new Error('useNenShell must be used inside NenShellProvider');
  }
  return context;
};
