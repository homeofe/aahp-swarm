import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export const DEFAULT_ROLE_PATHS = [
  'roles',
  '.claude/agents',
  '.llm/agents',
]

export function resolveRoleFile(repoRoot: string, roleName: string): string {
  const candidates = DEFAULT_ROLE_PATHS.map((base) => join(repoRoot, base, `${roleName}.md`))

  for (const file of candidates) {
    if (existsSync(file)) return file
  }

  throw new Error(`Role definition not found for ${roleName}. Checked: ${candidates.join(', ')}`)
}

export function loadRoleTemplate(repoRoot: string, roleName: string): string {
  const path = resolveRoleFile(repoRoot, roleName)
  return readFileSync(path, 'utf8')
}
