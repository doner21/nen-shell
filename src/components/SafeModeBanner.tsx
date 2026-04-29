import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export function SafeModeBanner({ enabled }: { enabled: boolean }) {
  return (
    <View style={[styles.banner, !enabled && styles.bannerLoose]}>
      <Text style={styles.title}>{enabled ? 'Safe Mode is on' : 'Safe Mode is off'}</Text>
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
