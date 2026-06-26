import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

export interface Metrics {
  runId: string
  role: string
  elapsedMs: number
  result: string
}

const METRICS_FILE = '.ai/swarm/metrics.log'

function ensureDir(path: string) {
  mkdirSync(dirname(path), { recursive: true })
}

export function recordMetrics(metric: Metrics): string {
  ensureDir(METRICS_FILE)

  const line = `${metric.runId} | ${metric.role} | ${metric.result} | ${metric.elapsedMs}\n`
  const digest = createHash('sha256').update(line).digest('hex')
  writeFileSync(METRICS_FILE, `${line}${digest}\n`, { flag: 'a' })
  return digest
}