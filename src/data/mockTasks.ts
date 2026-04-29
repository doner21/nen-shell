import { AgentTask } from '../types/domain';
import { nowIso } from '../utils/time';

export const mockTasks: AgentTask[] = [
  {
    id: 'mock-task-draft-review',
    title: 'Review local reply draft',
    description: 'A safe draft can be reviewed; sending remains approval-gated.',
    status: 'pending',
    risk_level: 'medium',
    requires_approval: true,
    created_at: nowIso(),
  },
];
