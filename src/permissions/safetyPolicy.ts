import { ActionKind, ActionRisk, SuggestedAction } from '../types/domain';

const riskySafeModeRisks: ActionRisk[] = ['risky_send', 'risky_file', 'risky_system', 'root'];
const blockedSafeModeKinds: ActionKind[] = ['send_message', 'modify_file', 'delete_file', 'system_change', 'root_command'];

export const isRiskBlockedBySafeMode = (action: SuggestedAction, safeMode: boolean) => {
  if (!safeMode) {
    return false;
  }

  return riskySafeModeRisks.includes(action.risk) || blockedSafeModeKinds.includes(action.kind);
};

export const describeRisk = (risk: ActionRisk) => {
  switch (risk) {
    case 'low':
      return 'Low risk, still recorded in audit.';
    case 'requires_confirmation':
      return 'Requires explicit confirmation.';
    case 'risky_send':
      return 'Outbound send is blocked by Safe Mode.';
    case 'risky_file':
      return 'File mutation is blocked by Safe Mode.';
    case 'risky_system':
      return 'System change is blocked by Safe Mode.';
    case 'root':
      return 'Root command is locked.';
  }
};
