import React from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export function SafeModeBanner({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  const handleToggle = () => {
    if (enabled) {
      Alert.alert(
        'Disable Safe Mode?',
        'Outbound sends, file changes, and system changes will become possible. Root commands remain locked regardless. Audit entries will still be recorded for every action.',
        [
          { text: 'Keep On', style: 'cancel' },
          { text: 'Disable', style: 'destructive', onPress: onToggle },
        ],
      );
    } else {
      onToggle();
    }
  };

  return (
    <View style={[styles.banner, !enabled && styles.bannerLoose]}>
      <View style={styles.row}>
        <Text style={styles.title}>{enabled ? 'Safe Mode is on' : 'Safe Mode is off'}</Text>
        <Switch
          value={enabled}
          onValueChange={handleToggle}
          trackColor={{ false: colors.line, true: colors.mossDim }}
          thumbColor={enabled ? colors.moss : colors.stone}
        />
      </View>
      <Text style={styles.body}>
        {enabled
          ? 'Risky sends, file mutations, system changes, and root commands are blocked by default.'
          : 'Mock approvals may pass, but no real connector or actuator side effects exist in this slice.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.slate,
    borderColor: colors.mossDim,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  bannerLoose: {
    borderColor: colors.amberMuted,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
});
