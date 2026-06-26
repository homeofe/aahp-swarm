const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { URL } = require('node:url')

const HUB_ROOT = path.resolve(__dirname)
const PROJECT_ROOT = path.resolve(HUB_ROOT, '..')
const PUBLIC_DIR = path.join(HUB_ROOT, 'public')
const CONFIG_DIR = path.join(HUB_ROOT, '.local')
const CONFIG_PATH = path.join(CONFIG_DIR, 'hub-config.json')
const SECRETS_PATH = path.join(CONFIG_DIR, 'hub-secrets.json')

const DEFAULT_STEP_TEMPLATE = {
  id: '',
  title: '',
  enabled: true,
  provider: 'local', // local | cli-bridge | akido
  command: '',
  model: 'cli-claude/claude-sonnet-4-6',
  actionId: '',
  actionParams: '{}',
  timeoutMs: 120000,
  onFailure: 'continue', // continue | warn | stop
}

const DEFAULT_WORKFLOW_FALLBACK = {
  id: 'review-swarm',
  version: '0.2',
  mode: 'review',
  roles: ['scout', 'reviewer', 'tester', 'risk', 'verdict', 'handoff-manager'],
}

const DEFAULT_PROVIDER_CONFIG = {
  cliBridge: {
    enabled: true,
    baseUrl: 'http://127.0.0.1:31337',
    timeoutMs: 120000,
    defaultModel: 'cli-claude/claude-sonnet-4-6',
    apiKeyMode: 'none', // none | env | inline
    apiKeyEnv: 'CLI_BRIDGE_API_KEY',
  },
  akido: {
    enabled: false,
    baseUrl: 'http://127.0.0.1:3334',
    timeoutMs: 120000,
    apiKeyMode: 'none', // none | env | inline
    apiKeyEnv: 'AKIDO_MCP_API_KEY',
  },
}

const DEFAULT_CONFIG = {
  configVersion: 2,
  workspaceRoot: PROJECT_ROOT,
  activeProject: '',
  refreshSeconds: 15,
  showRawMarkdown: false,
  handoffDir: '.ai/handoff',
  swarmDir: '.ai/swarm',
  workflowId: 'review-swarm',
  providers: DEFAULT_PROVIDER_CONFIG,
  projectOverrides: {},
}

const DEFAULT_PROJECT_SETTINGS = {
  handoffDir: DEFAULT_CONFIG.handoffDir,
  swarmDir: DEFAULT_CONFIG.swarmDir,
  workflowId: DEFAULT_CONFIG.workflowId,
  steps: [],
}

function ensureDir(p) {
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true })
  }
}

function toText(v) {
  return v == null ? '' : String(v)
}

function readTextSafe(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
  } catch {
    return null
  }
}

function readJSONSafe(filePath, fallback = null) {
  try {
    const raw = readTextSafe(filePath)
    if (!raw) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeJSONSafe(filePath, value) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}

function toList(v, max = 5_000) {
  if (!Array.isArray(v)) return []
  return v.slice(0, max)
}

function normalizeBoolean(v, fallback) {
  if (typeof v === 'boolean') return v
  return fallback
}

function normalizeNumber(v, fallback) {
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function normalizeStep(value) {
  const command = toText(value?.command || '').trim()
  const title = toText(value?.title || value?.id || '').trim()
  const provider = toText(value?.provider || 'local')
  const id = toText(value?.id || '').trim()

  return {
    id: id,
    title: title || id,
    enabled: normalizeBoolean(value?.enabled, true),
    provider: provider === 'cli-bridge' || provider === 'akido' ? provider : 'local',
    command,
    model: toText(value?.model || DEFAULT_STEP_TEMPLATE.model),
    actionId: toText(value?.actionId || ''),
    actionParams: toText(value?.actionParams || '{}'),
    timeoutMs: Math.max(5000, normalizeNumber(value?.timeoutMs, DEFAULT_STEP_TEMPLATE.timeoutMs)),
    onFailure: value?.onFailure === 'warn' || value?.onFailure === 'stop' || value?.onFailure === 'continue' ? value.onFailure : 'continue',
  }
}

function normalizeProviderConfig(value = {}) {
  const getApiMode = (x) => {
    return x === 'env' || x === 'inline' || x === 'none' ? x : 'none'
  }

  const normalizeCliBridge = {
    enabled: normalizeBoolean(value.cliBridge?.enabled, DEFAULT_PROVIDER_CONFIG.cliBridge.enabled),
    baseUrl: toText(value.cliBridge?.baseUrl || DEFAULT_PROVIDER_CONFIG.cliBridge.baseUrl).trim(),
    timeoutMs: Math.max(1000, normalizeNumber(value.cliBridge?.timeoutMs, DEFAULT_PROVIDER_CONFIG.cliBridge.timeoutMs)),
    defaultModel: toText(value.cliBridge?.defaultModel || DEFAULT_PROVIDER_CONFIG.cliBridge.defaultModel).trim(),
    apiKeyMode: getApiMode(value.cliBridge?.apiKeyMode),
    apiKeyEnv: toText(value.cliBridge?.apiKeyEnv || DEFAULT_PROVIDER_CONFIG.cliBridge.apiKeyEnv).trim(),
  }

  const normalizeAkido = {
    enabled: normalizeBoolean(value.akido?.enabled, DEFAULT_PROVIDER_CONFIG.akido.enabled),
    baseUrl: toText(value.akido?.baseUrl || DEFAULT_PROVIDER_CONFIG.akido.baseUrl).trim(),
    timeoutMs: Math.max(1000, normalizeNumber(value.akido?.timeoutMs, DEFAULT_PROVIDER_CONFIG.akido.timeoutMs)),
    apiKeyMode: getApiMode(value.akido?.apiKeyMode),
    apiKeyEnv: toText(value.akido?.apiKeyEnv || DEFAULT_PROVIDER_CONFIG.akido.apiKeyEnv).trim(),
  }

  return {
    cliBridge: normalizeCliBridge,
    akido: normalizeAkido,
  }
}

function normalizeConfig(raw) {
  const workspaceRoot = path.resolve(toText(raw.workspaceRoot || PROJECT_ROOT))
  const base = {
    ...DEFAULT_CONFIG,
    ...raw,
    workspaceRoot,
    activeProject: toText(raw.activeProject || '').trim(),
    workflowId: toText(raw.workflowId || DEFAULT_CONFIG.workflowId),
    handoffDir: toText(raw.handoffDir || DEFAULT_CONFIG.handoffDir),
    swarmDir: toText(raw.swarmDir || DEFAULT_CONFIG.swarmDir),
    refreshSeconds: Math.max(5, normalizeNumber(raw.refreshSeconds, DEFAULT_CONFIG.refreshSeconds)),
    showRawMarkdown: normalizeBoolean(raw.showRawMarkdown, DEFAULT_CONFIG.showRawMarkdown),
    providers: normalizeProviderConfig(raw.providers || {}),
    projectOverrides: {},
  }

  base.projectOverrides = {}
  if (raw.projectOverrides && typeof raw.projectOverrides === 'object') {
    Object.entries(raw.projectOverrides).forEach(([key, cfg]) => {
      if (!key) return
      base.projectOverrides[path.resolve(key)] = {
        handoffDir: toText(cfg.handoffDir || base.handoffDir),
        swarmDir: toText(cfg.swarmDir || base.swarmDir),
        workflowId: toText(cfg.workflowId || base.workflowId),
        steps: toList(cfg.steps || []).map(normalizeStep),
      }
    })
  }

  return base
}

function ensureProjectDefaults(projectCfg, workflow) {
  const workflowRoles = Array.isArray(workflow?.roles) ? workflow.roles : []
  const defaults = workflowRoles.map((role) => ({
    id: String(role),
    title: String(role),
    enabled: true,
    provider: 'local',
    command: '',
    model: DEFAULT_STEP_TEMPLATE.model,
    actionId: '',
    actionParams: '{}',
    timeoutMs: DEFAULT_STEP_TEMPLATE.timeoutMs,
    onFailure: 'continue',
  }))

  if (!Array.isArray(projectCfg.steps) || !projectCfg.steps.length) {
    return defaults
  }

  const current = new Map()
  projectCfg.steps.map(normalizeStep).forEach((step) => {
    current.set(step.id, step)
  })

  const merged = defaults.map((defaultStep) => {
    const existing = current.get(defaultStep.id)
    if (existing) {
      return {
        ...defaultStep,
        ...existing,
        id: defaultStep.id,
        title: existing.title || defaultStep.title,
      }
    }
    return defaultStep
  })

  const custom = []
  for (const step of projectCfg.steps.map(normalizeStep)) {
    if (!defaults.find((d) => d.id === step.id)) {
      custom.push(step)
    }
  }

  return merged.concat(custom)
}

function loadConfig() {
  const cfg = normalizeConfig(readJSONSafe(CONFIG_PATH, DEFAULT_CONFIG))
  return cfg
}

function loadSecrets() {
  return readJSONSafe(SECRETS_PATH, {})
}

function saveConfig(next) {
  writeJSONSafe(CONFIG_PATH, next)
}

function saveSecrets(next) {
  writeJSONSafe(SECRETS_PATH, next)
}

function setSecret(provider, value, secrets) {
  const sanitized = typeof value === 'string' ? value.trim() : ''
  if (!sanitized) {
    delete secrets[provider]
    return
  }
  secrets[provider] = sanitized
}

function getProviderSecret(provider, providerCfg, secrets) {
  if (providerCfg.apiKeyMode === 'inline') {
    return toText(secrets[provider] || '')
  }
  if (providerCfg.apiKeyMode === 'env') {
    return toText(process.env[providerCfg.apiKeyEnv] || '')
  }
  return ''
}

function toPreview(text, lines = 18) {
  if (typeof text !== 'string') return ''
  return text
    .replace(/\r/g, '')
    .split('\n')
    .slice(0, lines)
    .join('\n')
}

function fileMeta(filePath) {
  try {
    const stat = fs.statSync(filePath)
    return {
      exists: true,
      size: stat.size,
      updatedAt: stat.mtime.toISOString(),
    }
  } catch {
    return { exists: false }
  }
}

function readMarkdownSafe(name, repoRoot, handoffDir) {
  const fp = path.join(repoRoot, handoffDir, name)
  const raw = readTextSafe(fp)
  const meta = fileMeta(fp)
  return {
    name,
    ...meta,
    preview: toPreview(raw),
  }
}

function readFindings(runRoot) {
  const fp = path.join(runRoot, 'findings.jsonl')
  const raw = readTextSafe(fp)
  if (!raw) {
    return []
  }

  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line)
      } catch {
        return { parse_error: line }
      }
    })
    .slice(0, 50)
}

function discoverWorkflows(workflowDir = path.join(PROJECT_ROOT, 'workflows')) {
  const list = []

  if (!fs.existsSync(workflowDir)) {
    return [DEFAULT_WORKFLOW_FALLBACK]
  }

  const files = fs.readdirSync(workflowDir).filter((name) => name.endsWith('.workflow.json'))
  for (const file of files) {
    try {
      const raw = readJSONSafe(path.join(workflowDir, file), null)
      if (!raw || typeof raw !== 'object') continue
      const id = toText(raw.name || path.basename(file, '.workflow.json'))
      const roles = toList(raw.roles).map((v) => String(v)).filter(Boolean)
      list.push({
        id,
        file,
        mode: toText(raw.mode || 'review'),
        version: toText(raw.version || '0.2'),
        roles,
        source: path.join('workflows', file),
      })
    } catch {
      // ignore broken workflow files
    }
  }

  if (!list.length) {
    list.push(DEFAULT_WORKFLOW_FALLBACK)
  }

  return list
}

function discoverProjects(workspaceRoot) {
  if (!fs.existsSync(workspaceRoot)) {
    return []
  }

  const entries = fs.readdirSync(workspaceRoot, { withFileTypes: true })
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const abs = path.join(workspaceRoot, entry.name)
      const handoffCandidates = [
        path.join(abs, '.git'),
        path.join(abs, '.ai', 'handoff'),
        path.join(abs, '.ai', 'swarm'),
        path.join(abs, 'package.json'),
      ]
      const looksLikeProject = handoffCandidates.some((p) => fs.existsSync(p))
      return {
        name: entry.name,
        path: abs,
        looksLikeProject,
      }
    })
    .filter((item) => item.looksLikeProject)
}

function resolveProjectPath(projectPath, workspaceRoot, activeProject) {
  const defaultPath = activeProject && activeProject.trim()
    ? path.resolve(activeProject)
    : workspaceRoot

  if (!projectPath) return defaultPath
  const candidate = path.isAbsolute(projectPath)
    ? path.resolve(projectPath)
    : path.resolve(workspaceRoot, projectPath)

  if (fs.existsSync(candidate)) {
    return candidate
  }

  return defaultPath
}

function getProjectConfig(config, projectPath, workflows) {
  const base = {
    handoffDir: config.handoffDir,
    swarmDir: config.swarmDir,
    workflowId: config.workflowId,
    steps: [],
  }

  const override = config.projectOverrides[projectPath] || {}
  const merged = {
    ...base,
    ...override,
    handoffDir: toText(override.handoffDir || base.handoffDir),
    swarmDir: toText(override.swarmDir || base.swarmDir),
    workflowId: toText(override.workflowId || base.workflowId),
  }

  const workflow = workflows.find((item) => item.id === merged.workflowId) || workflows[0] || DEFAULT_WORKFLOW_FALLBACK
  merged.steps = ensureProjectDefaults({ ...merged }, workflow)
  return merged
}

function collectState(repoRoot, projectConfig) {
  const runRoot = path.join(repoRoot, projectConfig.swarmDir)
  const latestRun = readJSONSafe(path.join(runRoot, 'latest-run.json'))
  const summary = readTextSafe(path.join(runRoot, 'SUMMARY.md'))
  const verdict = readTextSafe(path.join(runRoot, 'verdict.json'))

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    workflowId: projectConfig.workflowId,
    handoff: {
      manifest: readMarkdownSafe('MANIFEST.json', repoRoot, projectConfig.handoffDir),
      status: readMarkdownSafe('STATUS.md', repoRoot, projectConfig.handoffDir),
      nextActions: readMarkdownSafe('NEXT_ACTIONS.md', repoRoot, projectConfig.handoffDir),
      log: readMarkdownSafe('LOG.md', repoRoot, projectConfig.handoffDir),
      trust: readMarkdownSafe('TRUST.md', repoRoot, projectConfig.handoffDir),
      workflow: readMarkdownSafe('WORKFLOW.md', repoRoot, projectConfig.handoffDir),
      dashboard: readMarkdownSafe('DASHBOARD.md', repoRoot, projectConfig.handoffDir),
    },
    runs: {
      latestRun: latestRun || null,
      summary: toPreview(summary || ''),
      verdict: verdict || null,
      findings: readFindings(runRoot),
    },
  }
}

function ensureSettings() {
  ensureDir(CONFIG_DIR)
  if (!fs.existsSync(CONFIG_PATH)) {
    saveConfig(DEFAULT_CONFIG)
  }
}

function serveJson(res, payload, code = 200) {
  const body = JSON.stringify(payload)
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(body)
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = ''
    req.on('data', (chunk) => {
      body += chunk
    })
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {})
      } catch {
        resolve({})
      }
    })
  })
}

function sanitizeConfigForClient(cfg) {
  const payload = {
    ...cfg,
    projectOverrides: cfg.projectOverrides,
    providers: {
      ...cfg.providers,
      cliBridge: {
        ...cfg.providers.cliBridge,
        apiKeyMode: cfg.providers.cliBridge.apiKeyMode,
        apiKeyEnv: cfg.providers.cliBridge.apiKeyEnv,
      },
      akido: {
        ...cfg.providers.akido,
        apiKeyMode: cfg.providers.akido.apiKeyMode,
        apiKeyEnv: cfg.providers.akido.apiKeyEnv,
      },
    },
  }
  return payload
}

function providerHeaders(providerCfg, secrets, providerName) {
  const key = getProviderSecret(providerName, providerCfg, secrets)
  if (!key) return {}
  return { Authorization: `Bearer ${key}` }
}

function normalizeProviderUrl(baseUrl) {
  const trimmed = toText(baseUrl || '').trim()
  if (!trimmed) return ''
  return trimmed.endsWith('/') ? trimmed.replace(/\/$/, '') : trimmed
}

async function proxyJsonRequest({ method, url, headers = {}, body, timeoutMs = 120000 }) {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    controller.abort()
  }, timeoutMs)

  try {
    const response = await fetch(url, {
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    })

    const raw = await response.text()
    const parsed = raw ? (() => {
      try {
        return JSON.parse(raw)
      } catch {
        return raw
      }
    })() : null

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      body: parsed,
    }
  } catch (error) {
    return {
      ok: false,
      status: 0,
      statusText: error?.name || 'request_error',
      body: String(error),
    }
  } finally {
    clearTimeout(timer)
  }
}

async function runCliBridgeTest(cfg, secrets, model, prompt, timeoutMs) {
  const baseUrl = normalizeProviderUrl(cfg.baseUrl)
  const target = `${baseUrl}/v1/chat/completions`
  const secretHeaders = providerHeaders(cfg, secrets, 'cliBridge')
  return proxyJsonRequest({
    method: 'POST',
    url: target,
    headers: secretHeaders,
    timeoutMs,
    body: {
      model: model || cfg.defaultModel,
      messages: [{ role: 'user', content: prompt || 'status' }],
      max_tokens: 24,
    },
  })
}

async function runStepWithProvider(step, projectPath, config, secrets) {
  if (!step.enabled) {
    return {
      ok: true,
      skipped: true,
      step: step.id,
    }
  }

  const timeoutMs = Math.max(5000, step.timeoutMs || 120000)

  if (step.provider === 'local') {
    if (!step.command.trim()) {
      return {
        ok: true,
        skipped: true,
        step: step.id,
        note: 'No command configured for local provider',
      }
    }

    return new Promise((resolve) => {
      const start = Date.now()
      let stdout = ''
      let stderr = ''
      const child = spawn(step.command, {
        cwd: projectPath,
        shell: true,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      let timedOut = false
      const timer = setTimeout(() => {
        timedOut = true
        child.kill()
      }, timeoutMs)

      child.stdout?.on('data', (data) => {
        stdout += String(data)
      })
      child.stderr?.on('data', (data) => {
        stderr += String(data)
      })

      child.on('error', (error) => {
        clearTimeout(timer)
        resolve({
          ok: false,
          step: step.id,
          provider: 'local',
          command: step.command,
          timedOut,
          durationMs: Date.now() - start,
          error: String(error),
        })
      })

      child.on('close', (code) => {
        clearTimeout(timer)
        const ok = code === 0 && !timedOut
        resolve({
          ok,
          step: step.id,
          provider: 'local',
          command: step.command,
          timedOut,
          durationMs: Date.now() - start,
          exitCode: code,
          stdout: toPreview(stdout, 200),
          stderr: toPreview(stderr, 100),
        })
      })
    })
  }

  if (step.provider === 'cli-bridge') {
    const cfg = config.providers.cliBridge
    if (!cfg.enabled) {
      return { ok: false, step: step.id, provider: 'cli-bridge', error: 'CLI Bridge provider is disabled' }
    }
    const res = await runCliBridgeTest(cfg, secrets, step.model || config.providers.cliBridge.defaultModel, step.command || `Run step ${step.id}`, timeoutMs)
    return {
      ok: res.ok,
      step: step.id,
      provider: 'cli-bridge',
      model: step.model || config.providers.cliBridge.defaultModel,
      status: res.status,
      durationMs: 0,
      response: res.body,
      raw: res,
    }
  }

  if (step.provider === 'akido') {
    const cfg = config.providers.akido
    if (!cfg.enabled) {
      return { ok: false, step: step.id, provider: 'akido', error: 'Akido provider is disabled' }
    }
    if (!step.actionId) {
      return { ok: false, step: step.id, provider: 'akido', error: 'No actionId configured for akido step' }
    }
    const baseUrl = normalizeProviderUrl(cfg.baseUrl)
    const endpoint = `${baseUrl}/api/action`
    const payload = {
      id: step.actionId,
      params: (() => {
        try {
          return JSON.parse(step.actionParams || '{}')
        } catch {
          return {}
        }
      })(),
    }
    const result = await proxyJsonRequest({
      method: 'POST',
      url: endpoint,
      timeoutMs,
      headers: providerHeaders(cfg, secrets, 'akido'),
      body: payload,
    })

    return {
      ok: result.ok,
      step: step.id,
      provider: 'akido',
      status: result.status,
      durationMs: 0,
      response: result.body,
      raw: result,
    }
  }

  return { ok: false, step: step.id, error: `Unknown provider ${step.provider}` }
}

async function runWorkflowSequence(projectPath, projectConfig, config, secrets, selectedStepIds = null) {
  const steps = selectedStepIds && selectedStepIds.length
    ? projectConfig.steps.filter((s) => selectedStepIds.includes(s.id))
    : projectConfig.steps

  const results = []

  for (const step of steps) {
    const result = await runStepWithProvider(step, projectPath, config, secrets)
    results.push(result)

    if (!result.ok && result.onFailure === 'stop' || step.onFailure === 'stop') {
      break
    }
    if (!result.ok && step.onFailure === 'warn') {
      results.push({
        ok: true,
        step: step.id,
        provider: 'hub',
        warning: 'warn policy enabled, continuing',
      })
    }
  }

  return {
    ok: !results.some((item) => !item.ok),
    runAt: new Date().toISOString(),
    total: steps.length,
    results,
  }
}

async function handleApi(req, res, parsedUrl) {
  ensureSettings()
  const config = loadConfig()
  const secrets = loadSecrets()
  const projectRoot = config.workspaceRoot
  const workflows = discoverWorkflows(path.join(PROJECT_ROOT, 'workflows'))
  const projects = discoverProjects(projectRoot)
  const pathname = parsedUrl.pathname

  if (pathname === '/api/config' && req.method === 'GET') {
    const projectPath = resolveProjectPath(parsedUrl.searchParams.get('project'), projectRoot, config.activeProject)
    const projectConfig = getProjectConfig(config, projectPath, workflows)
    const response = {
      config: sanitizeConfigForClient(config),
      activeProject: projectPath,
      projectConfig,
      workflows,
      projects,
      secretStatus: {
        cliBridge: !!getProviderSecret(config.providers.cliBridge, config.providers.cliBridge, secrets),
        akido: !!getProviderSecret(config.providers.akido, config.providers.akido, secrets),
      },
    }
    serveJson(res, response)
    return true
  }

  if (pathname === '/api/config' && req.method === 'POST') {
    const body = await parseBody(req)
    const next = {
      ...config,
      workspaceRoot: path.resolve(body.workspaceRoot || config.workspaceRoot),
      refreshSeconds: normalizeNumber(body.refreshSeconds, config.refreshSeconds),
      showRawMarkdown: normalizeBoolean(body.showRawMarkdown, config.showRawMarkdown),
      handoffDir: toText(body.handoffDir || config.handoffDir),
      swarmDir: toText(body.swarmDir || config.swarmDir),
      workflowId: toText(body.workflowId || config.workflowId),
      providers: normalizeProviderConfig(body.providers || config.providers),
    }

    if (typeof body.activeProject === 'string') {
      next.activeProject = toText(body.activeProject)
    }

    if (body.projectPath) {
      const key = path.resolve(body.projectPath)
      if (!next.projectOverrides[key]) {
        next.projectOverrides[key] = {
          handoffDir: next.handoffDir,
          swarmDir: next.swarmDir,
          workflowId: next.workflowId,
          steps: [],
        }
      }
      next.projectOverrides[key] = {
        ...next.projectOverrides[key],
        handoffDir: toText(body.handoffDir || next.projectOverrides[key].handoffDir),
        swarmDir: toText(body.swarmDir || next.projectOverrides[key].swarmDir),
        workflowId: toText(body.workflowId || next.projectOverrides[key].workflowId),
        steps: Array.isArray(body.steps) ? body.steps.map(normalizeStep) : next.projectOverrides[key].steps,
      }
    }

    const nextSecrets = {
      ...secrets,
    }
    const cliKey = body?.providerSecrets?.cliBridge
    const akidoKey = body?.providerSecrets?.akido

    if (typeof cliKey === 'string') setSecret('cliBridge', cliKey, nextSecrets)
    if (typeof akidoKey === 'string') setSecret('akido', akidoKey, nextSecrets)

    saveConfig(next)
    saveSecrets(nextSecrets)
    serveJson(res, { ok: true, config: next })
    return true
  }

  if (pathname === '/api/projects' && req.method === 'GET') {
    serveJson(res, { projects })
    return true
  }

  if (pathname === '/api/workflows' && req.method === 'GET') {
    serveJson(res, { workflows })
    return true
  }

  if (pathname === '/api/state' && req.method === 'GET') {
    const projectPath = resolveProjectPath(parsedUrl.searchParams.get('project'), projectRoot, config.activeProject)
    const projectConfig = getProjectConfig(config, projectPath, workflows)

    serveJson(res, {
      ...collectState(projectPath, projectConfig),
      project: {
        path: projectPath,
        config: projectConfig,
      },
    })
    return true
  }

  if (pathname === '/api/provider/cli-bridge/models' && req.method === 'GET') {
    const base = normalizeProviderUrl(config.providers.cliBridge.baseUrl)
    const result = await proxyJsonRequest({
      method: 'GET',
      url: `${base}/v1/models`,
      timeoutMs: config.providers.cliBridge.timeoutMs,
    })
    serveJson(res, result)
    return true
  }

  if (pathname === '/api/provider/cli-bridge/health' && req.method === 'GET') {
    const base = normalizeProviderUrl(config.providers.cliBridge.baseUrl)
    const result = await proxyJsonRequest({
      method: 'GET',
      url: `${base}/health`,
      timeoutMs: config.providers.cliBridge.timeoutMs,
    })
    serveJson(res, result)
    return true
  }

  if (pathname === '/api/provider/cli-bridge/status' && req.method === 'GET') {
    const base = normalizeProviderUrl(config.providers.cliBridge.baseUrl)
    const result = await proxyJsonRequest({
      method: 'GET',
      url: `${base}/status`,
      timeoutMs: config.providers.cliBridge.timeoutMs,
      headers: providerHeaders(config.providers.cliBridge, secrets, 'cliBridge'),
    })
    serveJson(res, result)
    return true
  }

  if (pathname === '/api/provider/cli-bridge/test' && req.method === 'POST') {
    const body = await parseBody(req)
    const model = toText(body.model || config.providers.cliBridge.defaultModel)
    const prompt = toText(body.prompt || 'ping')
    const test = await runCliBridgeTest(config.providers.cliBridge, secrets, model, prompt, config.providers.cliBridge.timeoutMs)
    serveJson(res, test)
    return true
  }

  if (pathname === '/api/provider/akido/actions' && req.method === 'GET') {
    const base = normalizeProviderUrl(config.providers.akido.baseUrl)
    const result = await proxyJsonRequest({
      method: 'GET',
      url: `${base}/api/actions`,
      timeoutMs: config.providers.akido.timeoutMs,
      headers: providerHeaders(config.providers.akido, secrets, 'akido'),
    })
    serveJson(res, result)
    return true
  }

  if (pathname === '/api/provider/akido/status' && req.method === 'GET') {
    const base = normalizeProviderUrl(config.providers.akido.baseUrl)
    const result = await proxyJsonRequest({
      method: 'GET',
      url: `${base}/status`,
      timeoutMs: config.providers.akido.timeoutMs,
      headers: providerHeaders(config.providers.akido, secrets, 'akido'),
    })
    serveJson(res, result)
    return true
  }

  if (pathname === '/api/provider/akido/action' && req.method === 'POST') {
    const base = normalizeProviderUrl(config.providers.akido.baseUrl)
    const body = await parseBody(req)
    const action = {
      id: toText(body.id),
      params: body?.params && typeof body.params === 'object' ? body.params : {},
    }
    const result = await proxyJsonRequest({
      method: 'POST',
      url: `${base}/api/action`,
      timeoutMs: config.providers.akido.timeoutMs,
      headers: providerHeaders(config.providers.akido, secrets, 'akido'),
      body: action,
    })
    serveJson(res, result)
    return true
  }

  if (pathname === '/api/workflow/run' && req.method === 'POST') {
    const body = await parseBody(req)
    const projectPath = resolveProjectPath(body?.project, projectRoot, config.activeProject)
    const projectConfig = getProjectConfig(config, projectPath, workflows)
    const selected = Array.isArray(body?.stepIds) ? body.stepIds.map(toText) : null
    const result = await runWorkflowSequence(projectPath, projectConfig, config, secrets, selected)
    serveJson(res, { projectPath, result })
    return true
  }

  if (pathname === '/api/step/run' && req.method === 'POST') {
    const body = await parseBody(req)
    const projectPath = resolveProjectPath(body?.project, projectRoot, config.activeProject)
    const projectConfig = getProjectConfig(config, projectPath, workflows)
    const stepId = toText(body?.stepId || body?.id)
    const step = projectConfig.steps.find((item) => item.id === stepId)
    if (!step) {
      serveJson(res, { ok: false, error: 'step not found' }, 404)
      return true
    }

    const result = await runStepWithProvider(step, projectPath, config, secrets)
    serveJson(res, { ok: true, step: stepId, result })
    return true
  }

  if (pathname === '/api/run-command' && req.method === 'POST') {
    const body = await parseBody(req)
    const command = toText(body?.command)
    const cwd = resolveProjectPath(body?.project, projectRoot, config.activeProject)
    if (!command) {
      serveJson(res, { ok: false, error: 'command required' }, 400)
      return true
    }

    const result = await runStepWithProvider({
      id: 'manual',
      title: 'manual',
      enabled: true,
      provider: 'local',
      command,
      timeoutMs: Math.max(5000, normalizeNumber(body?.timeoutMs, 120000)),
      onFailure: 'continue',
      model: DEFAULT_STEP_TEMPLATE.model,
      actionId: '',
      actionParams: '{}',
    }, cwd, config, secrets)

    serveJson(res, { ok: result.ok, result })
    return true
  }

  serveJson(res, { error: 'not_found' }, 404)
  return true
}

function serveFile(res, filePath, fallback = '/index.html') {
  const ext = path.extname(filePath)
  const type = ext === '.css'
    ? 'text/css'
    : ext === '.js'
      ? 'application/javascript'
      : 'text/html'

  fs.readFile(filePath, 'utf8', (err, content) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, fallback.replace(/^\//, '')), 'utf8', (fallbackErr, fallbackContent) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
          res.end('Not found')
        } else {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
          res.end(fallbackContent)
        }
      })
      return
    }

    res.writeHead(200, {
      'Content-Type': `${type}; charset=utf-8`,
      'Cache-Control': 'no-store',
    })
    res.end(content)
  })
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    res.writeHead(400)
    res.end('Bad request')
    return
  }

  const parsed = new URL(req.url, 'http://localhost')

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'content-type',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    })
    res.end()
    return
  }

  if (parsed.pathname.startsWith('/api/')) {
    await handleApi(req, res, parsed)
    return
  }

  const safeReq = parsed.pathname === '/' ? '/index.html' : parsed.pathname
  const filePath = path.join(PUBLIC_DIR, safeReq)
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(400)
    res.end('Bad path')
    return
  }

  serveFile(res, filePath)
})

const PORT = Number(process.env.PORT || 4173)
server.listen(PORT, () => {
  console.log(`AAHP-SWARM Hub running at http://127.0.0.1:${PORT}`)
  console.log(`Workspace root: ${PROJECT_ROOT}`)
})
