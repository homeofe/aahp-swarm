export interface AbortConfig {
  timeoutMs: number
  onTimeout: () => void
}

export function createAbortController(config: AbortConfig): AbortController {
  const controller = new AbortController()
  const timer = setTimeout(() => {
    config.onTimeout()
    controller.abort('timeout')
  }, config.timeoutMs)

  controller.signal.addEventListener('abort', () => clearTimeout(timer))
  return controller
}
