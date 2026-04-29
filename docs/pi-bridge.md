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

Then configure the app/client URL to the host LAN IP, for example:

```text
http://192.168.0.110:31415
```

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

`POST /agent/message` invokes the installed Pi CLI in non-interactive print mode and returns Pi's stdout as `reply.text`.

Default Pi invocation is intentionally non-mutating:

```text
pi --provider google-gemini-cli --model gemini-2.5-flash --mode text \
  --no-tools --no-extensions --no-skills --no-prompt-templates --no-themes \
  --no-context-files --no-session -p <message>
```

The server executes this via Node using Pi's installed CLI JS path. It does **not** use `mockPiBridge` and it does **not** fake success. If Pi fails, times out, returns empty output, or the bridge is busy, the server returns a non-2xx JSON error.

Optional environment overrides:

```powershell
$env:PI_BRIDGE_PI_PROVIDER="google-gemini-cli"
$env:PI_BRIDGE_PI_MODEL="gemini-2.5-flash"
$env:PI_BRIDGE_TIMEOUT_MS="120000"
$env:PI_BRIDGE_MAX_CONCURRENT="1"
```

Unsafe opt-ins are disabled by default. Only enable these if you explicitly want phone-originated prompts to use Pi capabilities beyond plain chat:

```powershell
$env:PI_BRIDGE_ALLOW_TOOLS="1"
$env:PI_BRIDGE_ALLOW_EXTENSIONS="1"
$env:PI_BRIDGE_ALLOW_SKILLS="1"
$env:PI_BRIDGE_ALLOW_CONTEXT_FILES="1"
```

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
pi --provider google-gemini-cli --model gemini-2.5-flash --no-tools --no-extensions --no-skills --no-prompt-templates --no-themes --no-context-files --no-session -p "Reply with exactly: pi-cli-live"
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
