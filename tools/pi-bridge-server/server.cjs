#!/usr/bin/env node
'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');
const { StringDecoder } = require('node:string_decoder');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const repoRoot = path.resolve(__dirname, '..', '..');

const defaultPiCliJs = path.join(
  process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming'),
  'npm',
  'node_modules',
  '@mariozechner',
  'pi-coding-agent',
  'dist',
  'cli.js',
);

const config = {
  host: process.env.PI_BRIDGE_HOST || '127.0.0.1',
  port: Number.parseInt(process.env.PI_BRIDGE_PORT || '31415', 10),
  piCommand: process.env.PI_BRIDGE_PI_COMMAND || process.execPath,
  piCliJs: process.env.PI_BRIDGE_PI_CLI_JS || defaultPiCliJs,
  piProvider: process.env.PI_BRIDGE_PI_PROVIDER || 'deepseek',
  piModel: process.env.PI_BRIDGE_PI_MODEL || 'deepseek-v4-flash',
  timeoutMs: Number.parseInt(process.env.PI_BRIDGE_TIMEOUT_MS || '120000', 10),
  maxBodyBytes: Number.parseInt(process.env.PI_BRIDGE_MAX_BODY_BYTES || '65536', 10),
  maxConcurrent: Number.parseInt(process.env.PI_BRIDGE_MAX_CONCURRENT || '1', 10),
  systemPrompt: process.env.PI_BRIDGE_SYSTEM_PROMPT || '',
};

const auditEntries = [];
let activePiCalls = 0;

// --- Persistent Pi RPC process state ---
let piProc = null;               // child_process handle
let piProcReady = false;         // true after process spawned and ready
let currentRequest = null;       // { resolve, reject, fullText, timer, started }
let piReadyResolve = null;       // resolves when piProcReady becomes true
let currentModel = null;         // currently active { provider, modelId }

const nowIso = () => new Date().toISOString();
const makeId = (prefix) => `${prefix}_${randomUUID()}`;

const clip = (text, max = 4000) => {
  const clean = String(text || '').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
};

const summarize = (text) => {
  const firstLine = String(text || '').replace(/\s+/g, ' ').trim();
  return clip(firstLine || 'Pi Code response', 180);
};

const pushAudit = (entry) => {
  auditEntries.unshift(entry);
  if (auditEntries.length > 100) {
    auditEntries.length = 100;
  }
  return entry;
};

const json = (res, statusCode, payload, headers = {}) => {
  const body = JSON.stringify(payload, null, 2);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    ...headers,
  });
  res.end(body);
};

const jsonError = (res, statusCode, code, message, details = {}, headers = {}) =>
  json(
    res,
    statusCode,
    {
      error: {
        code,
        message,
        ...details,
      },
    },
    headers,
  );

const readJsonBody = (req) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];

    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > config.maxBodyBytes) {
        reject(Object.assign(new Error('Request body too large'), { statusCode: 413, code: 'body_too_large' }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8').trim();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { statusCode: 400, code: 'invalid_json' }));
      }
    });

    req.on('error', reject);
  });

const parseExtraArgs = () => {
  const raw = process.env.PI_BRIDGE_EXTRA_PI_ARGS_JSON;
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed;
    }
  } catch {
    // Fall through to safe default.
  }

  console.warn('[pi-bridge] Ignoring PI_BRIDGE_EXTRA_PI_ARGS_JSON because it is not a JSON string array.');
  return [];
};

const buildPrompt = (message, context) => {
  const parts = [];
  if (config.systemPrompt.trim()) {
    parts.push(config.systemPrompt.trim());
  }
  if (context && typeof context === 'object' && Object.keys(context).length > 0) {
    parts.push(`Nen Shell context JSON:\n${JSON.stringify(context, null, 2)}`);
  }
  parts.push(String(message));
  return parts.join('\n\n');
};

// ---------------------------------------------------------------------------
// JSONL reader (LF-delimited only — NOT Node readline)
// ---------------------------------------------------------------------------

const attachJsonlReader = (stream, onLine) => {
  const decoder = new StringDecoder('utf8');
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += typeof chunk === 'string' ? chunk : decoder.write(chunk);
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, newlineIndex);
      buffer = buffer.slice(newlineIndex + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (line.length > 0) onLine(line);
    }
  });

  stream.on('end', () => {
    buffer += decoder.end();
    if (buffer.length > 0) {
      let line = buffer.endsWith('\r') ? buffer.slice(0, -1) : buffer;
      if (line.length > 0) onLine(line);
    }
  });
};

// ---------------------------------------------------------------------------
// Persistent Pi RPC process lifecycle
// ---------------------------------------------------------------------------

const startPiRpc = () => {
  if (piProc) return;

  const rpcArgs = [];
  if (!process.env.PI_BRIDGE_PI_COMMAND) rpcArgs.push(config.piCliJs);
  rpcArgs.push('--mode', 'rpc');

  if (config.piProvider) {
    rpcArgs.push('--provider', config.piProvider);
  }
  if (config.piModel) {
    rpcArgs.push('--model', config.piModel);
  }

  // Tools are enabled by default. Set PI_BRIDGE_DISABLE_*=1 to opt out.
  if (process.env.PI_BRIDGE_DISABLE_TOOLS === '1') {
    rpcArgs.push('--no-tools');
  }
  if (process.env.PI_BRIDGE_DISABLE_EXTENSIONS === '1') {
    rpcArgs.push('--no-extensions');
  }
  if (process.env.PI_BRIDGE_DISABLE_SKILLS === '1') {
    rpcArgs.push('--no-skills');
  }
  if (process.env.PI_BRIDGE_DISABLE_PROMPT_TEMPLATES === '1') {
    rpcArgs.push('--no-prompt-templates');
  }
  if (process.env.PI_BRIDGE_DISABLE_THEMES === '1') {
    rpcArgs.push('--no-themes');
  }
  if (process.env.PI_BRIDGE_DISABLE_CONTEXT_FILES === '1') {
    rpcArgs.push('--no-context-files');
  }
  // Backward compatibility: old PI_BRIDGE_ALLOW_* vars also honored.
  // If ALLOW_ is explicitly '1', DISABLE_ has no effect for that flag.
  if (process.env.PI_BRIDGE_ALLOW_TOOLS === '1') {
    // explicitly allowed — remove --no-tools if DISABLE_ added it
    const idx = rpcArgs.indexOf('--no-tools');
    if (idx !== -1) rpcArgs.splice(idx, 1);
  }

  // Default to thinking off to avoid long silent reasoning phases on mobile.
  // Override with PI_BRIDGE_THINKING=high (or any level) to re-enable.
  const thinkingLevel = process.env.PI_BRIDGE_THINKING || 'off';
  rpcArgs.push('--thinking', thinkingLevel);

  rpcArgs.push('--no-session', ...parseExtraArgs());

  console.log(`[pi-bridge] Starting Pi RPC process: ${config.piCommand} ${rpcArgs.join(' ')}`);

  // Track the initial model for the new process
  currentModel = { provider: config.piProvider, modelId: config.piModel };

  // Create a new ready promise for ensurePiRpc()
  const readyPromise = new Promise((resolve) => {
    piReadyResolve = resolve;
  });

  const child = spawn(config.piCommand, rpcArgs, {
    cwd: repoRoot,
    shell: false,
    windowsHide: true,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  piProc = child;

  // --- JSONL handler for stdout ---
  attachJsonlReader(child.stdout, (line) => {
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      console.error('[pi-bridge] Failed to parse RPC event:', line.slice(0, 200));
      return;
    }

    // Signal readiness on first valid JSON line received
    if (!piProcReady) {
      piProcReady = true;
      if (piReadyResolve) {
        piReadyResolve();
        piReadyResolve = null;
      }
      console.log('[pi-bridge] Pi RPC process connected and ready');
    }

    // Route to current request if one is active
    if (currentRequest) {
      // Reject on error response for the prompt command
      if (event.type === 'response' && event.command === 'prompt' && event.success === false) {
        currentRequest.reject({
          kind: 'rpc_error',
          message: event.error || 'Pi RPC rejected the prompt',
          durationMs: Date.now() - currentRequest.started,
        });
        currentRequest = null;
        return;
      }

      // Accumulate text deltas
      if (
        event.type === 'message_update' &&
        event.assistantMessageEvent &&
        event.assistantMessageEvent.type === 'text_delta'
      ) {
        currentRequest.fullText += event.assistantMessageEvent.delta;
      }

      // agent_end — resolve with accumulated text
      if (event.type === 'agent_end') {
        if (currentRequest.timer) clearTimeout(currentRequest.timer);
        const durationMs = Date.now() - currentRequest.started;
        const text = currentRequest.fullText.trim();
        currentRequest.resolve({ text, stderr: '', durationMs });
        currentRequest = null;
      }
    }
  });

  // --- stderr passthrough for diagnostics ---
  child.stderr.on('data', (chunk) => {
    console.error(`[pi-bridge] Pi RPC stderr: ${chunk.toString('utf8').trim()}`);
  });

  // --- Process crash / exit ---
  child.on('error', (err) => {
    console.error(`[pi-bridge] Pi RPC process error: ${err.message}`);
    // handled by 'close' event
  });

  child.on('close', (code, signal) => {
    console.error(`[pi-bridge] Pi RPC process exited (code=${code}, signal=${signal})`);
    piProc = null;
    piProcReady = false;
    piReadyResolve = null;
    currentModel = null;

    if (currentRequest) {
      currentRequest.reject({
        kind: 'rpc_crashed',
        message: `Pi RPC process exited during request (code=${code}, signal=${signal})`,
        durationMs: Date.now() - currentRequest.started,
      });
      currentRequest = null;
    }

    setTimeout(() => {
      console.log('[pi-bridge] Restarting Pi RPC process...');
      startPiRpc();
    }, 2000);
  });
};

const ensurePiRpc = () => {
  // Pi RPC mode does not emit any output on stdout until a prompt is sent.
  // We cannot wait for the first JSON event as a "ready" signal — that would deadlock.
  // Instead, we simply ensure the process is spawned and its stdio pipes are open.
  if (!piProc) {
    startPiRpc();
  }

  // Return a promise that resolves when the process is spawned (or fails fast).
  return new Promise((resolve, reject) => {
    const check = () => {
      if (piProc) {
        resolve();
        return;
      }
      // If the process failed to spawn and was cleaned up, treat as error.
      // piProc is set to null in the 'close' handler, so after 2s without a
      // process we consider the spawn failed.
      setTimeout(() => {
        if (!piProc) {
          reject(new Error('Pi RPC process failed to start'));
        } else {
          resolve();
        }
      }, 2000);
    };
    check();
  });
};

// ---------------------------------------------------------------------------
// invokePi — uses persistent RPC process (no spawn-per-request)
// ---------------------------------------------------------------------------

const invokePi = (message, context, requestedModel, requestedProvider) =>
  new Promise((resolve, reject) => {
    ensurePiRpc()
      .then(() => {
        const started = Date.now();
        const prompt = buildPrompt(message, context);

        // Determine if model switch is needed
        const effectiveProvider = requestedProvider || config.piProvider || 'deepseek';
        const effectiveModel = requestedModel || config.piModel || 'deepseek-v4-flash';
        const needsModelSwitch =
          (!currentModel || currentModel.provider !== effectiveProvider || currentModel.modelId !== effectiveModel);

        currentRequest = {
          resolve,
          reject,
          fullText: '',
          timer: null,
          started,
        };

        // Send the request (with optional set_model first)
        const sendRequest = () => {
          // Set timeout — abort the prompt but keep the RPC process alive
          currentRequest.timer = setTimeout(() => {
            if (currentRequest) {
              // Send abort to Pi process
              try {
                piProc.stdin.write(JSON.stringify({ type: 'abort' }) + '\n');
              } catch {
                // stdin may be closed
              }
              const req = currentRequest;
              currentRequest = null;
              req.reject({
                kind: 'timeout',
                message: `Pi RPC timed out after ${config.timeoutMs}ms`,
                durationMs: Date.now() - started,
                stdout: clip(req.fullText),
                stderr: '',
              });
            }
          }, config.timeoutMs);

          // Write the prompt as JSONL to Pi stdin
          try {
            piProc.stdin.write(JSON.stringify({ type: 'prompt', message: prompt }) + '\n');
          } catch (err) {
            clearTimeout(currentRequest.timer);
            currentRequest = null;
            reject({
              kind: 'spawn_error',
              message: `Failed to write to Pi RPC stdin: ${err.message}`,
              durationMs: Date.now() - started,
              stdout: '',
              stderr: '',
            });
          }
        };

        if (needsModelSwitch) {
          // Send set_model before the prompt
          try {
            piProc.stdin.write(
              JSON.stringify({ type: 'set_model', provider: effectiveProvider, modelId: effectiveModel }) + '\n',
            );
            currentModel = { provider: effectiveProvider, modelId: effectiveModel };
            console.log(`[pi-bridge] Switched model to ${effectiveProvider}/${effectiveModel}`);
            // Give Pi a moment to process the model switch, then send the prompt
            setTimeout(sendRequest, 50);
          } catch (err) {
            clearTimeout(currentRequest.timer);
            currentRequest = null;
            currentModel = null;
            reject({
              kind: 'spawn_error',
              message: `Failed to write set_model to Pi RPC stdin: ${err.message}`,
              durationMs: Date.now() - started,
              stdout: '',
              stderr: '',
            });
          }
        } else {
          sendRequest();
        }
      })
      .catch((err) => {
        reject({
          kind: 'rpc_not_ready',
          message: err.message || 'Pi RPC process not ready',
          durationMs: 0,
          stdout: '',
          stderr: '',
        });
      });
  });

// ---------------------------------------------------------------------------
// Route handlers
// ---------------------------------------------------------------------------

const handleHealth = (req, res) => {
  json(res, 200, {
    status: piProcReady ? 'degraded' : 'degraded',
    transport: 'http',
    mode: 'rpc',
    piProcReady,
    endpointBase: `http://${config.host}:${config.port}`,
    checkedAt: nowIso(),
    latencyMs: 0,
    piCommand: config.piCommand,
    piCliJs: process.env.PI_BRIDGE_PI_COMMAND ? undefined : config.piCliJs,
    piProvider: config.piProvider,
    piModel: config.piModel,
    currentModel: currentModel ? `${currentModel.provider}/${currentModel.modelId}` : `${config.piProvider}/${config.piModel}`,
    safeDefaults: {
      toolsDisabled: process.env.PI_BRIDGE_ALLOW_TOOLS === '1' ? false : process.env.PI_BRIDGE_DISABLE_TOOLS === '1',
      extensionsDisabled: process.env.PI_BRIDGE_ALLOW_EXTENSIONS === '1' ? false : process.env.PI_BRIDGE_DISABLE_EXTENSIONS === '1',
      skillsDisabled: process.env.PI_BRIDGE_ALLOW_SKILLS === '1' ? false : process.env.PI_BRIDGE_DISABLE_SKILLS === '1',
      promptTemplatesDisabled: process.env.PI_BRIDGE_ALLOW_PROMPT_TEMPLATES === '1' ? false : process.env.PI_BRIDGE_DISABLE_PROMPT_TEMPLATES === '1',
      themesDisabled: process.env.PI_BRIDGE_ALLOW_THEMES === '1' ? false : process.env.PI_BRIDGE_DISABLE_THEMES === '1',
      contextFilesDisabled: process.env.PI_BRIDGE_ALLOW_CONTEXT_FILES === '1' ? false : process.env.PI_BRIDGE_DISABLE_CONTEXT_FILES === '1',
      sessionDisabled: true,
    },
    activePiCalls,
    maxConcurrent: config.maxConcurrent,
  });
};

const handleAgentMessage = async (req, res) => {
  let body;
  try {
    body = await readJsonBody(req);
  } catch (error) {
    jsonError(res, error.statusCode || 400, error.code || 'bad_request', error.message);
    return;
  }

  const message = typeof body.message === 'string' ? body.message : typeof body.text === 'string' ? body.text : '';
  const cleanMessage = message.trim();

  if (!cleanMessage) {
    jsonError(res, 400, 'bad_request', 'message is required');
    return;
  }

  if (activePiCalls >= config.maxConcurrent) {
    jsonError(res, 429, 'bridge_busy', 'Pi bridge is already processing a message. Try again shortly.', {
      activePiCalls,
      maxConcurrent: config.maxConcurrent,
    });
    return;
  }

  // Extract optional model/provider preference from request body
  const requestedModel = typeof body.model === 'string' ? body.model : undefined;
  const requestedProvider = typeof body.provider === 'string' ? body.provider : undefined;

  activePiCalls += 1;
  try {
    const result = await invokePi(cleanMessage, body.context, requestedModel, requestedProvider);
    const createdAt = nowIso();
    const currentModelLabel = currentModel ? `${currentModel.provider}/${currentModel.modelId}` : `${config.piProvider}/${config.piModel}`;
    const audit = pushAudit({
      id: makeId('audit'),
      category: 'summary',
      title: 'Pi RPC invoked',
      detail: `pi --mode rpc completed in ${result.durationMs}ms (model: ${currentModelLabel}).`,
      source: 'Pi Code',
      createdAt,
    });

    json(res, 200, {
      reply: {
        id: makeId('reply'),
        role: 'assistant',
        text: result.text,
        summary: summarize(result.text),
        created_at: createdAt,
        createdAt,
      },
      suggestedActions: [],
      auditEntries: [audit],
      diagnostics: {
        durationMs: result.durationMs,
        stderr: result.stderr,
        provider: currentModel ? currentModel.provider : config.piProvider,
        model: currentModel ? currentModel.modelId : config.piModel,
        mode: 'rpc',
      },
    });
  } catch (error) {
    const createdAt = nowIso();
    pushAudit({
      id: makeId('audit'),
      category: 'failure',
      title: 'Pi RPC failed',
      detail: error.message || 'Pi RPC invocation failed.',
      source: 'Pi Code',
      createdAt,
    });

    const status = error.kind === 'timeout' ? 504 : error.kind === 'empty_output' ? 502 : error.kind === 'rpc_crashed' ? 502 : 502;
    jsonError(res, status, error.kind || 'pi_failed', error.message || 'Pi RPC invocation failed', {
      durationMs: error.durationMs,
      exitCode: error.exitCode,
      signal: error.signal,
      stdout: error.stdout,
      stderr: error.stderr,
    });
  } finally {
    activePiCalls -= 1;
  }
};

const handleTasks = (req, res) => {
  json(res, 200, { tasks: [] });
};

const readTaskId = async (req) => {
  try {
    const body = await readJsonBody(req);
    return typeof body.taskId === 'string' ? body.taskId : typeof body.id === 'string' ? body.id : 'unknown';
  } catch {
    return 'unknown';
  }
};

const handleDecision = async (req, res, status) => {
  const taskId = await readTaskId(req);
  const createdAt = nowIso();
  pushAudit({
    id: makeId('audit'),
    category: status === 'approved' ? 'approval' : 'rejection',
    title: status === 'approved' ? 'Bridge approval recorded' : 'Bridge rejection recorded',
    detail: `Task ${taskId} was ${status} locally. No external side effect was executed by the bridge server.`,
    source: 'Pi Code',
    createdAt,
  });

  json(res, 200, {
    taskId,
    status,
    message:
      status === 'approved'
        ? 'Bridge approval recorded locally. No external side effect was executed.'
        : 'Bridge rejection recorded locally. No external side effect was executed.',
  });
};

const handleAudit = (req, res) => {
  json(res, 200, { auditEntries });
};

const handleScheduler = (req, res) => {
  json(res, 200, {
    heartbeatAt: nowIso(),
    status: 'steady',
    jobs: [],
  });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || `${config.host}:${config.port}`}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    });
    res.end();
    return;
  }

  if (url.pathname === '/health') {
    if (req.method !== 'GET') {
      jsonError(res, 405, 'method_not_allowed', 'GET required', {}, { Allow: 'GET' });
      return;
    }
    handleHealth(req, res);
    return;
  }

  if (url.pathname === '/agent/message') {
    if (req.method !== 'POST') {
      jsonError(res, 405, 'method_not_allowed', 'POST required', {}, { Allow: 'POST' });
      return;
    }
    await handleAgentMessage(req, res);
    return;
  }

  if (url.pathname === '/agent/tasks') {
    if (req.method !== 'GET') {
      jsonError(res, 405, 'method_not_allowed', 'GET required', {}, { Allow: 'GET' });
      return;
    }
    handleTasks(req, res);
    return;
  }

  if (url.pathname === '/agent/approve') {
    if (req.method !== 'POST') {
      jsonError(res, 405, 'method_not_allowed', 'POST required', {}, { Allow: 'POST' });
      return;
    }
    await handleDecision(req, res, 'approved');
    return;
  }

  if (url.pathname === '/agent/reject') {
    if (req.method !== 'POST') {
      jsonError(res, 405, 'method_not_allowed', 'POST required', {}, { Allow: 'POST' });
      return;
    }
    await handleDecision(req, res, 'rejected');
    return;
  }

  if (url.pathname === '/agent/audit') {
    if (req.method !== 'GET') {
      jsonError(res, 405, 'method_not_allowed', 'GET required', {}, { Allow: 'GET' });
      return;
    }
    handleAudit(req, res);
    return;
  }

  if (url.pathname === '/scheduler/jobs') {
    if (req.method !== 'GET') {
      jsonError(res, 405, 'method_not_allowed', 'GET required', {}, { Allow: 'GET' });
      return;
    }
    handleScheduler(req, res);
    return;
  }

  jsonError(res, 404, 'not_found', `No bridge endpoint for ${url.pathname}`);
});

server.on('error', (error) => {
  console.error('[pi-bridge] Server error:', error);
  process.exitCode = 1;
});

// Start Pi RPC process before the HTTP server begins listening.
// This gives the persistent Pi process time to initialize while
// the HTTP server is coming up.
console.log('[pi-bridge] Starting Pi RPC process...');
startPiRpc();

server.listen(config.port, config.host, () => {
  console.log(`[pi-bridge] Listening on http://${config.host}:${config.port}`);
  console.log(`[pi-bridge] Repo root: ${repoRoot}`);
  console.log(
    `[pi-bridge] Pi command: ${config.piCommand}${process.env.PI_BRIDGE_PI_COMMAND ? '' : ` ${config.piCliJs}`} --mode rpc --provider ${config.piProvider} --model ${config.piModel} --thinking ${process.env.PI_BRIDGE_THINKING || 'off'}`,
  );
  console.log('[pi-bridge] Tools enabled. Set PI_BRIDGE_DISABLE_TOOLS=1 to disable.');
  console.log('[pi-bridge] Model switching via request body { model: "...", provider: "..." } is available.');
});
