import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export type ModelOption = {
  label: string;
  model: string;
  provider: string;
};

const MODEL_OPTIONS: ModelOption[] = [
  { label: 'DeepSeek V4 Flash', model: 'deepseek-v4-flash', provider: 'deepseek' },
  { label: 'GPT-4o', model: 'gpt-4o', provider: 'openai' },
  { label: 'GPT-4o Mini', model: 'gpt-4o-mini', provider: 'openai' },
  { label: 'Claude Sonnet 4', model: 'claude-sonnet-4-20250514', provider: 'anthropic' },
  { label: 'Gemini 2.5 Flash', model: 'gemini-2.5-flash', provider: 'google' },
];

type ModelPickerProps = {
  selectedModel?: string;
  selectedProvider?: string;
  onSelect: (model: string, provider: string) => void;
};

export function ModelPicker({ selectedModel, selectedProvider, onSelect }: ModelPickerProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
      {MODEL_OPTIONS.map((option) => {
        const isSelected = selectedModel === option.model && selectedProvider === option.provider;
        return (
          <TouchableOpacity
            key={`${option.provider}/${option.model}`}
            style={[styles.pill, isSelected && styles.pillSelected]}
            onPress={() => onSelect(option.model, option.provider)}
            accessibilityRole="button"
            accessibilityLabel={`Select ${option.label}`}
            accessibilityState={{ selected: isSelected }}
          >
            <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pill: {
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.graphite,
  },
  pillSelected: {
    borderColor: colors.moss,
    backgroundColor: colors.moss,
  },
  pillLabel: {
    color: colors.textSecondary,
    fontSize: typography.small,
    fontWeight: '700',
  },
  pillLabelSelected: {
    color: colors.ink,
  },
});
