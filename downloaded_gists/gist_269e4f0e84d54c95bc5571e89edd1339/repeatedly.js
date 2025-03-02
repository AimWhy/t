export async function repeatedly(fn, opts = {}) {
  const { until = (x) => !!x, timeLimit = 10000 } = opts;
  const begin = Date.now();

  while (true) {
    const ret = await fn();
    if (until(ret)) {
      return ret;
    }

    if (Date.now() - begin > timeLimit) {
      throw new Error(`repeatedly timed out (limit=${timeLimit})`);
    }
  }
}