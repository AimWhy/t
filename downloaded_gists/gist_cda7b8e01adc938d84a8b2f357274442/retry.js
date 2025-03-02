function delay(ms, msg, isOk = true) {
  return new Promise((res, rej) => {
    setTimeout(isOk ? res : rej, ms, msg);
  });
}
export async function retry(options = {}, funcToRetry) {
  const { retryCount = 4, delayInterval = 200 } = options;
  const getInterval =
    typeof delayInterval === "function" ? delayInterval : () => delayInterval;

  const makeAttempt = async (i = 0) => {
    try {
      return await funcToRetry();
    } catch (err) {
      if (i >= retryCount) {
        throw new Error(`Failed retrying after ${i}: ${err.message}`);
      }

      const interval = await getInterval(i);
      await delay(interval);
      return makeAttempt(i + 1);
    }
  };

  return makeAttempt();
}
