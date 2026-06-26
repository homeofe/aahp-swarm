import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'

export interface SwarmState {
  repoPath: string
}

export function loadState(path: string): SwarmState {
  const target = resolve(path)
  if (!existsSync(target)) {
    throw new Error(`State path not found: ${target}`)
  }
  return {
    repoPath: target,
  }
}

export function readManifest(repoPath: string): unknown {
  const manifestPath = join(repoPath, '.ai', 'handoff', 'MANIFEST.json')
  const raw = readFileSync(manifestPath, 'utf8')
  return JSON.parse(raw)
}
