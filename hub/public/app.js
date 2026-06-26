const globalForm = document.getElementById('globalForm')
const runStatusEl = document.getElementById('runStatus')
const runSummaryEl = document.getElementById('runSummary')
const findingsEl = document.getElementById('findings')
const handoffEl = document.getElementById('handoffList')
const rawStateEl = document.getElementById('rawState')

const loadConfigBtn = document.getElementById('loadConfigBtn')
const refreshBtn = document.getElementById('refreshBtn')
const saveConfigBtn = document.getElementById('saveConfigBtn')
const addStepBtn = document.getElementById('addStepBtn')
const runWorkflowBtn = document.getElementById('runWorkflowBtn')
const runSingleStepBtn = document.getElementById('runSingleStepBtn')
const stepsBody = document.getElementById('stepsBody')
const runResultEl = document.getElementById('runResult')
const providerRaw = document.getElementById('providerRaw')
const stepSelect = document.getElementById('stepSelect')

const projectSelect = document.getElementById('projectPath')
const workflowSelect = globalForm.elements.namedItem('workflowId')

const cliHealthBtn = document.getElementById('cliHealthBtn')
const cliModelsBtn = document.getElementById('cliModelsBtn')
const cliTestBtn = document.getElementById('cliTestBtn')
const akidoStatusBtn = document.getElementById('akidoStatusBtn')
const akidoActionsBtn = document.getElementById('akidoActionsBtn')

const cliBridgeEnabled = document.getElementById('cliBridgeEnabled')
const cliBridgeBaseUrl = document.getElementById('cliBridgeBaseUrl')
const cliBridgeDefaultModel = document.getElementById('cliBridgeDefaultModel')
const cliBridgeApiMode = document.getElementById('cliBridgeApiMode')
const cliBridgeApiEnv = document.getElementById('cliBridgeApiEnv')
const cliBridgeApiKey = document.getElementById('cliBridgeApiKey')

const akidoEnabled = document.getElementById('akidoEnabled')
const akidoBaseUrl = document.getElementById('akidoBaseUrl')
const akidoApiMode = document.getElementById('akidoApiMode')
const akidoApiEnv = document.getElementById('akidoApiEnv')
const akidoApiKey = document.getElementById('akidoApiKey')

let refreshTimer
let appState = {}
let currentState = {}
let currentProjectPath = ''

function toText(v) {
  return v == null ? '' : String(v)
}

function setField(name, value) {
  const field = globalForm.elements.namedItem(name)
  if (!field) return

  if (field.type === 'checkbox') {
    field.checked = Boolean(value)
    return
  }

  field.value = toText(value)
}

function setSelect(selectEl, value, fallback = '') {
  const val = toText(value || fallback)
  const has = [...selectEl.options].some((o) => o.value === val)
  if (has) {
    selectEl.value = val
    return
  }
  if (selectEl.options.length > 0) {
    selectEl.value = selectEl.options[0].value
  }
}

function toPreview(raw, lines = 18) {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/\r/g, '')
    .split('\n')
    .slice(0, lines)
    .join('\n')
}

function sanitizeRowValues(row) {
  const provider = row.provider
  return {
    id: toText(row.id || '').trim(),
    title: toText(row.title || '').trim(),
    enabled: Boolean(row.enabled),
    provider,
    command: toText(row.command || '').trim(),
    model: toText(row.model || 'cli-claude/claude-sonnet-4-6'),
    actionId: toText(row.actionId || ''),
    actionParams: toText(row.actionParams || '{}'),
    timeoutMs: Number(row.timeoutMs) || 120000,
    onFailure: row.onFailure || 'continue',
  }
}

function buildStepRow(step, index) {
  const tr = document.createElement('tr')
  tr.dataset.index = String(index)

  tr.innerHTML = `
    <td><input data-key="id" value="${step.id}" /></td>
    <td><input data-key="title" value="${step.title}" /></td>
    <td>
      <select data-key="provider">
        <option value="local">local</option>
        <option value="cli-bridge">cli-bridge</option>
        <option value="akido">akido</option>
      </select>
    </td>
    <td><input data-key="command" class="wide" value="${step.command}" /></td>
    <td><input data-key="model" value="${step.model}" /></td>
    <td><input data-key="actionId" value="${step.actionId}" /></td>
    <td><input data-key="actionParams" class="wide" value='${step.actionParams.replace(/'/g, "&#39;")}' /></td>
    <td><input data-key="timeoutMs" type="number" min="5000" value="${step.timeoutMs}" /></td>
    <td>
      <select data-key="onFailure">
        <option value="continue">continue</option>
        <option value="warn">warn</option>
        <option value="stop">stop</option>
      </select>
    </td>
    <td><input data-key="enabled" type="checkbox" ${step.enabled ? 'checked' : ''} /></td>
    <td><button data-action="remove-step" type="button">Remove</button></td>
  `

  tr.querySelector('[data-key="provider"]').value = step.provider || 'local'
  tr.querySelector('[data-key="onFailure"]').value = step.onFailure || 'continue'
  return tr
}

function updateStepSelect(steps) {
  stepSelect.innerHTML = ''
  for (const step of steps) {
    const opt = document.createElement('option')
    opt.value = step.id
    opt.textContent = `${step.id} · ${step.title}`
    stepSelect.appendChild(opt)
  }
}

function renderSteps(steps = []) {
  stepsBody.innerHTML = ''
  const clean = steps.map(sanitizeRowValues)
  if (!clean.length) {
    stepsBody.innerHTML = '<tr><td colspan="10" class="muted">No steps configured.</td></tr>'
    updateStepSelect([])
    return
  }

  clean.forEach((step, index) => {
    stepsBody.appendChild(buildStepRow(step, index))
  })
  updateStepSelect(clean)
}

function collectSteps() {
  const rows = [...stepsBody.querySelectorAll('tr[data-index]')]
  return rows
    .map((row) => {
      const get = (key) => {
        const node = row.querySelector(`[data-key="${key}"]`)
        if (!node) return ''
        if (node.type === 'checkbox') return node.checked
        if (node.type === 'number') return Number(node.value)
        return node.value
      }

      return sanitizeRowValues({
        id: get('id'),
        title: get('title'),
        provider: get('provider'),
        command: get('command'),
        model: get('model'),
        actionId: get('actionId'),
        actionParams: get('actionParams'),
        timeoutMs: get('timeoutMs'),
        onFailure: get('onFailure'),
        enabled: get('enabled'),
      })
    })
    .filter((step) => step.id)
}

function collectConfigPayload() {
  const projectPath = globalForm.elements.namedItem('projectPath').value
  const cfg = {
    workspaceRoot: globalForm.elements.namedItem('workspaceRoot').value,
    activeProject: projectPath,
    refreshSeconds: Number(globalForm.elements.namedItem('refreshSeconds').value),
    handoffDir: globalForm.elements.namedItem('handoffDir').value,
    swarmDir: globalForm.elements.namedItem('swarmDir').value,
    workflowId: workflowSelect.value,
    showRawMarkdown: globalForm.elements.namedItem('showRawMarkdown').checked,
    projectPath,
    steps: collectSteps(),
    providers: {
      cliBridge: {
        enabled: cliBridgeEnabled.checked,
        baseUrl: cliBridgeBaseUrl.value,
        defaultModel: cliBridgeDefaultModel.value,
        apiKeyMode: cliBridgeApiMode.value,
        apiKeyEnv: cliBridgeApiEnv.value,
      },
      akido: {
        enabled: akidoEnabled.checked,
        baseUrl: akidoBaseUrl.value,
        apiKeyMode: akidoApiMode.value,
        apiKeyEnv: akidoApiEnv.value,
      },
    },
    providerSecrets: {
      cliBridge: cliBridgeApiKey.value || '',
      akido: akidoApiKey.value || '',
    },
  }

  return cfg
}

function renderFileItem(title, file) {
  const exists = file?.exists
  const stamp = exists ? toText(file.updatedAt) : 'missing'
  const size = exists ? `(${file.size} bytes)` : ''
  const status = exists ? 'ok' : 'warn'

  const li = document.createElement('li')
  li.innerHTML = `<span class="${status}">${title}</span> - ${size} - ${stamp}`

  if (exists && toText(file.preview)) {
    const p = document.createElement('pre')
    p.textContent = file.preview
    p.style.whiteSpace = 'pre-wrap'
    p.style.margin = '6px 0 0'
    p.style.opacity = '0.82'
    li.appendChild(p)
  }

  return li
}

function renderFindings(items = []) {
  findingsEl.innerHTML = ''
  if (!items.length) {
    findingsEl.innerHTML = '<li>No findings yet.</li>'
    return
  }

  for (const finding of items) {
    const li = document.createElement('li')
    if (finding.parse_error) {
      li.textContent = `Parse error: ${finding.parse_error}`
      li.className = 'bad'
      findingsEl.appendChild(li)
      continue
    }

    const title = finding.title || `${finding.id} ${finding.summary || ''}`
    const sev = finding.severity ? `[${finding.severity}] ` : ''
    const bl = finding.blocking ? 'BLOCKING' : 'non-blocking'
    li.textContent = `${finding.id} ${sev}${title} (${bl})`
    findingsEl.appendChild(li)
  }
}

function renderState(state) {
  currentState = state
  const latest = state.runs?.latestRun || {}
  runStatusEl.textContent = `${toText(state.workflowId)} @ ${toText(state.repoRoot)}`

  const summary = state.runs?.summary || state.runs?.reason || state.runs?.latestRun?.summary || 'No summary yet.'
  runSummaryEl.textContent = toText(summary)

  const result = latest.result || 'unknown'
  const verdict = latest.blocking ? 'BLOCKING' : ''
  const roles = Array.isArray(latest.roles_executed) ? latest.roles_executed.join(', ') : '-'
  const statusLine = `Result: ${result} ${verdict}\nRoles: ${roles}`
  const header = document.createElement('pre')
  header.textContent = statusLine
  runStatusEl.appendChild(header)

  handoffEl.innerHTML = ''
  const files = [
    ['MANIFEST', state.handoff?.manifest],
    ['STATUS', state.handoff?.status],
    ['NEXT_ACTIONS', state.handoff?.nextActions],
    ['WORKFLOW', state.handoff?.workflow],
    ['DASHBOARD', state.handoff?.dashboard],
    ['TRUST', state.handoff?.trust],
    ['LOG', state.handoff?.log],
  ]
  files.forEach(([title, file]) => handoffEl.appendChild(renderFileItem(title, file)))

  renderFindings(state.runs?.findings || [])
  if (appState.config?.showRawMarkdown) {
    rawStateEl.classList.add('show')
    rawStateEl.textContent = JSON.stringify(state, null, 2)
  } else {
    rawStateEl.classList.remove('show')
  }
}

async function loadState() {
  const project = globalForm.elements.namedItem('projectPath').value
  const res = await fetch(`/api/state?project=${encodeURIComponent(project)}`)
  const state = await res.json()
  renderState(state)
}

function renderProjects(projects = []) {
  projectSelect.innerHTML = ''
  for (const item of projects) {
    const option = document.createElement('option')
    option.value = item.path
    option.textContent = `${item.name} (${item.path})`
    option.dataset.path = item.path
    projectSelect.appendChild(option)
  }
}

function renderWorkflows(workflows = []) {
  workflowSelect.innerHTML = ''
  for (const wf of workflows) {
    const option = document.createElement('option')
    option.value = wf.id
    option.textContent = `${wf.id} (${wf.mode})`
    workflowSelect.appendChild(option)
  }
}

async function loadConfig() {
  const res = await fetch('/api/config')
  appState = await res.json()

  const cfg = appState.config || {}
  setField('workspaceRoot', cfg.workspaceRoot)
  setField('refreshSeconds', cfg.refreshSeconds)
  setField('showRawMarkdown', cfg.showRawMarkdown)
  setField('handoffDir', cfg.handoffDir)
  setField('swarmDir', cfg.swarmDir)

  renderProjects(appState.projects || [])
  renderWorkflows(appState.workflows || [])

  const active = appState.activeProject || cfg.workspaceRoot
  currentProjectPath = active
  setSelect(projectSelect, active)

  if (cfg.workflowId) {
    setSelect(workflowSelect, cfg.workflowId)
  }

  const projectCfg = appState.projectConfig || {}
  setField('workflowId', toText(projectCfg.workflowId || cfg.workflowId))
  renderSteps(projectCfg.steps || [])

  cliBridgeEnabled.checked = Boolean(cfg.providers?.cliBridge?.enabled)
  cliBridgeBaseUrl.value = toText(cfg.providers?.cliBridge?.baseUrl)
  cliBridgeDefaultModel.value = toText(cfg.providers?.cliBridge?.defaultModel)
  cliBridgeApiMode.value = toText(cfg.providers?.cliBridge?.apiKeyMode || 'none')
  cliBridgeApiEnv.value = toText(cfg.providers?.cliBridge?.apiKeyEnv)

  akidoEnabled.checked = Boolean(cfg.providers?.akido?.enabled)
  akidoBaseUrl.value = toText(cfg.providers?.akido?.baseUrl)
  akidoApiMode.value = toText(cfg.providers?.akido?.apiKeyMode || 'none')
  akidoApiEnv.value = toText(cfg.providers?.akido?.apiKeyEnv)

  cliBridgeApiKey.value = ''
  akidoApiKey.value = ''

  if (!runStatePending) {
    await loadState()
  }
}

let runStatePending = false

async function saveConfig() {
  saveConfigBtn.disabled = true
  const payload = collectConfigPayload()
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  await loadConfig()
  await loadState()
  saveConfigBtn.disabled = false
}

async function runWorkflow() {
  const body = { project: globalForm.elements.namedItem('projectPath').value }
  runResultEl.textContent = 'Running configured workflow...'
  const result = await fetch('/api/workflow/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await result.json()
  runResultEl.textContent = toPreview(JSON.stringify(data, null, 2), 40)
  await loadState()
}

async function runSingleStep() {
  const stepId = stepSelect.value
  if (!stepId) return

  const body = {
    project: globalForm.elements.namedItem('projectPath').value,
    stepId,
  }
  runResultEl.textContent = `Running step ${stepId}...`
  const result = await fetch('/api/step/run', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await result.json()
  runResultEl.textContent = toPreview(JSON.stringify(data, null, 2), 40)
  await loadState()
}

async function refreshCliHealth() {
  const result = await fetch('/api/provider/cli-bridge/health')
  const data = await result.json()
  providerRaw.textContent = toPreview(JSON.stringify(data, null, 2), 80)
}

async function loadCliModels() {
  const result = await fetch('/api/provider/cli-bridge/models')
  const data = await result.json()
  providerRaw.textContent = toPreview(JSON.stringify(data, null, 2), 160)
}

async function runCliTest() {
  const result = await fetch('/api/provider/cli-bridge/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: cliBridgeDefaultModel.value,
      prompt: 'status',
    }),
  })
  const data = await result.json()
  providerRaw.textContent = toPreview(JSON.stringify(data, null, 2), 80)
}

async function refreshAkidoStatus() {
  const result = await fetch('/api/provider/akido/status')
  const data = await result.json()
  providerRaw.textContent = toPreview(JSON.stringify(data, null, 2), 160)
}

async function refreshAkidoActions() {
  const result = await fetch('/api/provider/akido/actions')
  const data = await result.json()
  providerRaw.textContent = toPreview(JSON.stringify(data, null, 2), 160)
}

function bindEvents() {
  loadConfigBtn.addEventListener('click', loadConfig)
  refreshBtn.addEventListener('click', loadState)
  saveConfigBtn.addEventListener('click', (e) => {
    e.preventDefault()
    void saveConfig()
  })

  runWorkflowBtn.addEventListener('click', () => {
    void runWorkflow()
  })

  runSingleStepBtn.addEventListener('click', () => {
    void runSingleStep()
  })

  cliHealthBtn.addEventListener('click', () => {
    void refreshCliHealth()
  })
  cliModelsBtn.addEventListener('click', () => {
    void loadCliModels()
  })
  cliTestBtn.addEventListener('click', () => {
    void runCliTest()
  })

  akidoStatusBtn.addEventListener('click', () => {
    void refreshAkidoStatus()
  })
  akidoActionsBtn.addEventListener('click', () => {
    void refreshAkidoActions()
  })

  addStepBtn.addEventListener('click', () => {
    const id = `step-${Math.random().toString(16).slice(2, 8)}`
    const row = sanitizeRowValues({
      id,
      title: id,
      enabled: true,
      provider: 'local',
      command: '',
      model: 'cli-claude/claude-sonnet-4-6',
      actionId: '',
      actionParams: '{}',
      timeoutMs: 120000,
      onFailure: 'continue',
    })
    stepsBody.appendChild(buildStepRow(row, stepsBody.childElementCount))
    const opt = document.createElement('option')
    opt.value = id
    opt.textContent = `${id} · ${id}`
    stepSelect.appendChild(opt)
  })

  stepsBody.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action="remove-step"]')
    if (!button) return

    const row = button.closest('tr[data-index]')
    if (!row) return
    const index = Number(row.dataset.index)
    const rows = [...stepsBody.querySelectorAll('tr[data-index]')]
    const step = rows[index]
    if (step) {
      step.remove()
      void loadConfig()
    }
  })

  projectSelect.addEventListener('change', () => {
    currentProjectPath = projectSelect.value
    void loadConfig()
  })

  workflowSelect.addEventListener('change', () => {
    const wf = [...appState.workflows || []].find((item) => item.id === workflowSelect.value)
    const projectCfg = appState.projectConfig || {}
    const roles = Array.isArray(wf?.roles) ? wf.roles : []
    const steps = roles.map((role) => ({
      id: String(role),
      title: String(role),
      enabled: true,
      provider: 'local',
      command: '',
      model: 'cli-claude/claude-sonnet-4-6',
      actionId: '',
      actionParams: '{}',
      timeoutMs: 120000,
      onFailure: 'continue',
    }))

    renderSteps(steps)
  })
}

async function boot() {
  bindEvents()
  await loadConfig()

  refreshTimer = setInterval(() => {
    const interval = Math.max(5, Number(globalForm.elements.namedItem('refreshSeconds').value || 15))
    setTimeout(() => {
      void loadState()
    }, 0)
  }, Math.max(5000, Number(globalForm.elements.namedItem('refreshSeconds').value || 15) * 1000))

  clearInterval(refreshTimer)
  refreshTimer = setInterval(() => {
    void loadState()
  }, Math.max(5000, Number(globalForm.elements.namedItem('refreshSeconds').value || 15) * 1000))
}

boot()
