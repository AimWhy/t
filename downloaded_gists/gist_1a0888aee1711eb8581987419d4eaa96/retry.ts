
// Returns a rejected Promise rejected after a timeout.
export async function timeout(ms: number, signal?: AbortSignal): Promise<void> {
  let id
  const done = new Promise<void>((resolve, reject) => {
    id = self.setTimeout(() => reject(new Error('timeout')), ms)
  })
  if (!signal) {
    return done
  } 
  try {
    await Promise.race([done, whenAborted(signal)])
  } catch (e) {
    self.clearTimeout(id)
    throw e
  }
}

// Returns a Promise fulfilled after a timeout.
export async function wait(ms: number, signal?: AbortSignal): Promise<void> {
  let id
  const done = new Promise<void>(resolve => {
    id = self.setTimeout(resolve, ms)
  })
  if (!signal) return done
  try {
    await Promise.race([done, whenAborted(signal)])
  } catch (e) {
    self.clearTimeout(id)
    throw e
  }
}

// Returns a promise fulfilled by the function or rejected after attempts expire.
export async function retry<T>(
  fn: () => Promise<T>,
  attempts: number,
  maxDelay = Infinity,
  signal?: AbortSignal
): Promise<T> {
  const aborted = signal ? whenAborted(signal) : null
  for (let i = 0; i < attempts; i++) {
    try {
      const op = aborted ? Promise.race([fn(), aborted]) : fn()
      return await op
    } catch (e) {
      if (e.name === 'AbortError') throw e
      if (i === attempts - 1) throw e
      const ms = Math.pow(2, i) * 1000
      const vary = rand(ms * 0.1)
      await wait(Math.min(maxDelay, ms + vary), signal)
    }
  }
  throw new Error('retry failed')
}

function whenAborted(signal: AbortSignal): Promise<never> {
  return new Promise((resolve, reject) => {
    const error = new Error('aborted')
    error.name = 'AbortError'
    if (signal.aborted) {
      reject(error)
    } else {
      signal.addEventListener('abort', () => reject(error))
    }
  })
}

function rand(max: number): number {
  return Math.floor(Math.random() * Math.floor(max))
}