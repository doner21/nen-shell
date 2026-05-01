# Nen Shell

**A calm, mobile-first agentic phone shell powered by Pi Code.**

Nen Shell is a standalone Android app that wraps the Pi Code AI agent in a quiet, scrollable interface. It runs entirely on your phone — no desktop, no USB, no cloud backend. The Pi Code agent runs in Termux; Nen Shell talks to it over localhost.

---

## Architecture

```
[Your Android Phone]
  │
  ├── Termux
  │     └── Pi Code bridge server (127.0.0.1:31415)
  │           └── DeepSeek V4 / other providers
  │
  └── Nen Shell APK
        └── fetch("http://127.0.0.1:31415") → Pi Code agent
```

Everything stays on-device. The only external call is Pi Code hitting the LLM API (DeepSeek, OpenAI, etc.) over your phone's internet connection.

---

## Prerequisites

- **Android phone** (API 24+)
- **[Termux](https://f-droid.org/packages/com.termux/)** installed (F-Droid version, not Play Store)
- **[Pi Code](https://github.com/mariozechner/pi-coding-agent)** installed in Termux via npm
- **An LLM API key** (DeepSeek, OpenAI, Anthropic, or Google)

---

## Step 1 — Install Pi Code in Termux

```bash
# In Termux:
pkg update && pkg upgrade
pkg install nodejs git
npm install -g @mariozechner/pi-coding-agent
```

## Step 2 — Add your API key

```bash
mkdir -p ~/.pi/agent
nano ~/.pi/agent/auth.json
```

Example for DeepSeek:

```json
{
  "deepseek": {
    "type": "api_key",
    "key": "sk-your-deepseek-key-here"
  }
}
```

## Step 3 — Install the bridge server

Push `server.cjs` to your phone:

```bash
# On desktop (with phone connected via USB):
adb push tools/pi-bridge-server/server.cjs /data/local/tmp/pi-bridge-server.cjs
```

In Termux:

```bash
cp /data/local/tmp/pi-bridge-server.cjs ~/pi-bridge-server.cjs
```

## Step 4 — Start the bridge

```bash
# In Termux:
PI_BRIDGE_PI_CLI_JS=/data/data/com.termux/files/usr/lib/node_modules/@mariozechner/pi-coding-agent/dist/cli.js \
PI_BRIDGE_PI_PROVIDER=deepseek \
PI_BRIDGE_PI_MODEL=deepseek-v4-flash \
node ~/pi-bridge-server.cjs
```

You should see:

```
[pi-bridge] Listening on http://127.0.0.1:31415
[pi-bridge] Pi RPC process connected and ready
```

Leave this running.

## Step 5 — Install Nen Shell

Download the latest APK from [Releases](https://github.com/doner21/nen-shell/releases) and install it:

```bash
adb install app-release.apk
```

Or transfer the APK to your phone and tap to install. Enable "Install from unknown sources" if prompted.

## Step 6 — Use it

1. Make sure the bridge server is running in Termux
2. Open **Nen Shell** from your app drawer
3. Type a message and tap Send
4. Pi Code responds with full agent capabilities (tool calling, file access, reasoning)
5. Conversation history persists across messages within the same session
6. Long-press any AI reply to select and copy text

### Tips

- **Safe Mode** is ON by default — blocks risky operations (sends, file changes, system changes). Toggle it off for full agency.
- **Conversation** scrolls automatically. Tap the Tasks tab to approve/reject suggested actions.
- **File writes** — Pi Code can write files to the app's sandboxed document directory.
- The bridge must stay running in Termux while you use Nen Shell. If you close Termux, restart the bridge.

---

## Build from source

```bash
git clone https://github.com/doner21/nen-shell.git
cd nen-shell
npm install
cp .env.example .env   # add your EXPO_PUBLIC_DEEPSEEK_API_KEY
npm run typecheck
cd android && ./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

---

## Features

- Scrollable conversation view with distinct user/assistant bubbles
- Selectable assistant text for copy/paste
- Session context maintained across messages
- Safe Mode + permission broker
- Approval queue for suggested actions
- Audit log
- On-device Pi Code bridge (no desktop dependency)

---

## License

MIT
