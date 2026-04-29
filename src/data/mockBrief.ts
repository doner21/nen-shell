import { BriefSection, PriorityItem } from '../types/domain';

export const mockBriefSections: BriefSection[] = [
  {
    id: 'brief-quiet-inbox',
    title: 'Inbox pressure is low',
    body: 'Three threads look worth reading later. Nothing is marked as urgent, and no reply will be sent without approval.',
    sources: ['Gmail'],
  },
  {
    id: 'brief-social-pulse',
    title: 'Telegram pulse',
    body: 'Two project notes were captured as passive context. Nen Shell is not showing a feed or opening any chat surface.',
    sources: ['Telegram'],
  },
  {
    id: 'brief-calendar-contour',
    title: 'Calendar contour',
    body: 'The afternoon has one meeting and a clear recovery window. A reminder can be drafted for approval.',
    sources: ['Calendar'],
  },
];

export const mockPriorities: PriorityItem[] = [
  {
    id: 'priority-plan',
    title: 'Close the next planning loop',
    detail: 'Review the quiet summary before creating any outbound draft.',
    source: 'Pi Code',
  },
  {
    id: 'priority-protect',
    title: 'Keep Safe Mode on',
    detail: 'Risky sends, file changes, system changes, and root actions stay blocked.',
    source: 'System',
  },
];
