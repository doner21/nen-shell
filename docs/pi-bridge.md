# Pi Bridge client

Nen Shell now has an app-side HTTP bridge client at `src/bridge/httpPiBridge.ts`. It implements the existing `PiBridgeClient` contract and falls back to the mock bridge when the local server is offline, returns non-2xx responses, returns invalid JSON, or returns a malformed chat reply.

## Local URL

Default base URL:

```text
http://10.0.2.2:31415
```

Android emulator rule: `localhost` points to the emulator, so use `10.0.2.2` to reach a bridge process running on the Windows host.

Physical phone rule: use the Windows host machine's LAN IP instead, for example:

```text
http://192.168.0.110:31415
```

## Expected endpoints

- `GET /health`
- `POST /agent/message`
- `GET /agent/tasks`
- `POST /agent/approve`
- `POST /agent/reject`
- `GET /agent/audit`
- `GET /scheduler/jobs`

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
    "id": "reply_1",
    "role": "assistant",
    "text": "Here is the local Pi Code summary.",
    "summary": "Local Pi Code summary",
    "created_at": "2026-04-29T14:26:40.000Z",
    "createdAt": "2026-04-29T14:26:40.000Z"
  },
  "suggestedActions": [],
  "auditEntries": []
}
```

`reply.text` is required. Missing reply `id`, `summary`, `created_at`, or `createdAt` are filled by the client. Suggested actions are normalized and then enter the existing approval queue; Safe Mode and the permission broker still block risky send/file/system/root actions when a user attempts approval.

## Server status

This is only the app-side client. A real pycode / Pi Code HTTP server that implements these endpoints remains future work.
