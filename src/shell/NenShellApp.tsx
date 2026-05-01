import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useRef } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomNav } from '../components/BottomNav';
import { BriefScreen } from '../screens/BriefScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SystemScreen } from '../screens/SystemScreen';
import { TasksScreen } from '../screens/TasksScreen';
import { NenShellProvider, useNenShell } from '../state/NenShellContext';
import { selectPendingTasks } from '../state/selectors';
import { colors } from '../theme/tokens';

function ActiveScreen() {
  const { state, actions } = useNenShell();
  const pendingCount = selectPendingTasks(state).length;

  const scrollRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom when new messages arrive (only on home tab)
  useEffect(() => {
    if (state.activeTab === 'home' && state.messages.length > 0) {
      const timer = setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [state.messages.length, state.activeTab]);

  const renderScreen = () => {
    switch (state.activeTab) {
      case 'brief':
        return <BriefScreen />;
      case 'tasks':
        return <TasksScreen />;
      case 'system':
        return <SystemScreen />;
      case 'home':
      default:
        return <HomeScreen />;
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.frame}>
          <ScrollView
            ref={scrollRef}
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderScreen()}
          </ScrollView>
          <BottomNav activeTab={state.activeTab} pendingCount={pendingCount} onChange={actions.setActiveTab} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function NenShellApp() {
  return (
    <SafeAreaProvider>
      <NenShellProvider>
        <ActiveScreen />
      </NenShellProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  frame: {
    backgroundColor: colors.ink,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});
