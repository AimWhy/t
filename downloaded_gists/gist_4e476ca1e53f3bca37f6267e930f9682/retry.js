const DEFAULT_INITIAL_SLEEP = 0;
const DEFAULT_RETRIES = 9;
const DEFAULT_INTERVAL = 500;
const DEFAULT_CONDITION_FN = () => true;
const DEFAULT_BACK_OFF_MODE = 'linear';
const backOffModes = {
  linear: ({ interval, totalTries }) => totalTries * interval,
  none: ({ interval }) => interval,
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const registBackOff = (k, v) => {
  backOffModes[k] = v;
};

export async function retry(optionsOrFunc, func) {
  let options = optionsOrFunc;
  if (typeof optionsOrFunc === 'function') {
    func = optionsOrFunc;
    options = {};
  }

  const {
    retries = DEFAULT_RETRIES,
    interval = DEFAULT_INTERVAL,
    backOff = DEFAULT_BACK_OFF_MODE,
    conditionFn = DEFAULT_CONDITION_FN,
    initialSleep = DEFAULT_INITIAL_SLEEP,
  } = options;
  const backOffFn = backOffModes[backOff];

  if (initialSleep) {
    await sleep(initialSleep);
  }

  for (let totalTries = 1, lastError = null; ; totalTries++) {
    try {
      return await func(totalTries, lastError);
    } catch (e) {
      lastError = e;
      if (!conditionFn(e) || totalTries > retries) {
        throw e;
      }
      await sleep(backOffFn({ interval, totalTries }));
    }
  }
}
