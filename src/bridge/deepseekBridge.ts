import { AgentTurnResult, SuggestedAction } from '../types/domain';
import { makeId } from '../utils/ids';
import { nowIso } from '../utils/time';
import { mockPiBridge } from './mockPiBridge';
import { File, Paths } from 'expo-file-system';
import { PiBridgeClient, SendAgentMessageInput } from './piBridge.types';

// ---------------------------------------------------------------------------
// DeepSeek API response types (OpenAI-compatible shape)
// ---------------------------------------------------------------------------

type DeepSeekMessage = { role: string; content: string };

type DeepSeekChoice = {
  index: number;
  message: DeepSeekMessage;
  finish_reason: string;
};

type DeepSeekCompletion = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: DeepSeekChoice[];
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

// ---------------------------------------------------------------------------
// API key – env var first, hardcoded fallback per user request
// ---------------------------------------------------------------------------

const DEEPSEEK_API_KEY: string =
  (typeof process !== 'undefined' &&
    (process.env as Record<string, string | undefined>).EXPO_PUBLIC_DEEPSEEK_API_KEY) ||
  'sk-74e05635ca1242d5877ba8fc900e9dc2';

// ---------------------------------------------------------------------------
// System prompt – replaces what the Pi CLI / bridge server provided
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT =
  'You are Nen Shell, a calm, safety-first mobile agent running on an Android phone.\n' +
  'You help the user manage their digital life through short, actionable replies.\n' +
  'Keep responses concise (1-3 sentences). Suggest concrete next actions where appropriate.\n' +
  'Never execute risky operations without explicit user approval.';

// ---------------------------------------------------------------------------
// Suggested actions — AI response is the output; no hardcoded demo actions.
// Future: parse structured actions from the AI response JSON.
// ---------------------------------------------------------------------------

const buildSuggestedActions = (_text: string): SuggestedAction[] => {
  // No hardcoded demo actions. The AI reply text IS the output.
  // Structured action suggestions will be parsed from AI responses in a future update.
  return [];
};

// ---------------------------------------------------------------------------
// DeepSeek → AgentTurnResult normalizer
// ---------------------------------------------------------------------------

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const normalizeDeepSeekTurn = (
  payload: unknown,
  inputText: string,
): AgentTurnResult | null => {
  // 1. Guard: must be a non-null object
  if (!isRecord(payload)) return null;

  // 2. Extract choices array
  const choices = payload.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  // 3. Extract message content from first choice
  const firstChoice = choices[0];
  if (!isRecord(firstChoice)) return null;

  const message = firstChoice.message;
  if (!isRecord(message)) return null;

  const content = typeof message.content === 'string' ? message.content.trim() : '';
  if (!content) return null;

  // 4. Build AgentTurnResult
  const createdAt = nowIso();
  const actions = buildSuggestedActions(content);

  return {
    reply: {
      id: makeId('reply'),
      role: 'assistant',
      text: content,
      summary: content.slice(0, 200) + (content.length > 200 ? '...' : ''),
      created_at: createdAt,
      createdAt,
    },
    suggestedActions: actions,
    auditEntries: [
      {
        id: makeId('audit'),
        category: 'summary',
        title: 'DeepSeek agent turn summarized',
        detail: 'A reply was generated via the direct DeepSeek V4 API.',
        source: 'Pi Code',
        createdAt,
      },
      {
        id: makeId('audit'),
        category: 'draft',
        title: 'Draft kept local',
        detail:
          'The outbound-ready text remains only a suggestion until approved.',
        source: 'Pi Code',
        createdAt,
      },
    ],
  };
};

// ---------------------------------------------------------------------------
// Factory – creates a PiBridgeClient backed by the DeepSeek API
// ---------------------------------------------------------------------------

const DEEPSEEK_CHAT_URL = 'https://api.deepseek.com/chat/completions';

export const createDeepseekBridge = (): PiBridgeClient => {
  const client: PiBridgeClient = {
    // ---- sendAgentMessage: direct DeepSeek call, with mock fallback ----

    async sendAgentMessage(input: SendAgentMessageInput): Promise<AgentTurnResult> {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      try {
        const userText = (input.message ?? input.text ?? '').trim();

        const response = await fetch(DEEPSEEK_CHAT_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'deepseek-v4-flash',
            messages: (() => {
              const history: { role: string; content: string }[] = [
                { role: 'system', content: SYSTEM_PROMPT },
              ];
              // Append prior conversation turns if available
              if (input.conversation && input.conversation.length > 0) {
                for (const msg of input.conversation) {
                  history.push({ role: msg.role, content: msg.text });
                }
              }
              // Append the current user message as the final turn
              history.push({ role: 'user', content: userText });
              return history;
            })(),
            stream: false,
            thinking: { type: 'disabled' },
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(
            `DeepSeek API returned HTTP ${response.status}`,
          );
        }

        const json: unknown = await response.json();
        const turn = normalizeDeepSeekTurn(json, userText);
        if (!turn) {
          throw new Error('DeepSeek API returned an unrecognized response shape');
        }

        return turn;
      } catch {
        // Any error (network, auth, rate-limit, malformed) → fallback to mock
        return mockPiBridge.sendAgentMessage(input);
      } finally {
        clearTimeout(timeoutId);
      }
    },

    // ---- All other methods delegate directly to mockPiBridge ----

    async writeFile(filename: string, content: string): Promise<void> {
      const file = new File(Paths.document, filename);
      file.create({ overwrite: true, intermediates: true });
      file.write(content, { encoding: 'utf8' });
    },

    getHealth: () => mockPiBridge.getHealth(),
    getAgentTasks: () => mockPiBridge.getAgentTasks(),
    approveAgentTask: (task) => mockPiBridge.approveAgentTask(task),
    rejectAgentTask: (task) => mockPiBridge.rejectAgentTask(task),
    getAgentAudit: () => mockPiBridge.getAgentAudit(),
    getSchedulerSnapshot: () => mockPiBridge.getSchedulerSnapshot(),
    approveAction: (task) => mockPiBridge.approveAction(task),
    rejectAction: (task) => mockPiBridge.rejectAction(task),
  };

  return client;
};

// ---------------------------------------------------------------------------
// Default singleton – the drop-in replacement for httpPiBridge
// ---------------------------------------------------------------------------

export const deepseekBridge = createDeepseekBridge();
