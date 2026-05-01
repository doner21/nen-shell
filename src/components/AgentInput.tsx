import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, radius, spacing, touch, typography } from '../theme/tokens';

export function AgentInput({ loading, onSend }: { loading: boolean; onSend(text: string): void }) {
  const [text, setText] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (loading) {
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [loading]);

  const loadingLabel = elapsed < 5 ? 'Sending…' : elapsed < 20 ? `Reasoning… ${elapsed}s` : `Reasoning… ${elapsed}s`;

  const submit = () => {
    const clean = text.trim();
    if (!clean || loading) {
      return;
    }
    onSend(clean);
    setText('');
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Ask Nen Shell to reason locally..."
        placeholderTextColor={colors.textMuted}
        multiline
        style={styles.input}
        editable={!loading}
      />
      <View style={styles.row}>
        <View style={styles.voicePlaceholder}>
          <Text style={styles.voiceText}>Voice placeholder · tap-to-talk later</Text>
        </View>
        <TouchableOpacity style={[styles.send, loading && styles.sendDisabled]} onPress={submit} accessibilityRole="button">
          <Text style={styles.sendText}>{loading ? loadingLabel : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: colors.ink,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.ivory,
    fontSize: typography.body,
    minHeight: 108,
    padding: spacing.lg,
    textAlignVertical: 'top',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  voicePlaceholder: {
    borderColor: colors.line,
    borderRadius: radius.xl,
    borderWidth: 1,
    flex: 1,
    minHeight: touch.min,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  voiceText: {
    color: colors.textMuted,
    fontSize: typography.small,
  },
  send: {
    alignItems: 'center',
    backgroundColor: colors.moss,
    borderRadius: radius.xl,
    justifyContent: 'center',
    minHeight: touch.min,
    paddingHorizontal: spacing.xl,
  },
  sendDisabled: {
    backgroundColor: colors.mossDim,
  },
  sendText: {
    color: colors.ink,
    fontSize: typography.body,
    fontWeight: '700',
  },
});
