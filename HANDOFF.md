# Nen Shell Handoff — Real Pi Code Chat Integration

## Current state

Repository: `C:/Users/doner/nen-shell`

Nen Shell is a working Expo / React Native TypeScript prototype for a calm, mobile-first agentic phone shell. The app has:

- Home / Calm Brief screen
- Brief screen grouped by meaning, not by app
- Tasks approval queue
- System trust/control screen
- Safe Mode default ON
- Audit log
- Mock Pi Code bridge
- Mock connectors for email, Telegram-style messages, calendar, file changes, and system heartbeat
- Android Studio / SDK / emulator installed and configured locally

Validation currently passes:

```powershell
cd C:\Users\doner\nen-shell
npm run typecheck
npx expo-doctor
```

Run on Android emulator:

```powershell
cd C:\Users\doner\nen-shell
npm run android
```

Configured emulator:

```text
NenShell_API35
```

If keyboard input fails in the emulator, cold boot the AVD. Hardware keyboard was enabled in:

```text
C:\Users\doner\.android\avd\NenShell_API35.avd\config.ini
C:\Users\doner\.android\avd\NenShell_API35.avd\hardware-qemu.ini
```

with:

```text
hw.keyboard = yes
```

Optional soft keyboard setting while emulator is running:

```powershell
adb shell settings put secure show_ime_with_hard_keyboard 1
```

## Important product invariant

Nen Shell should not become an app launcher. Do not add Gmail / Telegram / Calendar open buttons or app grids. Integrations should ingest information and expose summaries/actions, not destinations.

## Key source files

App shell:

- `App.tsx`
- `src/shell/NenShellApp.tsx`

State and action flow:

- `src/state/NenShellContext.tsx`
- `src/state/reducer.ts`
- `src/state/actions.ts`
- `src/state/selectors.ts`

Bridge layer to replace:

- `src/bridge/bridgeClient.ts`
- `src/bridge/piBridge.types.ts`
- `src/bridge/mockPiBridge.ts`

Current bridge export:

```ts
// src/bridge/bridgeClient.ts
import { mockPiBridge } from './mockPiBridge';

// TODO(real-pi-code-bridge): replace mock with local HTTP/WebSocket Pi Code bridge.
export const piBridge = mockPiBridge;
```

The real integration should replace `piBridge` with an HTTP/WebSocket client that implements `PiBridgeClient`.

## Current bridge contract

Defined in `src/bridge/piBridge.types.ts`:

```ts
export type PiBridgeClient = {
  /** GET /health */
  getHealth(): Promise<BridgeHealth>;

  /** POST /agent/message */
  sendAgentMessage(input: SendAgentMessageInput): Promise<AgentTurnResult>;

  /** GET /agent/tasks */
  getAgentTasks(): Promise<AgentTask[]>;

  /** POST /agent/approve */
  approveAgentTask(task: ApprovalTask): Promise<ActionDecisionResult>;

  /** POST /agent/reject */
  rejectAgentTask(task: ApprovalTask): Promise<ActionDecisionResult>;

  /** GET /agent/audit */
  getAgentAudit(): Promise<AuditEntry[]>;

  /** GET /scheduler/jobs */
  getSchedulerSnapshot(): Promise<SchedulerSnapshot>;

  /** UI aliases currently used by first slice */
  approveAction(task: ApprovalTask): Promise<ActionDecisionResult>;
  rejectAction(task: ApprovalTask): Promise<ActionDecisionResult>;
};
```

`sendAgentMessage` input:

```ts
{
  message: string;
  context?: Record<string, unknown>;
}
```

Expected output shape:

```ts
{
  reply: {
    id: string;
    role: 'assistant';
    text: string;
    summary: string;
    created_at: string;
    createdAt: string;
  };
  suggestedActions: SuggestedAction[];
  auditEntries: AuditEntry[];
}
```

## Current vertical slice

Home input flow:

1. User types into `src/components/AgentInput.tsx`.
2. `HomeScreen` calls `actions.sendMessage`.
3. `src/state/NenShellContext.tsx` calls:

```ts
piBridge.sendAgentMessage({ message: clean, context: {} })
```

4. Reducer receives `SEND_MESSAGE_SUCCESS`.
5. Assistant reply is displayed on Home.
6. Suggested actions become pending approval tasks.
7. Tasks screen can approve/reject.
8. Safe Mode blocks risky sends/system/file/root actions.
9. Audit entries appear in System.

## Recommended next implementation step

Create a new file:

```text
src/bridge/httpPiBridge.ts
```

Implement `PiBridgeClient` using `fetch` against a local bridge URL, for example:

```ts
const PI_BRIDGE_BASE_URL = 'http://10.0.2.2:PORT';
```

Important Android emulator networking note:

- From Android emulator, `localhost` points to the emulator itself.
- To reach a service running on the Windows host, use:

```text
http://10.0.2.2:<port>
```

If testing on a physical phone, use the Windows machine LAN IP instead, e.g.:

```text
http://192.168.0.110:<port>
```

Then switch `src/bridge/bridgeClient.ts` to:

```ts
import { httpPiBridge } from './httpPiBridge';
export const piBridge = httpPiBridge;
```

Keep `mockPiBridge` around as fallback.

## Suggested bridge server endpoints

The local Pi Code bridge should expose:

```http
GET /health
POST /agent/message
GET /agent/tasks
POST /agent/approve
POST /agent/reject
GET /agent/audit
GET /scheduler/jobs
```

Minimal `POST /agent/message` request:

```json
{
  "message": "user text",
  "context": {}
}
```

Minimal response:

```json
{
  "reply": {
    "id": "reply-1",
    "role": "assistant",
    "text": "Agent reply text",
    "summary": "Short status summary",
    "created_at": "2026-04-29T00:00:00.000Z",
    "createdAt": "2026-04-29T00:00:00.000Z"
  },
  "suggestedActions": [],
  "auditEntries": []
}
```

## Safety constraints to preserve

Files:

- `src/permissions/safetyPolicy.ts`
- `src/permissions/permissionBroker.ts`

Current behavior:

- Safe Mode defaults ON.
- Sending messages is blocked while Safe Mode is ON.
- File mutation is blocked while Safe Mode is ON.
- System changes are blocked while Safe Mode is ON.
- Root actions are locked.
- Approval/rejection/block events are audit logged.

Do not bypass this when adding real bridge integration.

## Known environment notes

Installed/configured:

- Android Studio via winget
- Android SDK under `C:\Users\doner\AppData\Local\Android\Sdk`
- Platform tools / `adb`
- Emulator
- Command-line tools / `sdkmanager`
- Java from Android Studio JBR

User environment variables were set:

```text
ANDROID_HOME=C:\Users\doner\AppData\Local\Android\Sdk
ANDROID_SDK_ROOT=C:\Users\doner\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
```

If shell does not see these, close/reopen PowerShell.

## Next context prompt

Use this prompt in the next context:

> We are working in `C:/Users/doner/nen-shell`, an Expo React Native TypeScript prototype for Nen Shell. The first UI vertical slice is working and typechecks. The mock Pi bridge is in `src/bridge/mockPiBridge.ts`; the active bridge export is `src/bridge/bridgeClient.ts`; the interface is `src/bridge/piBridge.types.ts`. Please implement real local Pi Code chat integration by adding an HTTP bridge client, probably `src/bridge/httpPiBridge.ts`, that implements `PiBridgeClient`. It should call a local server from the Android emulator using `http://10.0.2.2:<port>` and preserve mock fallback if the bridge is unavailable. The Home screen already calls `piBridge.sendAgentMessage({ message, context: {} })`, then displays replies and queues suggested actions. Preserve Safe Mode and permission broker behavior. Do not add app launcher behavior or open-app buttons. Run `npm run typecheck` after changes.
