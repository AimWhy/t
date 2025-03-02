export function sleep(delay = 0) {
  return new Promise((resolve) => {
    setTimeout(resolve, delay);
  });
}

export async function retry(tryFunction, options = {}) {
  const { retries = 3 } = options;

  let tries = 0;
  let output = null;
  let exitErr = null;

  const bail = (err) => {
    exitErr = err;
  };

  while (tries < retries) {
    tries += 1;
    try {
      output = await tryFunction({ tries, bail });
      break;
    } catch (err) {
      if (tries >= retries) {
        throw err;
      }
    }
  }

  if (exitErr) {
    throw exitErr;
  }

  return output;
}

export async function waitUntil(test, options = {}) {
  const { delay = 5e3, tries = -1 } = options;
  const { predicate, result } = await test();

  if (predicate) {
    return result;
  }

  if (tries - 1 === 0) {
    throw new Error('tries limit reached');
  }

  await sleep(delay);

  return waitUntil(test, { ...options, tries: tries > 0 ? tries - 1 : tries });
}

export class Queue {
  pendingEntries = [];

  inFlight = 0;

  err = null;

  constructor(worker, options = {}) {
    this.worker = worker;
    this.concurrency = options.concurrency || 1;
  }

  push = (entries) => {
    this.pendingEntries = this.pendingEntries.concat(entries);
    this.process();
  };

  process = () => {
    const scheduled = this.pendingEntries.splice(0, this.concurrency - this.inFlight);
    this.inFlight += scheduled.length;
    scheduled.forEach(async (task) => {
      try {
        await this.worker(task);
      } catch (err) {
        this.err = err;
      } finally {
        this.inFlight -= 1;
      }

      if (this.pendingEntries.length > 0) {
        this.process();
      }
    });
  };

  wait = (options = {}) =>
    waitUntil(
      () => {
        if (this.err) {
          this.pendingEntries = [];
          throw this.err;
        }

        return {
          predicate: options.empty
            ? this.inFlight === 0 && this.pendingEntries.length === 0
            : this.concurrency > this.pendingEntries.length,
        };
      },
      {
        delay: 50,
      },
    );
}

export default Queue;
