import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BriefItemCard } from '../components/BriefItemCard';
import { CalmCard } from '../components/CalmCard';
import { FieldPill } from '../components/FieldPill';
import { useNenShell } from '../state/NenShellContext';
import { colors, spacing, typography } from '../theme/tokens';

export function BriefScreen() {
  const { state } = useNenShell();

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Brief</Text>
        <Text style={styles.title}>A digest, not a feed.</Text>
        <Text style={styles.body}>Sources appear as passive labels only. Nen Shell does not expose app launchers or social-scroll surfaces.</Text>
      </View>

      {state.brief.map((section) => (
        <CalmCard key={section.id} style={styles.card}>
          <View style={styles.pills}>
            {section.sources.map((source) => (
              <FieldPill key={source} source={source} />
            ))}
          </View>
          <Text style={styles.cardTitle}>{section.title}</Text>
          <Text style={styles.body}>{section.body}</Text>
          {state.briefItems
            .filter((item) => section.sources.some((source) => source.toLowerCase().includes(item.source_type) || item.source_name === source || source === 'Pi Code'))
            .slice(0, 2)
            .map((item) => <BriefItemCard key={`${section.id}-${item.id}`} item={item} />)}
        </CalmCard>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    gap: spacing.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  header: {
    gap: spacing.md,
    paddingTop: spacing.lg,
  },
  eyebrow: {
    color: colors.amber,
    fontSize: typography.small,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.ivory,
    fontSize: typography.title,
    fontWeight: '800',
  },
  body: {
    color: colors.textSecondary,
    fontSize: typography.body,
    lineHeight: 22,
  },
  card: {
    gap: spacing.md,
  },
  cardTitle: {
    color: colors.ivory,
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  pills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
