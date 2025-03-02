let previousTimestamp;
const methods = {
  Date,
  beginTiming() {
    previousTimestamp = getTimestamp();
  },
  clearInterval: clearInterval,
  clearTimeout: clearTimeout,
  endTiming() {
    return getTimestamp() - previousTimestamp;
  },
  setInterval: setInterval,
  setTimeout: setTimeout,
  performance: performance,
};

function getTimestamp() {
  return methods.performance.now();
}

export async function wrapPromiseWithTimeout(promise, timeoutInMilliseconds, timeoutMessage = '') {
  let timeoutId;
  if (timeoutMessage === '') {
    timeoutMessage = `Action did not complete within ${timeoutInMilliseconds} milliseconds`;
  }
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = methods.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutInMilliseconds);
  });

  return await Promise.race([promise, timeoutPromise]).finally(() => methods.clearTimeout(timeoutId));
}

export default methods;