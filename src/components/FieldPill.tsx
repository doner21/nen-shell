import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { SourceLabel } from '../types/domain';

export function FieldPill({ source }: { source: SourceLabel }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.slate,
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  text: {
    color: colors.moss,
    fontSize: typography.small,
  },
});
