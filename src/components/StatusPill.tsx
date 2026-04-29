import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

type Tone = 'moss' | 'amber' | 'stone';

export function StatusPill({ label, tone = 'moss' }: { label: string; tone?: Tone }) {
  const dotColor = tone === 'moss' ? colors.moss : tone === 'amber' ? colors.amber : colors.stone;

  return (
    <View style={styles.pill}>
      <View style={[styles.dot, { backgroundColor: dotColor }]} />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.slate,
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dot: {
    borderRadius: 99,
    height: 7,
    width: 7,
  },
  text: {
    color: colors.textSecondary,
    fontSize: typography.small,
    letterSpacing: 0.3,
  },
});
