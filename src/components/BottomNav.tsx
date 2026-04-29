import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, touch, typography } from '../theme/tokens';
import { TabId } from '../types/domain';

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'home', label: 'Home' },
  { id: 'brief', label: 'Brief' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'system', label: 'System' },
];

export function BottomNav({ activeTab, pendingCount, onChange }: { activeTab: TabId; pendingCount: number; onChange(tab: TabId): void }) {
  return (
    <View style={styles.shell}>
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <TouchableOpacity key={tab.id} style={[styles.item, active && styles.itemActive]} onPress={() => onChange(tab.id)} accessibilityRole="button">
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
            {tab.id === 'tasks' && pendingCount > 0 ? <Text style={styles.count}>{pendingCount}</Text> : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.graphite,
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    margin: spacing.lg,
    padding: spacing.xs,
  },
  item: {
    alignItems: 'center',
    borderRadius: radius.xl,
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    minHeight: touch.min,
    paddingHorizontal: spacing.sm,
  },
  itemActive: {
    backgroundColor: colors.slate,
  },
  label: {
    color: colors.textMuted,
    fontSize: typography.small,
    fontWeight: '600',
  },
  labelActive: {
    color: colors.ivory,
  },
  count: {
    color: colors.amber,
    fontSize: typography.micro,
    marginLeft: spacing.xs,
  },
});
