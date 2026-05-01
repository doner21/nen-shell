# Pi Bridge server and client

Nen Shell now has both sides of the first local Pi bridge:

- App client: `src/bridge/httpPiBridge.ts`
- Host server: `tools/pi-bridge-server/server.cjs`

The Android app calls the host bridge at:

```text
http://10.0.2.2:31415
```

Android emulator rule: `localhost` points to the emulator, so `10.0.2.2` is the emulator alias for a server running on the Windows host.

## Start the bridge

Terminal 1:

```powershell
cd C:\Users\doner\nen-shell
npm run bridge
```

Default server bind:

```text
http://127.0.0.1:31415
```

The Android emulator can reach this as `http://10.0.2.2:31415`.

For physical phone testing, bind to the LAN and use the Windows host machine's LAN IP:

```powershell
$env:PI_BRIDGE_HOST="0.0.0.0"
npm run bridge
```

Set the Expo environment variable before building:

```powershell
$env:EXPO_PUBLIC_BRIDGE_URL="http://192.168.0.110:31415"
npm run android
```

The app reads this at build time. When unset, the emulator default `http://10.0.2.2:31415` is used.

## RPC Mode (persistent Pi process)

The bridge server now uses `pi --mode rpc` instead of spawning a new `pi --mode text`
process per request. This means:

- One persistent Pi CLI process starts at server boot
- Chat prompts are sent as JSON-RPC commands over stdin/stdout
- Responses stream in real time with no cold-start penalty
- Typical response time drops from 15–30s to 2–8s

If the Pi RPC process crashes, the server automatically restarts it within 2 seconds.
In-flight requests during a crash will receive a 502 error; retry the message.

## Windows Firewall — allow inbound port 31415

For physical phone testing over LAN WiFi, Windows Firewall must allow inbound
TCP traffic on port 31415.

**Check if port is reachable (from another machine on LAN):**

```powershell
Test-NetConnection -ComputerName <HOST-LAN-IP> -Port 31415
```

Expected: `TcpTestSucceeded : True`

**If blocked, add a firewall rule:**

Run PowerShell as Administrator:

```powershell
New-NetFirewallRule -DisplayName "Nen Shell Pi Bridge" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 31415 `
  -Action Allow `
  -Profile Private
```

**Verify the rule exists:**

```powershell
Get-NetFirewallRule -DisplayName "Nen Shell Pi Bridge" | Format-Table Name, Enabled, Direction, Action
```

**Check your LAN IP:**

```powershell
ipconfig | Select-String "IPv4"
```

Use the result (e.g., `192.168.0.110`) as the bridge URL on the physical phone.

## Run the Android app

Terminal 2:

```powershell
cd C:\Users\doner\nen-shell
npm run android
```

If Metro port `8081` is busy:

```powershell
npx expo start --android --port 8082
```

## What `/agent/message` does

`POST /agent/message` sends the user message to a persistent Pi CLI process running in `--mode rpc`. Prompts are sent as JSONL (`{"type":"prompt","message":"..."}`) over stdin, and the Pi CLI streams text deltas back over stdout. The bridge accumulates all `text_delta` events and returns the final text as `reply.text` when the `agent_end` event arrives.

Default Pi invocation uses DeepSeek V4 Flash with thinking disabled (for fast mobile responses) and tools enabled:

```text
pi --provider deepseek --model deepseek-v4-flash --mode rpc --thinking off --no-session
```

Prompts are delivered via stdin JSONL, not via the `-p` argument. The single persistent process keeps the Pi CLI Node.js runtime warm, eliminating the 15–20s cold-start penalty of spawning a new process per request.

The bridge server does **not** use `mockPiBridge` and does **not** fake success. If Pi fails, times out, returns empty output, or the bridge is busy, the server returns a non-2xx JSON error.

Optional environment overrides:

```powershell
$env:PI_BRIDGE_PI_PROVIDER="deepseek"
$env:PI_BRIDGE_PI_MODEL="deepseek-v4-flash"
$env:PI_BRIDGE_THINKING="off"   # off | minimal | low | medium | high | xhigh
$env:PI_BRIDGE_TIMEOUT_MS="120000"
$env:PI_BRIDGE_MAX_CONCURRENT="1"
```

To re-enable reasoning/thinking for complex prompts, set `PI_BRIDGE_THINKING` to `high` or any level above `off`.

## Model switching (runtime)

The bridge supports per-request model selection via the request body. The app sends `model` and optional `provider` fields, and the bridge sends a `set_model` RPC command to Pi before the prompt:

```json
{
  "message": "Summarize what needs my attention.",
  "model": "gpt-4o",
  "provider": "openai"
}
```

If the requested model differs from the currently active one, the bridge switches models via the Pi RPC `set_model` command before sending the prompt. If `model` is omitted, the bridge uses the default configured via `PI_BRIDGE_PI_PROVIDER` and `PI_BRIDGE_PI_MODEL`.

## Tool enablement (tools ON by default)

Tools (`read`, `bash`, `edit`, `write`, `grep`, `find`, `web_search`, `web_fetch`) are **enabled by default**. Extensions, skills, prompt templates, themes, and context files are also enabled by default.

To disable any category, set the corresponding `PI_BRIDGE_DISABLE_*` environment variable to `1`:

```powershell
$env:PI_BRIDGE_DISABLE_TOOLS="1"
$env:PI_BRIDGE_DISABLE_EXTENSIONS="1"
$env:PI_BRIDGE_DISABLE_SKILLS="1"
$env:PI_BRIDGE_DISABLE_PROMPT_TEMPLATES="1"
$env:PI_BRIDGE_DISABLE_THEMES="1"
$env:PI_BRIDGE_DISABLE_CONTEXT_FILES="1"
```

> **Deprecated:** The old `PI_BRIDGE_ALLOW_*` variables are still honored for backward compatibility. If `PI_BRIDGE_ALLOW_TOOLS=1` is set, tools are enabled regardless of `PI_BRIDGE_DISABLE_TOOLS`. Prefer `PI_BRIDGE_DISABLE_*` for new configurations.

## Endpoints

- `GET /health`
- `POST /agent/message`
- `GET /agent/tasks`
- `POST /agent/approve`
- `POST /agent/reject`
- `GET /agent/audit`
- `GET /scheduler/jobs`

Approval/rejection endpoints currently record local audit only. They do not perform external side effects.

## Minimal chat request

```http
POST /agent/message
Content-Type: application/json

{
  "message": "Summarize what needs my attention.",
  "context": {}
}
```

## Minimal chat response

```json
{
  "reply": {
    "id": "reply_...",
    "role": "assistant",
    "text": "Pi CLI output appears here.",
    "summary": "Pi CLI output appears here.",
    "created_at": "2026-04-29T14:38:16.618Z",
    "createdAt": "2026-04-29T14:38:16.618Z"
  },
  "suggestedActions": [],
  "auditEntries": [
    {
      "id": "audit_...",
      "category": "summary",
      "title": "Pi CLI invoked",
      "detail": "pi -p completed in 4074ms with safe defaults enabled.",
      "source": "Pi Code",
      "createdAt": "2026-04-29T14:38:16.618Z"
    }
  ]
}
```

## Validation

Typecheck:

```powershell
npm run typecheck
```

Direct Pi CLI smoke:

```powershell
pi --provider deepseek --model deepseek-v4-flash --no-tools --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files --thinking off --no-session -p "Reply with exactly: pi-cli-live"
```

Host health:

```powershell
curl http://127.0.0.1:31415/health
```

Host chat smoke proving real Pi output, not mock fallback:

```powershell
curl -X POST http://127.0.0.1:31415/agent/message `
  -H "Content-Type: application/json" `
  -d '{"message":"Reply with exactly: nen-shell-bridge-live","context":{}}'
```

Expected: HTTP 200 JSON where `reply.text` contains `nen-shell-bridge-live` and `auditEntries[0].title` is `Pi CLI invoked`.

Bad-input behavior should be non-2xx, not mock output:

```powershell
curl -i -X POST http://127.0.0.1:31415/agent/message `
  -H "Content-Type: application/json" `
  -d '{"message":""}'
```

Expected: HTTP 400 JSON error.

Emulator reachability while `npm run bridge` is running:

```powershell
adb devices
adb shell "nc -z 10.0.2.2 31415 >/dev/null 2>&1; echo nc_exit:$?"
```

Expected on images with `nc`: `nc_exit:0`.

If the emulator image lacks `nc`, use any available emulator HTTP tool or validate by opening the app and sending a chat message. The app's offline fallback can mask bridge failures, so direct host `curl` is the authoritative no-mock proof.
