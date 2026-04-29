import React from 'react';
import { Text, View } from 'react-native';
import { evaluateApproval } from '../permissions/permissionBroker';
import { SuggestedAction } from '../types/domain';
import { colors, spacing, typography } from '../theme/tokens';

export function PermissionGate({ action, safeMode, rootLocked }: { action: SuggestedAction; safeMode: boolean; rootLocked: boolean }) {
  const evaluation = evaluateApproval({ action, safeMode, rootLocked });
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={{ color: evaluation.allowed ? colors.moss : colors.amber, fontSize: typography.small }}>
        {evaluation.allowed ? 'Allowed after confirmation' : 'Blocked by safety policy'}
      </Text>
      {evaluation.reason ? <Text style={{ color: colors.textMuted, fontSize: typography.micro }}>{evaluation.reason}</Text> : null}
    </View>
  );
}
