export function waitUntil(callback, opts = {}) {
  const { rate = 10, timeout = 10000 } = opts;

  return new Promise((resolve, reject) => {
    let intervalId;
    let timeoutId;

    const cleanup = () => {
      if (intervalId) clearInterval(intervalId);
      if (timeoutId) clearTimeout(timeoutId);
    };

    const check = () => {
      let result;
      try {
        result = callback();
      } catch (e) {
        cleanup();
        reject(e);
        return;
      }

      if (result === true) {
        cleanup();
        resolve();
        return true;
      }
    };

    if (check()) {
      return;
    }

    intervalId = setInterval(check, rate);
    timeoutId = setTimeout(() => {
      timeoutId = undefined;
      cleanup();
      reject(new Error(`waitUntil timed out after ${timeout}ms`));
    }, timeout);
  });
}
