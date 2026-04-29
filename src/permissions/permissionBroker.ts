import { SuggestedAction } from '../types/domain';
import { isRiskBlockedBySafeMode } from './safetyPolicy';

export type ApprovalEvaluation = {
  allowed: boolean;
  reason?: string;
};

export const evaluateApproval = ({
  action,
  safeMode,
  rootLocked,
}: {
  action: SuggestedAction;
  safeMode: boolean;
  rootLocked: boolean;
}): ApprovalEvaluation => {
  if (rootLocked && (action.kind === 'root_command' || action.kind === 'system_change' || action.risk === 'root')) {
    return {
      allowed: false,
      reason: 'Root/system actuator is locked. This request stayed local and no action was taken.',
    };
  }

  if (isRiskBlockedBySafeMode(action, safeMode)) {
    return {
      allowed: false,
      reason: 'Safe Mode is on, so sending, file changes, system changes, and root actions remain blocked.',
    };
  }

  return { allowed: true };
};
