import { BriefItem, BriefSection, PriorityItem } from '../types/domain';

export const mockBriefItems: BriefItem[] = [
  {
    id: 'item-email-budget',
    title: 'Budget note needs a short answer',
    summary: 'A finance thread asks for confirmation before end of day. Drafting is safe; sending requires approval.',
    source_type: 'email',
    source_name: 'email',
    priority: 'high',
    actions: ['summarize', 'draft_reply', 'schedule_reminder'],
  },
  {
    id: 'item-message-project',
    title: 'Project chat is waiting for a yes/no',
    summary: 'Two teammates asked whether the quiet review is complete. Nen Shell can draft a calm reply.',
    source_type: 'message',
    source_name: 'Telegram',
    priority: 'normal',
    actions: ['summarize', 'draft_reply', 'schedule_reminder'],
  },
  {
    id: 'item-calendar-focus',
    title: 'Protected focus block this afternoon',
    summary: 'One event remains today, followed by a clear recovery window.',
    source_type: 'calendar',
    source_name: 'calendar',
    priority: 'normal',
    actions: ['summarize', 'schedule_reminder'],
  },
  {
    id: 'item-file-local',
    title: 'Local notes changed',
    summary: 'A mock file summary is ready. File deletion or modification is not available without explicit approval.',
    source_type: 'file',
    source_name: 'local files',
    priority: 'low',
    actions: ['summarize', 'schedule_reminder'],
  },
];

export const mockBriefSections: BriefSection[] = [
  {
    id: 'brief-needs-attention',
    title: 'Needs attention',
    body: 'Three items may deserve a reply or reminder. Nen Shell is grouping by meaning, not by app surface.',
    sources: ['Gmail', 'Telegram'],
  },
  {
    id: 'brief-waiting-for-reply',
    title: 'Waiting for reply',
    body: 'One project question can be answered with a short drafted response. Sending remains approval-gated.',
    sources: ['Telegram'],
  },
  {
    id: 'brief-scheduled-today',
    title: 'Scheduled today',
    body: 'One meeting and one protected focus block form the day contour.',
    sources: ['Calendar'],
  },
  {
    id: 'brief-low-priority',
    title: 'Low priority',
    body: 'Local file-change notes and routine inbox drift are summarized only; no feed is shown.',
    sources: ['File', 'Gmail'],
  },
  {
    id: 'brief-drafts-ready',
    title: 'Drafts ready',
    body: 'Nen Shell can prepare drafts locally and queue any outbound send for explicit confirmation.',
    sources: ['Pi Code'],
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
