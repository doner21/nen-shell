#!/usr/bin/env node
'use strict';

const http = require('node:http');
const { spawn } = require('node:child_process');
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
  piProvider: process.env.PI_BRIDGE_PI_PROVIDER || 'google-gemini-cli',
  piModel: process.env.PI_BRIDGE_PI_MODEL || 'gemini-2.5-flash',
  timeoutMs: Number.parseInt(process.env.PI_BRIDGE_TIMEOUT_MS || '120000', 10),
  maxBodyBytes: Number.parseInt(process.env.PI_BRIDGE_MAX_BODY_BYTES || '65536', 10),
  maxConcurrent: Number.parseInt(process.env.PI_BRIDGE_MAX_CONCURRENT || '1', 10),
  systemPrompt: process.env.PI_BRIDGE_SYSTEM_PROMPT || '',
};

const auditEntries = [];
let activePiCalls = 0;

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

const jsonError = (res, statusCode, code, message, details = {}) =>
  json(res, statusCode, {
    error: {
      code,
      message,
      ...details,
    },
  });

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

const buildPiArgs = (prompt) => {
  const args = [];

  if (!process.env.PI_BRIDGE_PI_COMMAND) {
    args.push(config.piCliJs);
  }

  args.push('--mode', 'text');

  if (config.piProvider) {
    args.push('--provider', config.piProvider);
  }
  if (config.piModel) {
    args.push('--model', config.piModel);
  }

  if (process.env.PI_BRIDGE_ALLOW_TOOLS !== '1') {
    args.push('--no-tools');
  }
  if (process.env.PI_BRIDGE_ALLOW_EXTENSIONS !== '1') {
    args.push('--no-extensions');
  }
  if (process.env.PI_BRIDGE_ALLOW_SKILLS !== '1') {
    args.push('--no-skills');
  }
  if (process.env.PI_BRIDGE_ALLOW_PROMPT_TEMPLATES !== '1') {
    args.push('--no-prompt-templates');
  }
  if (process.env.PI_BRIDGE_ALLOW_THEMES !== '1') {
    args.push('--no-themes');
  }
  if (process.env.PI_BRIDGE_ALLOW_CONTEXT_FILES !== '1') {
    args.push('--no-context-files');
  }

  args.push('--no-session', ...parseExtraArgs(), '-p', prompt);
  return args;
};

const invokePi = (message, context) =>
  new Promise((resolve, reject) => {
    const started = Date.now();
    const prompt = buildPrompt(message, context);
    const args = buildPiArgs(prompt);
    const child = spawn(config.piCommand, args, {
      cwd: repoRoot,
      shell: false,
      windowsHide: true,
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
    }, config.timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    child.on('error', (error) => {
      clearTimeout(timer);
      reject({
        kind: 'spawn_error',
        message: error.message,
        durationMs: Date.now() - started,
        stdout: clip(stdout),
        stderr: clip(stderr),
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);
      const durationMs = Date.now() - started;
      const text = stdout.trim();

      if (timedOut) {
        reject({
          kind: 'timeout',
          message: `Pi CLI timed out after ${config.timeoutMs}ms`,
          durationMs,
          stdout: clip(stdout),
          stderr: clip(stderr),
        });
        return;
      }

      if (code !== 0) {
        reject({
          kind: 'pi_failed',
          message: `Pi CLI exited with code ${code}${signal ? ` signal ${signal}` : ''}`,
          durationMs,
          exitCode: code,
          signal,
          stdout: clip(stdout),
          stderr: clip(stderr),
        });
        return;
      }

      if (!text) {
        reject({
          kind: 'empty_output',
          message: 'Pi CLI completed but returned empty stdout',
          durationMs,
          stdout: '',
          stderr: clip(stderr),
        });
        return;
      }

      resolve({ text, stderr: clip(stderr), durationMs });
    });
  });

const handleHealth = (req, res) => {
  json(res, 200, {
    status: 'degraded',
    transport: 'http',
    endpointBase: `http://${config.host}:${config.port}`,
    checkedAt: nowIso(),
    latencyMs: 0,
    piCommand: config.piCommand,
    piCliJs: process.env.PI_BRIDGE_PI_COMMAND ? undefined : config.piCliJs,
    piProvider: config.piProvider,
    piModel: config.piModel,
    safeDefaults: {
      toolsDisabled: process.env.PI_BRIDGE_ALLOW_TOOLS !== '1',
      extensionsDisabled: process.env.PI_BRIDGE_ALLOW_EXTENSIONS !== '1',
      skillsDisabled: process.env.PI_BRIDGE_ALLOW_SKILLS !== '1',
      contextFilesDisabled: process.env.PI_BRIDGE_ALLOW_CONTEXT_FILES !== '1',
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

  activePiCalls += 1;
  try {
    const result = await invokePi(cleanMessage, body.context);
    const createdAt = nowIso();
    const audit = pushAudit({
      id: makeId('audit'),
      category: 'summary',
      title: 'Pi CLI invoked',
      detail: `pi -p completed in ${result.durationMs}ms with safe defaults ${process.env.PI_BRIDGE_ALLOW_TOOLS === '1' ? 'partly overridden' : 'enabled'}.`,
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
        provider: config.piProvider,
        model: config.piModel,
      },
    });
  } catch (error) {
    const createdAt = nowIso();
    pushAudit({
      id: makeId('audit'),
      category: 'failure',
      title: 'Pi CLI failed',
      detail: error.message || 'Pi CLI invocation failed.',
      source: 'Pi Code',
      createdAt,
    });

    const status = error.kind === 'timeout' ? 504 : error.kind === 'empty_output' ? 502 : 502;
    jsonError(res, status, error.kind || 'pi_failed', error.message || 'Pi CLI invocation failed', {
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

server.listen(config.port, config.host, () => {
  console.log(`[pi-bridge] Listening on http://${config.host}:${config.port}`);
  console.log(`[pi-bridge] Repo root: ${repoRoot}`);
  console.log(
    `[pi-bridge] Pi command: ${config.piCommand}${process.env.PI_BRIDGE_PI_COMMAND ? '' : ` ${config.piCliJs}`} --provider ${config.piProvider} --model ${config.piModel}`,
  );
  console.log('[pi-bridge] Safe defaults enabled. Set PI_BRIDGE_ALLOW_TOOLS=1 only if you explicitly want phone prompts to use Pi tools.');
});
