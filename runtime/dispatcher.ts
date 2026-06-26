export type SwarmMode = 'review' | 'dev' | 'release' | 'incident'

export interface SwarmRunInput {
  runId: string
  repoPath: string
  mode: SwarmMode
  roles: string[]
}

export interface SwarmRunOutput {
  runId: string
  repoPath: string
  mode: SwarmMode
  startedAt: string
  rolesExecuted: string[]
  completedAt?: string
}

export function createRun(input: SwarmRunInput): SwarmRunOutput {
  return {
    runId: input.runId,
    repoPath: input.repoPath,
    mode: input.mode,
    startedAt: new Date().toISOString(),
    rolesExecuted: [],
  }
}
